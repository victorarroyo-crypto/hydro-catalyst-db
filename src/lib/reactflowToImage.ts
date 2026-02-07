/**
 * Utility to render ReactFlow diagrams to PNG images for Word document embedding
 */

import { toPng } from 'html-to-image';

export interface ReactFlowData {
  title?: string;
  direction?: 'LR' | 'TD';
  nodes: Array<{
    id: string;
    type?: string;
    // Support both formats: direct label or nested in data
    label?: string;
    data?: { label: string };
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    animated?: boolean;
  }>;
}

/**
 * Safely encode string to base64, handling Unicode characters.
 * Standard btoa() fails on non-ASCII characters (tildes, ñ, etc.)
 */
function safeBase64Encode(str: string): string {
  try {
    // First encode to UTF-8, then to base64
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      (_, p1) => String.fromCharCode(parseInt(p1, 16))
    ));
  } catch (e) {
    // Fallback: generate a unique hash from the string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `rf_${Math.abs(hash).toString(36)}_${str.length}`;
  }
}

/**
 * Find the end of a JSON object by balancing braces.
 */
function findJsonEnd(text: string, startIndex: number): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  
  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escape = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  
  return -1;
}

/**
 * Validates if parsed JSON is a valid ReactFlow structure.
 */
function isValidReactFlowStructure(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  const obj = parsed as Record<string, unknown>;
  
  if (!Array.isArray(obj.nodes)) return false;
  if (!Array.isArray(obj.edges)) return false;
  
  return true;
}

/**
 * Extract ReactFlow diagram blocks from content
 * Detects:
 * - <div data-reactflow-diagram="BASE64">
 * - ```reactflow fenced code blocks
 * - ```json/``` fences with ReactFlow structure
 * - Raw JSON with nodes/edges structure
 */
