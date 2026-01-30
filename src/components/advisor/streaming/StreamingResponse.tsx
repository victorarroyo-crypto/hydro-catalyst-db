import React, { useEffect, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { cleanMarkdownContent } from '@/utils/fixMarkdownTables';
import { FlowDiagramRenderer } from '../FlowDiagramRenderer';
import { MermaidRenderer } from '../MermaidRenderer';

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

  if (!content && !isStreaming) {
    return null;
  }

  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      <ReactMarkdown
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
            <thead className="bg-[#307177]">{children}</thead>
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
            <th className="border border-[#e5e7eb] px-3 py-2 text-left font-medium text-white">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-[#e5e7eb] px-3 py-2 text-foreground">{children}</td>
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
          // Custom code block styling - detect flow and chem types
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
            
            // Default pre styling
            return (
              <pre className="bg-card text-card-foreground p-4 rounded-lg overflow-x-auto my-4 text-sm">
                {children}
              </pre>
            );
          },
          code: ({ className: codeClassName, children, ...props }) => {
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
        {displayedContent}
      </ReactMarkdown>

      {/* Blinking cursor */}
      {isStreaming && showCursor && (
        <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-0.5 align-text-bottom" />
      )}
    </div>
  );
}