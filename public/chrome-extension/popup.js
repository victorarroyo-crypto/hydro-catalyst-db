// Vandarum Chrome Extension - Popup Script
const WEBHOOK_URL = 'https://bdmpshiqspkxcisnnlyr.supabase.co/functions/v1/chrome-extension-webhook';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('techForm');
  const statusDiv = document.getElementById('status');
  const submitBtn = document.getElementById('submitBtn');
  const urlInput = document.getElementById('url');

  // Try to get current tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.url && !tabs[0].url.startsWith('chrome://')) {
      // Auto-fill URL field with current page
      if (!urlInput.value) {
        urlInput.value = tabs[0].url;
      }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const technology_name = document.getElementById('technology_name').value.trim();
    const provider = document.getElementById('provider').value.trim();
    const url = document.getElementById('url').value.trim();
    const description = document.getElementById('description').value.trim();
    const country = document.getElementById('country').value.trim();

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
        // Clear form
        form.reset();
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
});
