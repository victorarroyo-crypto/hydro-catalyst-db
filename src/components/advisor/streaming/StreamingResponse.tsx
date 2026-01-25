import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface StreamingResponseProps {
  content: string;
  isStreaming: boolean;
  className?: string;
}

export function StreamingResponse({ content, isStreaming, className }: StreamingResponseProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  // Typing effect - update displayed content as new content arrives
  useEffect(() => {
    setDisplayedContent(content);
  }, [content]);

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
              <table className="min-w-full border-collapse border border-slate-200 text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-200 px-3 py-2">{children}</td>
          ),
          // Custom link styling
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#32b4cd] hover:text-[#307177] underline"
            >
              {children}
            </a>
          ),
          // Custom code block styling
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-800" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={cn('block bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto', className)} {...props}>
                {children}
              </code>
            );
          },
          // Strong/bold styling
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900">{children}</strong>
          ),
          // List styling
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>
          ),
          // Blockquote styling
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[#32b4cd] pl-4 italic text-slate-600 my-3">
              {children}
            </blockquote>
          ),
        }}
      >
        {displayedContent}
      </ReactMarkdown>

      {/* Blinking cursor */}
      {isStreaming && showCursor && (
        <span className="inline-block w-2 h-5 bg-[#32b4cd] animate-pulse ml-0.5 align-text-bottom" />
      )}
    </div>
  );
}
