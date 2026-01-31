/**
 * Utility to render Mermaid diagrams to PNG images for Word document embedding
 */

import mermaid from 'mermaid';

// Initialize mermaid for server-side rendering
let initialized = false;

function initMermaid() {
  if (initialized) return;
  
  mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral', // Use neutral theme for print
    securityLevel: 'loose',
    fontFamily: 'Arial, sans-serif',
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
    },
    suppressErrorRendering: true,
  });
  initialized = true;
}

/**
 * Extract Mermaid code blocks from markdown content
 */
export function extractMermaidBlocks(content: string): { code: string; startIndex: number; endIndex: number }[] {
  const blocks: { code: string; startIndex: number; endIndex: number }[] = [];
  
  // Match ```mermaid ... ``` blocks
  const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/gi;
  let match;
  
  while ((match = mermaidRegex.exec(content)) !== null) {
    blocks.push({
      code: match[1].trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  
  // Also detect inline flowchart/graph definitions
  const lines = content.split('\n');
  let inMermaid = false;
  let mermaidStart = 0;
  let mermaidCode = '';
  let currentIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = currentIndex;
    currentIndex += line.length + 1; // +1 for newline
    
    if (!inMermaid && /^(flowchart|graph)\s+(TD|LR|TB|BT|RL)/i.test(line.trim())) {
      inMermaid = true;
      mermaidStart = lineStart;
      mermaidCode = line;
      continue;
    }
    
    if (inMermaid) {
      // Check if line continues the mermaid diagram
      const trimmed = line.trim();
      if (
        trimmed === '' ||
        trimmed.includes('-->') ||
        trimmed.includes('---') ||
        /^[A-Za-z0-9_]+[\[\{(]/.test(trimmed) ||
        /^(subgraph|end)\b/i.test(trimmed)
      ) {
        mermaidCode += '\n' + line;
      } else {
        // End of mermaid block
        if (mermaidCode.trim()) {
          // Check if this block isn't already captured as a fenced block
          const isDuplicate = blocks.some(
            b => b.code.trim() === mermaidCode.trim()
          );
          if (!isDuplicate) {
            blocks.push({
              code: mermaidCode.trim(),
              startIndex: mermaidStart,
              endIndex: lineStart,
            });
          }
        }
        inMermaid = false;
        mermaidCode = '';
      }
    }
  }
  
  // Handle case where mermaid block goes to end of content
  if (inMermaid && mermaidCode.trim()) {
    const isDuplicate = blocks.some(
      b => b.code.trim() === mermaidCode.trim()
    );
    if (!isDuplicate) {
      blocks.push({
        code: mermaidCode.trim(),
        startIndex: mermaidStart,
        endIndex: currentIndex,
      });
    }
  }
  
  return blocks;
}

/**
 * Render a Mermaid diagram to a PNG ArrayBuffer
 */
export async function renderMermaidToPng(
  mermaidCode: string,
  options: { width?: number; scale?: number } = {}
): Promise<ArrayBuffer | null> {
  const { scale = 2 } = options; // 2x scale for high resolution
  
  try {
    initMermaid();
    
    // Clean content
    let cleanCode = mermaidCode.trim();
    if (cleanCode.startsWith('```')) {
      cleanCode = cleanCode.replace(/^```\w*\n?/, '').replace(/```$/, '').trim();
    }
    
    // Generate unique ID
    const id = `mermaid-export-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    // Render to SVG
    const { svg } = await mermaid.render(id, cleanCode);
    
    // Create an off-screen container to measure the SVG
    const container = document.createElement('div');
    container.innerHTML = svg;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);
    
    const svgElement = container.querySelector('svg');
    if (!svgElement) {
      document.body.removeChild(container);
      return null;
    }
    
    // Get the actual dimensions
    const bbox = svgElement.getBBox();
    const svgWidth = Math.ceil(bbox.width + 20); // Add padding
    const svgHeight = Math.ceil(bbox.height + 20);
    
    // Set viewBox and dimensions for proper rendering
    svgElement.setAttribute('width', String(svgWidth));
    svgElement.setAttribute('height', String(svgHeight));
    
    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
    const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;
    
    // Create canvas and draw the SVG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      document.body.removeChild(container);
      return null;
    }
    
    canvas.width = svgWidth * scale;
    canvas.height = svgHeight * scale;
    
    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Load and draw the SVG
    const img = new Image();
    
    const pngArrayBuffer = await new Promise<ArrayBuffer | null>((resolve) => {
      img.onload = () => {
        ctx.scale(scale, scale);
        ctx.drawImage(img, 10, 10); // Add 10px padding
        
        canvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then(resolve);
          } else {
            resolve(null);
          }
        }, 'image/png');
      };
      
      img.onerror = () => {
        console.warn('Failed to load SVG for PNG conversion');
        resolve(null);
      };
      
      img.src = svgDataUrl;
    });
    
    document.body.removeChild(container);
    return pngArrayBuffer;
    
  } catch (error) {
    console.warn('Mermaid to PNG conversion failed:', error);
    return null;
  }
}

/**
 * Render all Mermaid diagrams in content to PNG images
 */
export async function renderAllMermaidDiagrams(
  content: string
): Promise<Map<string, ArrayBuffer>> {
  const diagrams = new Map<string, ArrayBuffer>();
  const blocks = extractMermaidBlocks(content);
  
  for (const block of blocks) {
    const png = await renderMermaidToPng(block.code);
    if (png) {
      // Use the code as key (trimmed and normalized)
      diagrams.set(block.code.trim(), png);
    }
  }
  
  return diagrams;
}
