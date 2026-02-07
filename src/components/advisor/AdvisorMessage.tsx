import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ExternalLink, Wrench, FileText, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Source } from '@/types/advisorChat';
import { cleanMarkdownContent } from '@/utils/fixMarkdownTables';
import { normalizeMarkdownDiagrams, extractReactFlowBlocks, isReactFlowPlaceholder, parseReactFlowJSON } from '@/utils/normalizeMarkdownDiagrams';
import { isMermaidContent, extractTextFromChildren } from '@/utils/mermaidDetection';
import { FlowDiagramRenderer } from './FlowDiagramRenderer';
import { MermaidRenderer } from './MermaidRenderer';
import { useMermaidPostProcessor } from '@/hooks/useMermaidPostProcessor';
import { WaterBalanceBlockDiagram, isWaterBalanceContent } from './WaterBalanceBlockDiagram';
import { ReactFlowDiagram, type ReactFlowData } from './diagrams/ReactFlowDiagram';
import { ReactFlowProvider } from '@xyflow/react';
interface AdvisorMessageProps {
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

// Source type icon and styling
function getSourceIcon(type: string) {
  switch (type) {
    case 'technology':
      return <Wrench className="w-3 h-3" />;
    case 'case_study':
      return <FileText className="w-3 h-3" />;
    default:
      return <Globe className="w-3 h-3" />;
  }
}

function getSourceLabel(type: string) {
  switch (type) {
    case 'technology':
      return 'Tecnología';
    case 'case_study':
      return 'Caso';
    default:
      return 'Web';
  }
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
/**
 * Extracts water balance table sections from content and returns
 * the content split into parts with water balance sections marked
 */
function extractWaterBalanceSections(text: string): Array<{ type: 'text' | 'water-balance'; content: string }> {
  const segments: Array<{ type: 'text' | 'water-balance'; content: string }> = [];
  
  // Look for water balance tables by finding the header and related table
  const lines = text.split('\n');
  let currentText: string[] = [];
  let waterBalanceBuffer: string[] = [];
  let inWaterBalanceSection = false;
  let tableLineCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Detect water balance section start
    const isWaterBalanceHeader = 
      (lowerLine.includes('balance hídrico') || lowerLine.includes('balance hidrico')) ||
      (lowerLine.includes('balance') && lowerLine.includes('agua'));
    
    // Detect if we're starting a table that might be water balance
    const isTableStart = line.trim().startsWith('|') && !inWaterBalanceSection;
    const isPreviousLineWaterBalance = i > 0 && 
      (lines[i-1].toLowerCase().includes('balance') || 
       lines[i-2]?.toLowerCase().includes('balance'));
    
    if (isWaterBalanceHeader) {
      // Flush current text
      if (currentText.length > 0) {
        segments.push({ type: 'text', content: currentText.join('\n') });
        currentText = [];
      }
      inWaterBalanceSection = true;
      waterBalanceBuffer = [line];
      tableLineCount = 0;
      continue;
    }
    
    if (inWaterBalanceSection) {
      // Check if line is part of table
      if (line.trim().startsWith('|') || line.trim() === '' || line.trim().startsWith('-')) {
        waterBalanceBuffer.push(line);
        if (line.trim().startsWith('|')) tableLineCount++;
        continue;
      }
      
      // If we've collected a table with enough rows, end the section
      if (tableLineCount >= 3) {
        // Check if accumulated buffer is actually water balance content
        const bufferText = waterBalanceBuffer.join('\n');
        if (isWaterBalanceContent(bufferText)) {
          segments.push({ type: 'water-balance', content: bufferText });
        } else {
          // Not water balance, add as regular text
          currentText.push(...waterBalanceBuffer);
        }
        waterBalanceBuffer = [];
        inWaterBalanceSection = false;
        tableLineCount = 0;
      }
      
      currentText.push(line);
      continue;
    }
    
    // Check for inline water balance table (table with water balance keywords)
    if (isTableStart && isPreviousLineWaterBalance) {
      // Start collecting potential water balance table
      inWaterBalanceSection = true;
      // Include the previous header line(s)
      const headerLines: string[] = [];
      for (let j = Math.max(0, i - 3); j < i; j++) {
        if (lines[j].toLowerCase().includes('balance') || lines[j].trim() === '') {
          headerLines.push(lines[j]);
        }
      }
      waterBalanceBuffer = [...headerLines, line];
      tableLineCount = 1;
      continue;
    }
    
    currentText.push(line);
  }
  
  // Flush remaining content
  if (waterBalanceBuffer.length > 0) {
    const bufferText = waterBalanceBuffer.join('\n');
    if (isWaterBalanceContent(bufferText)) {
      segments.push({ type: 'water-balance', content: bufferText });
    } else {
      currentText.push(...waterBalanceBuffer);
    }
  }
  
  if (currentText.length > 0) {
    segments.push({ type: 'text', content: currentText.join('\n') });
  }
  
  return segments;
}

export function AdvisorMessage({ content, sources, isStreaming = false }: AdvisorMessageProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(isStreaming);
  const containerRef = useRef<HTMLDivElement>(null);
  const reactflowBlocksRef = useRef<string[]>([]);
  
  // Pre-process content: clean, normalize, then extract ReactFlow blocks
  const { cleanedContent, reactflowBlocks } = React.useMemo(() => {
    const cleaned = cleanMarkdownContent(content);
    const normalized = normalizeMarkdownDiagrams(cleaned);
    const { processedContent, reactflowBlocks } = extractReactFlowBlocks(normalized);
    return { cleanedContent: processedContent, reactflowBlocks };
  }, [content]);
  
  // Store ReactFlow blocks in ref for access during render
  React.useEffect(() => {
    reactflowBlocksRef.current = reactflowBlocks;
  }, [reactflowBlocks]);
  
  // Post-processor to catch any missed Mermaid diagrams after render
  useMermaidPostProcessor(containerRef, displayedText, isTyping);
  
  // Simulated typing effect
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(cleanedContent);
      setIsTyping(false);
      return;
    }
    
