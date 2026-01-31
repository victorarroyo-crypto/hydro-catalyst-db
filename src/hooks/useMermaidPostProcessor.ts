import { useEffect, RefObject } from 'react';
import mermaid from 'mermaid';
import { isMermaidContent } from '@/utils/mermaidDetection';

/**
 * Post-render hook that scans the DOM for unprocessed Mermaid diagrams
 * and renders them manually. This catches edge cases where:
 * - The pre-processor missed unfenced diagrams
 * - ReactMarkdown didn't propagate the language class correctly
 * - Content arrived in an unexpected format
 */
export function useMermaidPostProcessor(
  containerRef: RefObject<HTMLElement>,
  content: string,
  isStreaming: boolean
) {
  useEffect(() => {
    // Only run post-processor when streaming is complete
    if (isStreaming) return;
    if (!containerRef.current) return;
    
    // Small delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(() => {
      if (!containerRef.current) return;
      
      // Find all code blocks that might contain unrendered Mermaid
      const codeBlocks = containerRef.current.querySelectorAll('pre code, pre > span');
      
      codeBlocks.forEach(async (block) => {
        const text = block.textContent || '';
        
        // Skip if already processed (parent has mermaid class or contains SVG)
        const parent = block.parentElement;
        if (!parent) return;
        if (parent.classList.contains('mermaid-processed')) return;
        if (parent.querySelector('svg')) return;
        
        // Check if this looks like a Mermaid diagram
        if (isMermaidContent(text)) {
          try {
            const id = `mermaid-post-${Math.random().toString(36).substr(2, 9)}`;
            const { svg } = await mermaid.render(id, text.trim());
            
            // Create container for the rendered diagram
            const container = document.createElement('div');
            container.className = 'mermaid-processed my-4 pt-6 pb-4 px-4 bg-card rounded-lg border border-border overflow-x-auto';
            container.innerHTML = svg;
            
            // Style the SVG
            const svgEl = container.querySelector('svg');
            if (svgEl) {
              svgEl.style.maxWidth = '100%';
              svgEl.style.height = 'auto';
              svgEl.style.margin = '0 auto';
              svgEl.style.display = 'block';
            }
            
            // Replace the code block's parent with the rendered diagram
            parent.replaceWith(container);
          } catch (err) {
            console.warn('Mermaid post-process failed:', err);
            // Mark as processed to avoid repeated attempts
            parent.classList.add('mermaid-processed');
          }
        }
      });
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [containerRef, content, isStreaming]);
}