export function extractReactFlowBlocks(content: string): { 
  data: ReactFlowData; 
  startIndex: number; 
  endIndex: number;
  base64: string;
}[] {
  const blocks: { data: ReactFlowData; startIndex: number; endIndex: number; base64: string }[] = [];
  const processedRanges: Array<{start: number; end: number}> = [];
  
  // Helper to check if a range overlaps with already processed ranges
  const isOverlapping = (start: number, end: number) => 
    processedRanges.some(r => !(end < r.start || start > r.end));
  
  // Pattern 1: Match <div data-reactflow-diagram="..."></div> or self-closing
  const divRegex = /<div\s+data-reactflow-diagram="([^"]+)"[^>]*>(?:<\/div>)?/gi;
  let match;
  
  while ((match = divRegex.exec(content)) !== null) {
    try {
      const base64 = match[1];
      const json = atob(base64);
      const data = JSON.parse(json) as ReactFlowData;
      
      if (data && Array.isArray(data.nodes) && Array.isArray(data.edges)) {
        blocks.push({
          data,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          base64,
        });
        processedRanges.push({ start: match.index, end: match.index + match[0].length });
      }
    } catch (e) {
      console.warn('Failed to parse ReactFlow diagram from div:', e);
    }
  }
  
  // Pattern 2: ```reactflow fenced code blocks
  const reactflowFenceRegex = /```reactflow\s*\n([\s\S]*?)\n```/gi;
  while ((match = reactflowFenceRegex.exec(content)) !== null) {
    if (isOverlapping(match.index, match.index + match[0].length)) continue;
    
    const jsonContent = match[1].trim();
    try {
      const data = JSON.parse(jsonContent) as ReactFlowData;
      
      if (isValidReactFlowStructure(data)) {
        const base64 = safeBase64Encode(jsonContent);
        blocks.push({
          data,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          base64,
        });
        processedRanges.push({ start: match.index, end: match.index + match[0].length });
      }
    } catch (e) {
      console.warn('Failed to parse ReactFlow from ```reactflow fence:', e, 'Content preview:', jsonContent?.substring(0, 100));
    }
  }
  
  // Pattern 3: Generic fences (```json, ```, ```javascript) containing ReactFlow JSON
  const genericFenceRegex = /```([a-zA-Z0-9_-]*)\s*\n([\s\S]*?)\n```/gi;
  while ((match = genericFenceRegex.exec(content)) !== null) {
    const lang = match[1]?.toLowerCase();
    if (lang === 'reactflow') continue; // Already processed
    if (isOverlapping(match.index, match.index + match[0].length)) continue;
    
    const jsonContent = match[2].trim();
    if (!jsonContent.includes('"nodes"') || !jsonContent.includes('"edges"')) continue;
    
    try {
      const data = JSON.parse(jsonContent) as ReactFlowData;
      
      if (isValidReactFlowStructure(data)) {
        const base64 = safeBase64Encode(jsonContent);
        blocks.push({
          data,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          base64,
        });
        processedRanges.push({ start: match.index, end: match.index + match[0].length });
      }
    } catch (e) {
      // Not valid JSON
    }
  }
  
  // Pattern 4: Raw JSON with nodes and edges (not inside fences)
  const jsonStartPattern = /\{/g;
  let jsonMatch;
  
  while ((jsonMatch = jsonStartPattern.exec(content)) !== null) {
    const jsonStart = jsonMatch.index;
    
    if (isOverlapping(jsonStart, jsonStart + 1)) continue;
    
    const endIdx = findJsonEnd(content, jsonStart);
    if (endIdx === -1) continue;
    
    const jsonText = content.substring(jsonStart, endIdx + 1);
    
    // Quick checks
    if (jsonText.length < 50) continue;
    if (!jsonText.includes('"nodes"') || !jsonText.includes('"edges"')) continue;
    
    try {
      const data = JSON.parse(jsonText) as ReactFlowData;
      
      if (isValidReactFlowStructure(data)) {
        const base64 = safeBase64Encode(jsonText);
        blocks.push({
          data,
          startIndex: jsonStart,
          endIndex: endIdx + 1,
          base64,
        });
        processedRanges.push({ start: jsonStart, end: endIdx + 1 });
        jsonStartPattern.lastIndex = endIdx + 1;
      }
    } catch (e) {
      // Not valid JSON
    }
  }
  
  console.log(`[reactflowToImage] extractReactFlowBlocks found ${blocks.length} diagram(s)`);
  return blocks;
}

/**
 * Extract label from node, supporting both formats
 */
function getNodeLabel(node: ReactFlowData['nodes'][0]): string {
  // Format 1: Direct label (from backend)
  if (typeof node.label === 'string') {
    return node.label;
  }
  // Format 2: Nested in data (ReactFlow native format)
  if (node.data && typeof node.data.label === 'string') {
    return node.data.label;
  }
  // Fallback: use node id
  return node.id;
}

/**
 * Create an optimized SVG representation of a ReactFlow diagram
 * Professional styling for Word document export
 */
