import React, { useEffect, useState, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';
import { cleanMarkdownContent } from '@/utils/fixMarkdownTables';
import { normalizeMarkdownDiagrams, extractMermaidBlocks, extractReactFlowBlocks, isReactFlowPlaceholder, parseReactFlowJSON } from '@/utils/normalizeMarkdownDiagrams';
import { isMermaidPlaceholder } from '@/utils/mermaidDetection';
import { FlowDiagramRenderer } from '../FlowDiagramRenderer';
import { MermaidBlock } from './MermaidBlock';
import { ReactFlowDiagram, type ReactFlowData } from '../diagrams/ReactFlowDiagram';
import { ReactFlowProvider } from '@xyflow/react';

interface StreamingResponseProps {
  content: string;
  isStreaming: boolean;
  className?: string;
}

/**
 * Chemical equation renderer - styled for reactions
 */
function ChemEquation({ content }: { content: string }) {
  return (
    <div className="my-4 p-4 bg-muted/30 rounded-lg border border-border/50">
      <pre className="font-mono text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {content}
      </pre>
    </div>
  );
}

export function StreamingResponse({ content, isStreaming, className }: StreamingResponseProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const mermaidBlocksRef = useRef<string[]>([]);
  const reactflowBlocksRef = useRef<string[]>([]);

  // Pre-process: clean markdown, normalize diagrams, then extract blocks for placeholder rendering
  const processedData = useMemo(() => {
    // Step 1: Clean markdown content (NO diagram normalization here - moved to next step)
    const cleaned = cleanMarkdownContent(content);
    
    // Step 2: Normalize diagrams (only once!)
    const normalized = normalizeMarkdownDiagrams(cleaned);
    
    // Step 3: Extract ReactFlow blocks FIRST (they're more specific)
    const { processedContent: afterReactFlow, reactflowBlocks } = extractReactFlowBlocks(normalized);
    
    // Step 4: Extract Mermaid blocks
    const { processedContent, mermaidBlocks } = extractMermaidBlocks(afterReactFlow);
    
    return { processedContent, mermaidBlocks, reactflowBlocks };
  }, [content]);

  // Store blocks in refs for access in render
  useEffect(() => {
    mermaidBlocksRef.current = processedData.mermaidBlocks;
    reactflowBlocksRef.current = processedData.reactflowBlocks;
  }, [processedData.mermaidBlocks, processedData.reactflowBlocks]);

  // Update displayed content
  useEffect(() => {
    setDisplayedContent(processedData.processedContent);
  }, [processedData.processedContent]);

  // Blinking cursor effect
  useEffect(() => {
    if (!isStreaming) {
      setShowCursor(false);
      return;
    }

    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => clearInterval(interval);
  }, [isStreaming]);

  if (!content && !isStreaming) {
    return null;
  }

  // Create components that have access to mermaid blocks
  const components = {
    // ReactFlow diagram embedded as base64 JSON in data attribute
    div: ({ node, children, ...props }: { node?: any; children?: React.ReactNode }) => {
      const rfData = (props as any)['data-reactflow-diagram'];
      if (rfData) {
        try {
          const json = atob(rfData);
          const data = JSON.parse(json);
          if (data && Array.isArray(data.nodes) && Array.isArray(data.edges)) {
            return (
              <ReactFlowProvider>
                <ReactFlowDiagram data={data as ReactFlowData} />
              </ReactFlowProvider>
            );
          }
        } catch (e) {
          console.warn('Failed to decode ReactFlow diagram:', e);
          return (
            <div className="my-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              Error en diagrama: {(e as Error).message}
            </div>
          );
        }
      }
      return <div {...props}>{children}</div>;
    },
    // Custom table styling
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-border text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => (
      <thead className="bg-[#307177]">{children}</thead>
    ),
    tbody: ({ children }: { children?: React.ReactNode }) => (
      <tbody className="[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-[#f9fafb]">
        {children}
      </tbody>
    ),
    tr: ({ children }: { children?: React.ReactNode }) => (
      <tr className="hover:bg-[#f0fdfa] transition-colors">
        {children}
      </tr>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="border border-[#e5e7eb] px-3 py-2 text-left font-medium text-white">
        {children}
      </th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
      <td className="border border-[#e5e7eb] px-3 py-2 text-foreground">{children}</td>
    ),
    // Custom link styling
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/80 underline"
      >
        {children}
      </a>
    ),
    // Custom code block styling - detect reactflow, flow and chem types
    pre: ({ children }: { children?: React.ReactNode }) => {
      // Extract the code element (check both 'code' and 'span' since handlers may convert)
      const codeElement = React.Children.toArray(children).find(
        (child): child is React.ReactElement => 
          React.isValidElement(child) && (child.type === 'code' || (child.type === 'span' && child.props?.className?.includes('language-')))
      );
      
      if (codeElement) {
        const codeClassName = codeElement.props?.className || '';
        const codeContent = String(codeElement.props?.children || '').trim();
        
        // Handle ```reactflow blocks - Professional interactive diagrams
        if (codeClassName.includes('language-reactflow')) {
          const data = parseReactFlowJSON(codeContent);
          if (data) {
            return (
              <ReactFlowProvider>
                <ReactFlowDiagram data={data} />
              </ReactFlowProvider>
            );
          }
          console.warn('Invalid reactflow JSON, could not extract valid object from:', codeContent.substring(0, 200));
          return (
            <div className="my-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              Error en diagrama: No se pudo extraer JSON válido del bloque reactflow
            </div>
          );
        }
        
        // Handle ```mermaid blocks (shouldn't reach here due to extraction, but just in case)
        if (codeClassName.includes('language-mermaid')) {
          return <MermaidBlock content={codeContent} />;
        }
        
        // Handle ```flow blocks
        if (codeClassName.includes('language-flow')) {
          return <FlowDiagramRenderer content={codeContent} />;
        }
        
        // Handle ```chem or ```equation blocks
        if (codeClassName.includes('language-chem') || codeClassName.includes('language-equation')) {
          return <ChemEquation content={codeContent} />;
        }
      }
      
      // Check if this pre block contains a ReactFlow placeholder
      const textContent = React.Children.toArray(children)
        .map(child => {
          const extractText = (node: React.ReactNode): string => {
            if (typeof node === 'string') return node;
            if (typeof node === 'number') return String(node);
            if (React.isValidElement(node) && node.props?.children) {
              return React.Children.toArray(node.props.children).map(extractText).join('');
            }
            return '';
          };
          return extractText(child);
        })
        .join('')
        .trim();

      const reactflowCheck = isReactFlowPlaceholder(textContent);
      if (reactflowCheck.isPlaceholder && reactflowBlocksRef.current[reactflowCheck.index]) {
        const data = parseReactFlowJSON(reactflowBlocksRef.current[reactflowCheck.index]);
        if (data) {
          return (
            <ReactFlowProvider>
              <ReactFlowDiagram data={data} />
            </ReactFlowProvider>
          );
        }
        console.warn('Invalid ReactFlow JSON in pre placeholder');
      }
      
      // Default pre styling
      return (
        <pre className="bg-card text-card-foreground p-4 rounded-lg overflow-x-auto my-4 text-sm">
          {children}
        </pre>
      );
    },
    code: ({ className: codeClassName, children, ...props }: { className?: string; children?: React.ReactNode; node?: any }) => {
      const textContent = String(children || '').trim();

      // Check if this inline code is actually a ReactFlow placeholder
      // This happens when stray backticks in LLM output wrap the placeholder
      const reactflowCheck = isReactFlowPlaceholder(textContent);
      if (reactflowCheck.isPlaceholder && reactflowBlocksRef.current[reactflowCheck.index]) {
        const data = parseReactFlowJSON(reactflowBlocksRef.current[reactflowCheck.index]);
        if (data) {
          return (
            <ReactFlowProvider>
              <ReactFlowDiagram data={data} />
            </ReactFlowProvider>
          );
        }
        console.warn('Invalid ReactFlow JSON in code placeholder');
      }

      // Check if this is an inline code (no className usually means inline)
      const isInline = !codeClassName && !props.node?.position;
      
      if (isInline) {
        return (
          <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props}>
            {children}
          </code>
        );
      }
      
      // Block code (will be wrapped by pre)
      return (
        <code className={cn('font-mono', codeClassName)} {...props}>
          {children}
        </code>
      );
    },
    // Strong/bold styling
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    // Headers with better styling
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-xl font-bold text-foreground mt-6 mb-3 first:mt-0">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-lg font-semibold text-foreground mt-5 mb-2">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-base font-semibold text-foreground mt-4 mb-2">{children}</h3>
    ),
    // Paragraph - check for mermaid and reactflow placeholders
    p: ({ children }: { children?: React.ReactNode }) => {
      // Recursive text extraction to handle nested elements
      const extractText = (node: React.ReactNode): string => {
        if (typeof node === 'string') return node;
        if (typeof node === 'number') return String(node);
        if (React.isValidElement(node) && node.props?.children) {
          return React.Children.toArray(node.props.children).map(extractText).join('');
        }
        return '';
      };
      const textContent = React.Children.toArray(children).map(extractText).join('').trim();
      
      // Check if this is a ReactFlow placeholder (exact match)
      const reactflowCheck = isReactFlowPlaceholder(textContent);
      if (reactflowCheck.isPlaceholder && reactflowBlocksRef.current[reactflowCheck.index]) {
        const data = parseReactFlowJSON(reactflowBlocksRef.current[reactflowCheck.index]);
        if (data) {
          return (
            <ReactFlowProvider>
              <ReactFlowDiagram data={data} />
            </ReactFlowProvider>
          );
        }
        console.warn('Invalid ReactFlow JSON in placeholder, could not extract valid object');
        return (
          <div className="my-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            Error en diagrama: No se pudo extraer JSON válido del placeholder
          </div>
        );
      }
      
      // Check if this paragraph CONTAINS a ReactFlow placeholder (mixed with text)
      const placeholderMatch = textContent.match(/:::reactflow-placeholder-(\d+):::/);
      if (placeholderMatch) {
        const index = parseInt(placeholderMatch[1], 10);
        if (reactflowBlocksRef.current[index]) {
          const data = parseReactFlowJSON(reactflowBlocksRef.current[index]);
          if (data) {
            // Split: render text before, then diagram, then text after
            const parts = textContent.split(/:::reactflow-placeholder-\d+:::/);
            const before = parts[0]?.trim();
            const after = parts[1]?.trim();
            return (
              <>
                {before && <p className="mb-4 last:mb-0 leading-[1.8] text-foreground/90">{before}</p>}
                <ReactFlowProvider>
                  <ReactFlowDiagram data={data} />
                </ReactFlowProvider>
                {after && <p className="mb-4 last:mb-0 leading-[1.8] text-foreground/90">{after}</p>}
              </>
            );
          }
        }
      }
      
      // Check if this paragraph contains raw ReactFlow JSON (fallback for edge cases)
      if (textContent.includes('"nodes"') && textContent.includes('"edges"') && textContent.includes('{')) {
        const data = parseReactFlowJSON(textContent);
        if (data) {
          // Find where JSON starts to extract text before it
          const jsonStart = textContent.indexOf('{');
          const textBefore = textContent.substring(0, jsonStart).trim();
          return (
            <>
              {textBefore && <p className="mb-4 last:mb-0 leading-[1.8] text-foreground/90">{textBefore}</p>}
              <ReactFlowProvider>
                <ReactFlowDiagram data={data} />
              </ReactFlowProvider>
            </>
          );
        }
      }
      
      // Check if this is a mermaid placeholder
      const { isPlaceholder, index } = isMermaidPlaceholder(textContent);
      if (isPlaceholder && mermaidBlocksRef.current[index]) {
        return <MermaidBlock content={mermaidBlocksRef.current[index]} />;
      }
      
      return (
        <p className="mb-4 last:mb-0 leading-[1.8] text-foreground/90">{children}</p>
      );
    },
    // List styling
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc list-inside space-y-1.5 my-3">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal list-inside space-y-1.5 my-3">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    // Blockquote styling
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-3">
        {children}
      </blockquote>
    ),
  };

  return (
    <div ref={containerRef} className={cn('prose prose-sm max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {displayedContent}
      </ReactMarkdown>

      {/* Blinking cursor */}
      {isStreaming && showCursor && (
        <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-0.5 align-text-bottom" />
      )}
    </div>
  );
}
