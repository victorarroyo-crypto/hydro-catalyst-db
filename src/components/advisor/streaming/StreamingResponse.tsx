import React, { useEffect, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { cleanMarkdownContent } from '@/utils/fixMarkdownTables';
import { FlowDiagramRenderer, MultiLineFlowRenderer, extractFlowDiagrams } from '../FlowDiagramRenderer';

interface StreamingResponseProps {
  content: string;
  isStreaming: boolean;
  className?: string;
}

export function StreamingResponse({ content, isStreaming, className }: StreamingResponseProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  // Clean and enhance the markdown content
  const cleanedContent = useMemo(() => cleanMarkdownContent(content), [content]);

  // Typing effect - update displayed content as new content arrives
  useEffect(() => {
    setDisplayedContent(cleanedContent);
  }, [cleanedContent]);

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

  // Extract flow diagrams from content
  const { segments } = useMemo(() => extractFlowDiagrams(displayedContent), [displayedContent]);

  if (!content && !isStreaming) {
    return null;
  }

  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      {segments.map((segment, idx) => {
        if (segment.type === 'flow') {
          return <FlowDiagramRenderer key={idx} content={segment.content} />;
        }
        
        if (segment.type === 'multiflow' && segment.lines) {
          return <MultiLineFlowRenderer key={idx} lines={segment.lines} />;
        }
        
        return (
          <ReactMarkdown
            key={idx}
            remarkPlugins={[remarkGfm]}
            components={{
              // Custom table styling
              table: ({ children }) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full border-collapse border border-border text-sm">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-muted">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="border border-border px-3 py-2 text-left font-medium text-foreground">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-border px-3 py-2">{children}</td>
              ),
              // Custom link styling
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline"
                >
                  {children}
                </a>
              ),
              // Custom code block styling
              code: ({ className: codeClassName, children, ...props }) => {
                const isInline = !codeClassName;
                if (isInline) {
                  return (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <code className={cn('block bg-card text-card-foreground p-3 rounded-lg overflow-x-auto', codeClassName)} {...props}>
                    {children}
                  </code>
                );
              },
              // Strong/bold styling
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              // Headers with better styling
              h1: ({ children }) => (
                <h1 className="text-xl font-bold text-foreground mt-6 mb-3 first:mt-0">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold text-foreground mt-5 mb-2">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold text-foreground mt-4 mb-2">{children}</h3>
              ),
              // Paragraph with relaxed spacing
              p: ({ children }) => (
                <p className="mb-4 last:mb-0 leading-[1.8] text-foreground/90">{children}</p>
              ),
              // List styling
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-1.5 my-3">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-1.5 my-3">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
              // Blockquote styling
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-3">
                  {children}
                </blockquote>
              ),
            }}
          >
            {segment.content}
          </ReactMarkdown>
        );
      })}

      {/* Blinking cursor */}
      {isStreaming && showCursor && (
        <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-0.5 align-text-bottom" />
      )}
    </div>
  );
}