function createReactFlowSvg(data: ReactFlowData): string {
  const nodes = data.nodes;
  const edges = data.edges;
  
  // Optimized dimensions for better Word presentation
  const nodeWidth = 180;
  const nodeHeight = 56;
  const horizontalGap = 100;
  const verticalGap = 50;
  const padding = 40;
  const titleHeight = data.title ? 50 : 0;
  
  // Word-friendly max width (A4 landscape ~700px effective)
  const maxWordWidth = 680;
  
  // Build adjacency list for layout
  const nodeMap = new Map<string, { label: string; x: number; y: number; type?: string }>();
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  
  nodes.forEach(node => {
    nodeMap.set(node.id, { 
      label: getNodeLabel(node), 
      x: node.position?.x ?? 0, 
      y: node.position?.y ?? 0,
      type: node.type,
    });
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  });
  
  edges.forEach(edge => {
    outgoing.get(edge.source)?.push(edge.target);
    incoming.get(edge.target)?.push(edge.source);
  });
  
  // Find root nodes (no incoming edges)
  const roots = nodes.filter(n => (incoming.get(n.id)?.length ?? 0) === 0);
  
  // Simple BFS to determine levels
  const visited = new Set<string>();
  const levels: string[][] = [];
  let currentLevel = roots.map(n => n.id);
  
  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    currentLevel.forEach(id => visited.add(id));
    
    const nextLevel: string[] = [];
    currentLevel.forEach(id => {
      outgoing.get(id)?.forEach(targetId => {
        if (!visited.has(targetId) && !nextLevel.includes(targetId)) {
          nextLevel.push(targetId);
        }
      });
    });
    currentLevel = nextLevel;
  }
  
  // Add any unvisited nodes
  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      levels.push([n.id]);
    }
  });
  
  // Calculate if horizontal layout would be too wide
  const horizontalWidth = levels.length * (nodeWidth + horizontalGap) - horizontalGap + padding * 2;
  const useVerticalLayout = horizontalWidth > maxWordWidth || levels.length > 4;
  
  // Determine layout direction based on explicit direction or auto-detect
  const isVertical = data.direction === 'TD' || useVerticalLayout;
  
  const positions = new Map<string, { x: number; y: number }>();
  
  if (isVertical) {
    // Top-down layout for Word-friendly presentation
    const maxNodesInLevel = Math.max(...levels.map(l => l.length));
    const totalWidth = maxNodesInLevel * (nodeWidth + horizontalGap / 2) - horizontalGap / 2;
    
    levels.forEach((level, levelIndex) => {
      const levelWidth = level.length * (nodeWidth + horizontalGap / 2) - horizontalGap / 2;
      const startX = (totalWidth - levelWidth) / 2;
      
      level.forEach((nodeId, nodeIndex) => {
        positions.set(nodeId, {
          x: startX + nodeIndex * (nodeWidth + horizontalGap / 2) + padding,
          y: levelIndex * (nodeHeight + verticalGap) + padding + titleHeight,
        });
      });
    });
  } else {
    // Left-to-right layout (original)
    const maxNodesInLevel = Math.max(...levels.map(l => l.length));
    const totalHeight = maxNodesInLevel * (nodeHeight + verticalGap) - verticalGap;
    
    levels.forEach((level, levelIndex) => {
      const levelHeight = level.length * (nodeHeight + verticalGap) - verticalGap;
      const startY = (totalHeight - levelHeight) / 2;
      
      level.forEach((nodeId, nodeIndex) => {
        positions.set(nodeId, {
          x: levelIndex * (nodeWidth + horizontalGap) + padding,
          y: startY + nodeIndex * (nodeHeight + verticalGap) + padding + titleHeight,
        });
      });
    });
  }
  
  // Calculate SVG dimensions
  const maxX = Math.max(...Array.from(positions.values()).map(p => p.x)) + nodeWidth + padding;
  const maxY = Math.max(...Array.from(positions.values()).map(p => p.y)) + nodeHeight + padding;
  
  // Color mapping based on node type - Vandarum brand colors
  const getNodeColors = (type?: string): { fill: string; stroke: string; gradient: string } => {
    switch (type) {
      case 'input': 
        return { fill: '#307177', stroke: '#245a5f', gradient: 'inputGrad' };
      case 'output': 
        return { fill: '#2D8A4E', stroke: '#236b3d', gradient: 'outputGrad' };
      case 'storage': 
        return { fill: '#5B7FA3', stroke: '#486585', gradient: 'storageGrad' };
      case 'chemical': 
        return { fill: '#C97A2B', stroke: '#a56322', gradient: 'chemicalGrad' };
      case 'split':
      case 'merge': 
        return { fill: '#8B5CF6', stroke: '#7048d9', gradient: 'splitGrad' };
      default: 
        return { fill: '#4B5563', stroke: '#374151', gradient: 'defaultGrad' };
    }
  };
  
  // Build SVG with professional styling
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}">`;
  
  // Definitions: gradients, shadows, arrows
  svg += `<defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-opacity="0.15"/>
    </filter>
    <marker id="arrowhead" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
      <path d="M0,0 L12,4 L0,8 L3,4 Z" fill="#64748B"/>
    </marker>
    <linearGradient id="inputGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#3d8a91"/>
      <stop offset="100%" style="stop-color:#307177"/>
    </linearGradient>
    <linearGradient id="outputGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#38a05e"/>
      <stop offset="100%" style="stop-color:#2D8A4E"/>
    </linearGradient>
    <linearGradient id="storageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#6e93b8"/>
      <stop offset="100%" style="stop-color:#5B7FA3"/>
    </linearGradient>
    <linearGradient id="chemicalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#d98f3f"/>
      <stop offset="100%" style="stop-color:#C97A2B"/>
    </linearGradient>
    <linearGradient id="splitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#a07ef8"/>
      <stop offset="100%" style="stop-color:#8B5CF6"/>
    </linearGradient>
    <linearGradient id="defaultGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#6B7280"/>
      <stop offset="100%" style="stop-color:#4B5563"/>
    </linearGradient>
  </defs>`;
  
  // Background with subtle gradient
  svg += `<rect width="100%" height="100%" fill="#FAFBFC"/>`;
  
  // Title if present - styled header
  if (data.title) {
    svg += `<rect x="0" y="0" width="${maxX}" height="${titleHeight}" fill="#307177"/>`;
    svg += `<text x="${maxX / 2}" y="${titleHeight / 2 + 6}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="white" font-weight="600">${escapeXml(data.title)}</text>`;
  }
  
  // Draw edges with bezier curves (adaptive to layout direction)
  edges.forEach(edge => {
    const sourcePos = positions.get(edge.source);
    const targetPos = positions.get(edge.target);
    if (sourcePos && targetPos) {
      let x1: number, y1: number, x2: number, y2: number;
      let pathD: string;
      
      if (isVertical) {
        // Vertical layout: connect bottom of source to top of target
        x1 = sourcePos.x + nodeWidth / 2;
        y1 = sourcePos.y + nodeHeight;
        x2 = targetPos.x + nodeWidth / 2;
        y2 = targetPos.y;
        
        const dy = y2 - y1;
        const controlOffset = Math.min(dy * 0.4, 40);
        pathD = `M${x1},${y1} C${x1},${y1 + controlOffset} ${x2},${y2 - controlOffset} ${x2},${y2}`;
      } else {
        // Horizontal layout: connect right of source to left of target
        x1 = sourcePos.x + nodeWidth;
        y1 = sourcePos.y + nodeHeight / 2;
        x2 = targetPos.x;
        y2 = targetPos.y + nodeHeight / 2;
        
        const dx = x2 - x1;
        const controlOffset = Math.min(dx * 0.4, 60);
        pathD = `M${x1},${y1} C${x1 + controlOffset},${y1} ${x2 - controlOffset},${y2} ${x2},${y2}`;
      }
      
      svg += `<path d="${pathD}" fill="none" stroke="#94A3B8" stroke-width="2" marker-end="url(#arrowhead)"/>`;
      
      // Edge label with background
      if (edge.label) {
        const labelX = (x1 + x2) / 2;
        const labelY = (y1 + y2) / 2;
        const labelWidth = edge.label.length * 6 + 12;
        svg += `<rect x="${labelX - labelWidth/2}" y="${labelY - 10}" width="${labelWidth}" height="18" rx="9" fill="white" stroke="#E2E8F0"/>`;
        svg += `<text x="${labelX}" y="${labelY + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#64748B">${escapeXml(edge.label)}</text>`;
      }
    }
  });
  
  // Draw nodes with shadows and gradients
  nodes.forEach(node => {
    const pos = positions.get(node.id);
    if (pos) {
      const nodeData = nodeMap.get(node.id);
      const colors = getNodeColors(nodeData?.type);
      const radius = 8;
      
      // Node with shadow and gradient
      svg += `<rect x="${pos.x}" y="${pos.y}" width="${nodeWidth}" height="${nodeHeight}" 
        rx="${radius}" fill="url(#${colors.gradient})" stroke="${colors.stroke}" stroke-width="1.5" filter="url(#shadow)"/>`;
      
      // Node label with word wrap for long labels
      const nodeLabel = getNodeLabel(node);
      const maxChars = 22;
      
      if (nodeLabel.length > maxChars) {
        // Two-line label
        const mid = Math.ceil(nodeLabel.length / 2);
        const breakPoint = nodeLabel.lastIndexOf(' ', mid) > 0 ? nodeLabel.lastIndexOf(' ', mid) : mid;
        const line1 = nodeLabel.substring(0, breakPoint).trim();
        const line2 = nodeLabel.substring(breakPoint).trim();
        
        const displayLine1 = line1.length > maxChars ? line1.substring(0, maxChars - 2) + '...' : line1;
        const displayLine2 = line2.length > maxChars ? line2.substring(0, maxChars - 2) + '...' : line2;
        
        svg += `<text x="${pos.x + nodeWidth / 2}" y="${pos.y + nodeHeight / 2 - 6}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="white" font-weight="500">${escapeXml(displayLine1)}</text>`;
        svg += `<text x="${pos.x + nodeWidth / 2}" y="${pos.y + nodeHeight / 2 + 10}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="white" font-weight="500">${escapeXml(displayLine2)}</text>`;
      } else {
        svg += `<text x="${pos.x + nodeWidth / 2}" y="${pos.y + nodeHeight / 2 + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="white" font-weight="500">${escapeXml(nodeLabel)}</text>`;
      }
    }
  });
  
  svg += '</svg>';
  return svg;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Render a ReactFlow diagram to a PNG ArrayBuffer
 */
