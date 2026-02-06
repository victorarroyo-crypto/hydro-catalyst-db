import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ReactFlowProvider } from '@xyflow/react';
import { ReactFlowDiagram, type ReactFlowData } from './ReactFlowDiagram';
import { cn } from '@/lib/utils';

interface MarkdownWithDiagramsProps {
  content: string;
  className?: string;
}

interface ContentPart {
  type: 'markdown' | 'reactflow';
  content: string;
}

function splitContentWithDiagrams(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const regex = /```reactflow\s*\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Add markdown content before the diagram
    if (match.index > lastIndex) {
      const mdContent = content.slice(lastIndex, match.index).trim();
      if (mdContent) {
        parts.push({ type: 'markdown', content: mdContent });
      }
    }
    // Add the diagram
    parts.push({ type: 'reactflow', content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining markdown content
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) {
      parts.push({ type: 'markdown', content: remaining });
    }
  }

  return parts;
}

// Custom markdown components for styling
const markdownComponents = {
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
    <tr className="hover:bg-[#f0fdfa] transition-colors">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border border-[#e5e7eb] px-3 py-2 text-left font-medium text-white">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border border-[#e5e7eb] px-3 py-2 text-foreground">{children}</td>
  ),
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
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="bg-card text-card-foreground p-4 rounded-lg overflow-x-auto my-4 text-sm">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className={cn('font-mono', className)} {...props}>
        {children}
      </code>
    );
  },
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-xl font-bold text-foreground mt-6 mb-3 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-lg font-semibold text-foreground mt-5 mb-2">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-semibold text-foreground mt-4 mb-2">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-4 last:mb-0 leading-[1.8] text-foreground/90">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside space-y-1.5 my-3">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside space-y-1.5 my-3">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-3">
      {children}
    </blockquote>
  ),
};

export function MarkdownWithDiagrams({ content, className }: MarkdownWithDiagramsProps) {
  const parts = useMemo(() => splitContentWithDiagrams(content), [content]);

  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      {parts.map((part, index) => {
        if (part.type === 'reactflow') {
          try {
            const data: ReactFlowData = JSON.parse(part.content);
            return (
              <ReactFlowProvider key={`diagram-${index}`}>
                <ReactFlowDiagram data={data} />
              </ReactFlowProvider>
            );
          } catch (e) {
            console.warn('Invalid reactflow JSON:', e);
            return (
              <div
                key={`error-${index}`}
                className="my-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm"
              >
                Error en diagrama: {(e as Error).message}
              </div>
            );
          }
        }

        return (
          <ReactMarkdown
            key={`md-${index}`}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={markdownComponents}
          >
            {part.content}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}

export default MarkdownWithDiagrams;