    setIsTyping(true);
    setDisplayedText('');
    
    let index = 0;
    const chunkSize = 3; // Characters per tick
    const interval = setInterval(() => {
      if (index < cleanedContent.length) {
        setDisplayedText(cleanedContent.slice(0, index + chunkSize));
        index += chunkSize;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 20);
    
    return () => clearInterval(interval);
  }, [cleanedContent, isStreaming]);
  
  // Extract water balance sections for special rendering
  const contentSegments = React.useMemo(() => {
    return extractWaterBalanceSections(displayedText);
  }, [displayedText]);
  
  // Render function for markdown content (used for non-water-balance segments)
  const renderMarkdownContent = (text: string, key?: string) => (
    <ReactMarkdown
      key={key}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        // ReactFlow diagram embedded as base64 JSON in data attribute
        div: ({ node, children, ...props }) => {
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
        // Subtle headers - more spacing for professional look
        h1: ({ children }) => (
          <h1 className="text-xl font-bold text-foreground mt-8 mb-4 first:mt-0 pb-2 border-b border-border/50">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold text-foreground mt-6 mb-3 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold text-foreground mt-5 mb-2">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">
            {children}
          </h4>
        ),
        // Normal paragraphs with better spacing and line-height
        // Also detect ReactFlow placeholders and unformatted Mermaid diagrams
        p: ({ children }) => {
          const textContent = extractTextFromChildren(children);
          
          // Check if this is a ReactFlow placeholder
          const reactflowCheck = isReactFlowPlaceholder(textContent.trim());
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
          
          // Check if this paragraph contains a Mermaid diagram without code fences
          if (isMermaidContent(textContent)) {
            return <MermaidRenderer content={textContent} />;
          }
          
          return (
            <p className="mb-5 last:mb-0 leading-[1.8] text-foreground/90">{children}</p>
          );
        },
        // Subtle bold
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        // Italic
        em: ({ children }) => (
          <em className="italic text-foreground/80">{children}</em>
        ),
        // Better spaced lists
        ul: ({ children }) => (
          <ul className="my-4 ml-1 space-y-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-4 ml-1 space-y-2 list-decimal list-inside">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="relative pl-6 leading-[1.8] before:content-['•'] before:absolute before:left-0 before:text-primary before:font-bold">
            {children}
          </li>
        ),
        // Clickable links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            {children}
            <ExternalLink className="w-3 h-3 opacity-50" />
          </a>
        ),
        // Code blocks and inline code
        code: ({ children, className }) => {
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

          // Block code: preserve <code> with className for pre handler
          if (className?.includes('language-')) {
            return <code className={className}>{children}</code>;
          }
          // Inline code - render as normal text
          return <span>{children}</span>;
        },
        // Pre blocks - detect reactflow, flow, chem, and mermaid types
        pre: ({ children }) => {
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
            
            // Handle ```mermaid blocks
            if (codeClassName.includes('language-mermaid')) {
              return <MermaidRenderer content={codeContent} />;
            }
            
            // Handle ```flow blocks
            // NOTE: Some LLMs incorrectly label Mermaid flowcharts as ```flow.
            // If the content looks like Mermaid, render with Mermaid for a reliable, professional result.
            if (codeClassName.includes('language-flow')) {
              if (isMermaidContent(codeContent) || /^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|mindmap|timeline|sankey|xychart|block)\b/i.test(codeContent)) {
                return <MermaidRenderer content={codeContent} />;
              }
              return <FlowDiagramRenderer content={codeContent} />;
            }
            // Handle ```chem or ```equation blocks
            if (codeClassName.includes('language-chem') || codeClassName.includes('language-equation')) {
              return <ChemEquation content={codeContent} />;
            }
            
            // FALLBACK: Check if unlabeled code block contains Mermaid syntax
            if (isMermaidContent(codeContent)) {
              return <MermaidRenderer content={codeContent} />;
            }
          }
          
