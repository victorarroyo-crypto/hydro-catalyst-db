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
 * Extract ReactFlow diagram blocks from content
 * Detects: <div data-reactflow-diagram="BASE64">
 */
export function extractReactFlowBlocks(content: string): { 
  data: ReactFlowData; 
  startIndex: number; 
  endIndex: number;
  base64: string;
}[] {
  const blocks: { data: ReactFlowData; startIndex: number; endIndex: number; base64: string }[] = [];
  
  // Match <div data-reactflow-diagram="..."></div> or self-closing
  const regex = /<div\s+data-reactflow-diagram="([^"]+)"[^>]*>(?:<\/div>)?/gi;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
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
      }
    } catch (e) {
      console.warn('Failed to parse ReactFlow diagram:', e);
    }
  }
  
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
 * Create a simple SVG representation of a ReactFlow diagram
 * This is used for Word export since we can't render React components server-side
 */
function createReactFlowSvg(data: ReactFlowData): string {
  const nodes = data.nodes;
  const edges = data.edges;
  
  // Calculate layout using simple positioning
  const nodeWidth = 150;
  const nodeHeight = 50;
  const horizontalGap = 80;
  const verticalGap = 60;
  
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
  
  // Simple left-to-right layout using BFS
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
  
  // Assign positions
  const positions = new Map<string, { x: number; y: number }>();
  levels.forEach((level, levelIndex) => {
    level.forEach((nodeId, nodeIndex) => {
      positions.set(nodeId, {
        x: levelIndex * (nodeWidth + horizontalGap) + 20,
        y: nodeIndex * (nodeHeight + verticalGap) + 20,
      });
    });
  });
  
  // Calculate SVG dimensions
  const maxX = Math.max(...Array.from(positions.values()).map(p => p.x)) + nodeWidth + 40;
  const maxY = Math.max(...Array.from(positions.values()).map(p => p.y)) + nodeHeight + 40;
  
  // Color mapping based on node type
  const getNodeColor = (type?: string): string => {
    switch (type) {
      case 'input': return '#307177';
      case 'output': return '#2D8A4E';
      case 'storage': return '#5B7FA3';
      case 'chemical': return '#C97A2B';
      case 'split':
      case 'merge': return '#8B5CF6';
      default: return '#6B7280';
    }
  };
  
  // Build SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}">`;
  svg += '<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#64748B"/></marker></defs>';
  svg += '<rect width="100%" height="100%" fill="white"/>';
  
  // Draw edges first (so they appear behind nodes)
  edges.forEach(edge => {
    const sourcePos = positions.get(edge.source);
    const targetPos = positions.get(edge.target);
    if (sourcePos && targetPos) {
      const x1 = sourcePos.x + nodeWidth;
      const y1 = sourcePos.y + nodeHeight / 2;
      const x2 = targetPos.x;
      const y2 = targetPos.y + nodeHeight / 2;
      
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748B" stroke-width="2" marker-end="url(#arrowhead)"/>`;
      
      // Edge label
      if (edge.label) {
        const labelX = (x1 + x2) / 2;
        const labelY = (y1 + y2) / 2 - 8;
        svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-family="Arial" font-size="10" fill="#64748B">${escapeXml(edge.label)}</text>`;
      }
    }
  });
  
  // Draw nodes
  nodes.forEach(node => {
    const pos = positions.get(node.id);
    if (pos) {
      const nodeData = nodeMap.get(node.id);
      const color = getNodeColor(nodeData?.type);
      const radius = 6;
      
      svg += `<rect x="${pos.x}" y="${pos.y}" width="${nodeWidth}" height="${nodeHeight}" rx="${radius}" fill="${color}" stroke="#1E293B" stroke-width="1"/>`;
      
      // Node label (truncate if too long)
      const nodeLabel = getNodeLabel(node);
      const label = nodeLabel.length > 20 
        ? nodeLabel.substring(0, 18) + '...' 
        : nodeLabel;
      svg += `<text x="${pos.x + nodeWidth / 2}" y="${pos.y + nodeHeight / 2 + 4}" text-anchor="middle" font-family="Arial" font-size="11" fill="white" font-weight="500">${escapeXml(label)}</text>`;
    }
  });
  
  // Title if present
  if (data.title) {
    svg += `<text x="${maxX / 2}" y="15" text-anchor="middle" font-family="Arial" font-size="14" fill="#1E293B" font-weight="bold">${escapeXml(data.title)}</text>`;
  }
  
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
