import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink, Wrench, FileText, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Source } from '@/types/advisorChat';
import { cleanMarkdownContent } from '@/utils/fixMarkdownTables';
import { isMermaidContent, extractTextFromChildren } from '@/utils/mermaidDetection';
import { FlowDiagramRenderer } from './FlowDiagramRenderer';
import { MermaidRenderer } from './MermaidRenderer';
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

export function AdvisorMessage({ content, sources, isStreaming = false }: AdvisorMessageProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(isStreaming);
  
  const cleanedContent = cleanMarkdownContent(content);
  
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

  return (
    <div className="advisor-message prose prose-sm dark:prose-invert max-w-none leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
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
          // Also detect unformatted Mermaid diagrams
          p: ({ children }) => {
            const textContent = extractTextFromChildren(children);
            
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
          // Code inline
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <code className="block bg-muted p-3 rounded-lg text-xs overflow-x-auto my-2">
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            );
          },
          // Pre blocks - detect flow and chem types
          pre: ({ children }) => {
            // Extract the code element
            const codeElement = React.Children.toArray(children).find(
              (child): child is React.ReactElement => 
                React.isValidElement(child) && child.type === 'code'
            );
            
            if (codeElement) {
              const codeClassName = codeElement.props?.className || '';
              const codeContent = String(codeElement.props?.children || '').trim();
              
              // Handle ```mermaid blocks
              if (codeClassName.includes('language-mermaid')) {
                return <MermaidRenderer content={codeContent} />;
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
            
            return (
              <pre className="bg-muted rounded-lg overflow-x-auto my-2 p-3">
                {children}
              </pre>
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
            <div className="my-6 overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full border-collapse text-sm">
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
            <th className="border border-[#e5e7eb] px-4 py-3 text-left font-semibold text-white text-xs uppercase tracking-wide">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-[#e5e7eb] px-4 py-3 text-foreground leading-relaxed">
              {children}
            </td>
          ),
        }}
      >
        {displayedText}
      </ReactMarkdown>
      
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