          // Also check raw pre content for Mermaid (when no code element)
          const textContent = extractTextFromChildren(children);
          if (isMermaidContent(textContent)) {
            return <MermaidRenderer content={textContent} />;
          }
          
          // Check if this pre block contains a ReactFlow placeholder
          const reactflowCheck = isReactFlowPlaceholder(textContent.trim());
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
          
          // Regular pre block - render as completely normal paragraph text (no special formatting)
          return (
            <p className="mb-5 last:mb-0 leading-[1.8] text-foreground/90">{children}</p>
          );
        },
        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/30 pl-3 my-3 text-muted-foreground italic">
            {children}
          </blockquote>
        ),
        // Tables with clean styling - visible borders for clarity
        table: ({ children }) => (
          <div className="my-6 overflow-x-auto rounded-lg border border-border max-w-full">
            <table className="w-full border-collapse text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-[#307177]">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-[#f9fafb]">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-[#f0fdfa] transition-colors">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="border border-[#e5e7eb] px-3 py-2 text-left font-semibold text-white text-xs uppercase tracking-wide">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-[#e5e7eb] px-3 py-2 text-foreground leading-relaxed text-sm">
            {children}
          </td>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );

  return (
    <div ref={containerRef} className="advisor-message prose prose-sm dark:prose-invert max-w-none leading-relaxed overflow-hidden">
      {/* Render content segments - water balance as block diagrams, rest as markdown */}
      {contentSegments.map((segment, idx) => 
        segment.type === 'water-balance' ? (
          <WaterBalanceBlockDiagram key={`wb-${idx}`} content={segment.content} />
        ) : (
          renderMarkdownContent(segment.content, `md-${idx}`)
        )
      )}
      
      {/* Typing cursor */}
      {isTyping && (
        <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle" />
      )}
      
      {/* Sources section */}
      {sources && sources.length > 0 && !isTyping && (() => {
        // Separate internal vs external sources
        const internalSources = sources.filter(s => s.type === 'technology' || s.type === 'case_study');
        const externalSources = sources.filter(s => s.type !== 'technology' && s.type !== 'case_study');
        
        return (
          <div className="mt-4 pt-3 border-t border-border/50 space-y-3">
            {/* External sources - prominent display */}
            {externalSources.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Fuentes externas:
                </p>
                <div className="space-y-1.5">
                  {externalSources.map((source, idx) => (
                    source.url ? (
                      <a
                        key={`ext-${idx}`}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 text-sm text-foreground/90 bg-muted/40 rounded-lg px-3 py-2 hover:bg-muted/60 transition-colors group"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                        <span className="group-hover:underline">{source.name}</span>
                      </a>
                    ) : (
                      <div
                        key={`ext-${idx}`}
                        className="flex items-start gap-2 text-sm text-foreground/70 bg-muted/30 rounded-lg px-3 py-2"
                      >
                        <Globe className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <span>{source.name}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
            
            {/* Internal sources - compact chips */}
            {internalSources.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Base de conocimiento:</p>
                <div className="flex flex-wrap gap-1.5">
                  {internalSources.map((source, idx) => (
                    <div
                      key={`int-${idx}`}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
                        "bg-muted/80 text-foreground/80"
                      )}
                    >
                      {getSourceIcon(source.type)}
                      <span className="max-w-[120px] truncate">{source.name || getSourceLabel(source.type)}</span>
                      {source.provider && (
                        <span className="text-muted-foreground">· {source.provider}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
