import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ExternalLink, Wrench, FileText, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Source } from '@/types/advisorChat';

interface AdvisorMessageProps {
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

// Clean excessive markdown before rendering
function cleanMarkdown(text: string): string {
  return text
    .replace(/^#{3,6}\s+/gm, '') // Remove ### #### etc (keep h1, h2)
    .replace(/\*{3,}/g, '**') // *** or more → **
    .replace(/\n{3,}/g, '\n\n') // Multiple empty lines → 2
    .replace(/^\s*[-*]\s*$/gm, '') // Empty bullet points
    .trim();
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

export function AdvisorMessage({ content, sources, isStreaming = false }: AdvisorMessageProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(isStreaming);
  
  const cleanedContent = cleanMarkdown(content);
  
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
    <div className="advisor-message">
      <ReactMarkdown
        components={{
          // Subtle headers - no borders, just size increase
          h1: ({ children }) => (
            <h1 className="text-lg font-semibold text-foreground mt-4 mb-2 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-foreground mt-3 mb-2 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-medium text-foreground mt-2 mb-1">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-medium text-foreground mt-2 mb-1">
              {children}
            </h4>
          ),
          // Normal paragraphs
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
          ),
          // Subtle bold
          strong: ({ children }) => (
            <strong className="font-medium text-foreground">{children}</strong>
          ),
          // Italic
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          // Subtle lists
          ul: ({ children }) => (
            <ul className="ml-4 mb-3 space-y-1 list-none">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="ml-4 mb-3 space-y-1 list-decimal list-inside">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="relative pl-4 before:content-['•'] before:absolute before:left-0 before:text-muted-foreground before:text-xs">
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
          // Pre blocks
          pre: ({ children }) => (
            <pre className="bg-muted rounded-lg overflow-x-auto my-2">
              {children}
            </pre>
          ),
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/30 pl-3 my-3 text-muted-foreground italic">
              {children}
            </blockquote>
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
      {sources && sources.length > 0 && !isTyping && (
        <div className="mt-4 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Fuentes:</p>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((source, idx) => (
              <div
                key={idx}
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
}