export async function renderReactFlowToPng(
  data: ReactFlowData,
  options: { scale?: number } = {}
): Promise<ArrayBuffer | null> {
  const { scale = 2 } = options;
  
  try {
    // Create SVG representation
    const svgString = createReactFlowSvg(data);
    
    // Create a container element
    const container = document.createElement('div');
    container.innerHTML = svgString;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);
    
    const svgElement = container.querySelector('svg');
    if (!svgElement) {
      document.body.removeChild(container);
      return null;
    }
    
    // Get dimensions
    const width = parseInt(svgElement.getAttribute('width') || '400');
    const height = parseInt(svgElement.getAttribute('height') || '300');
    
    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
    const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;
    
    // Create canvas and draw
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      document.body.removeChild(container);
      return null;
    }
    
    canvas.width = width * scale;
    canvas.height = height * scale;
    
    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Load and draw the SVG
    const img = new Image();
    
    const pngArrayBuffer = await new Promise<ArrayBuffer | null>((resolve) => {
      img.onload = () => {
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        
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
    console.warn('ReactFlow to PNG conversion failed:', error);
    return null;
  }
}

/**
 * Render all ReactFlow diagrams in content to PNG images
 * Returns a map of base64 keys to ArrayBuffer images
 */
export async function renderAllReactFlowDiagrams(
  content: string
): Promise<Map<string, ArrayBuffer>> {
  const diagrams = new Map<string, ArrayBuffer>();
  const blocks = extractReactFlowBlocks(content);
  
  console.log(`[reactflowToImage] Found ${blocks.length} ReactFlow diagram(s) to render`);
  
  for (const block of blocks) {
    const png = await renderReactFlowToPng(block.data);
    if (png) {
      // Use the base64 as key for lookup
      diagrams.set(block.base64, png);
    }
  }
  
  return diagrams;
}
