// Vandarum Chrome Extension - Popup Script with AI
const WEBHOOK_URL = 'https://bdmpshiqspkxcisnnlyr.supabase.co/functions/v1/chrome-extension-webhook';
const AI_EXTRACT_URL = 'https://bdmpshiqspkxcisnnlyr.supabase.co/functions/v1/chrome-extension-ai-extract';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('techForm');
  const statusDiv = document.getElementById('status');
  const submitBtn = document.getElementById('submitBtn');
  const urlInput = document.getElementById('url');
  const aiScanBtn = document.getElementById('aiScanBtn');
  
  // Form field references
  const technologyNameInput = document.getElementById('technology_name');
  const providerInput = document.getElementById('provider');
  const descriptionInput = document.getElementById('description');
  const countryInput = document.getElementById('country');

  // Try to get current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.url && !tabs[0].url.startsWith('chrome://')) {
      // Auto-fill URL field with current page
      if (!urlInput.value) {
        urlInput.value = tabs[0].url;
      }
    }
  });

  // AI Scan button handler
  aiScanBtn.addEventListener('click', async () => {
    aiScanBtn.disabled = true;
    aiScanBtn.innerHTML = '<div class="spinner"></div><span class="btn-text">Analizando...</span>';
    showStatus('🤖 Extrayendo información de la página con IA...', 'loading');

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab?.id || tab.url.startsWith('chrome://')) {
        showStatus('❌ No se puede analizar esta página', 'error');
        return;
      }

      // Inject content script to extract page content
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPageContent
      });

      const pageData = results[0]?.result;
      
      if (!pageData || !pageData.content || pageData.content.length < 50) {
        showStatus('❌ No hay suficiente contenido en la página para analizar', 'error');
        return;
      }

      // Send to AI for analysis
      const response = await fetch(AI_EXTRACT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageContent: pageData.content,
          pageUrl: tab.url,
          pageTitle: tab.title || ''
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.data) {
        const extracted = data.data;
        
        if (!extracted.is_technology_page && !extracted.technology_name) {
          showStatus('⚠️ No se detectó tecnología específica en esta página', 'ai-info');
          return;
        }

        // Fill form with extracted data
        let fieldsUpdated = 0;
        
        if (extracted.technology_name) {
          technologyNameInput.value = extracted.technology_name;
          technologyNameInput.classList.add('ai-filled');
          fieldsUpdated++;
        }
        
        if (extracted.provider) {
          providerInput.value = extracted.provider;
          providerInput.classList.add('ai-filled');
          fieldsUpdated++;
        }
        
        if (extracted.description) {
          descriptionInput.value = extracted.description;
          descriptionInput.classList.add('ai-filled');
          fieldsUpdated++;
        }
        
        if (extracted.country) {
          countryInput.value = extracted.country;
          countryInput.classList.add('ai-filled');
          fieldsUpdated++;
        }

        if (fieldsUpdated > 0) {
          showStatus(`✨ IA completó ${fieldsUpdated} campo(s). Revisa y ajusta si es necesario.`, 'ai-info');
        } else {
          showStatus('⚠️ No se pudo extraer información específica', 'ai-info');
        }
      } else {
        showStatus(`❌ ${data.error || 'Error al analizar la página'}`, 'error');
      }
    } catch (error) {
      console.error('AI scan error:', error);
      showStatus('❌ Error al escanear. Verifica los permisos de la extensión.', 'error');
    } finally {
      aiScanBtn.disabled = false;
      aiScanBtn.innerHTML = '<span class="btn-text">✨ Escanear con IA</span>';
    }
  });

  // Form submit handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const technology_name = technologyNameInput.value.trim();
    const provider = providerInput.value.trim();
    const url = urlInput.value.trim();
    const description = descriptionInput.value.trim();
    const country = countryInput.value.trim();

    if (!technology_name) {
      showStatus('El nombre de la tecnología es requerido', 'error');
      return;
    }

    // Get current page URL for reference
    let captured_from_url = '';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      captured_from_url = tab?.url || '';
    } catch (err) {
      console.log('Could not get current tab URL');
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Enviando...';
    showStatus('Enviando tecnología a Vandarum...', 'loading');

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          technology_name,
          provider,
          url,
          description,
          country,
          captured_from_url
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showStatus('✅ Tecnología guardada para revisión', 'success');
        // Clear form and AI styling
        form.reset();
        clearAIStyles();
        // Re-populate URL after reset
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.url && !tabs[0].url.startsWith('chrome://')) {
            urlInput.value = tabs[0].url;
          }
        });
      } else if (data.duplicate) {
        showStatus('⚠️ Esta tecnología ya existe en la cola', 'error');
      } else {
        showStatus(`❌ Error: ${data.error || 'Error desconocido'}`, 'error');
      }
    } catch (error) {
      console.error('Error sending technology:', error);
      showStatus('❌ Error de conexión. Verifica tu internet.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '📤 Enviar a Vandarum';
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
  }

  function clearAIStyles() {
    document.querySelectorAll('.ai-filled').forEach(el => {
      el.classList.remove('ai-filled');
    });
  }
});

// Function to extract page content (injected into the page)
function extractPageContent() {
  // Get main text content, prioritizing article/main elements
  const selectors = [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '.main-content',
    '#content',
    '#main'
  ];

  let mainElement = null;
  for (const selector of selectors) {
    mainElement = document.querySelector(selector);
    if (mainElement) break;
  }

  // Fallback to body if no main content area found
  const targetElement = mainElement || document.body;

  // Remove script, style, nav, footer, aside elements for cleaner content
  const clone = targetElement.cloneNode(true);
  const removeSelectors = ['script', 'style', 'nav', 'footer', 'aside', 'header', 'noscript', 'iframe', '.advertisement', '.ads', '[aria-hidden="true"]'];
  removeSelectors.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  // Get clean text content
  let content = clone.textContent || '';
  
  // Clean up whitespace
  content = content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  // Also get meta description if available
  const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
  
  // Prepend meta description if available
  if (metaDesc) {
    content = `[Meta descripción]: ${metaDesc}\n\n${content}`;
  }

  return {
    content: content,
    title: document.title
  };
}
