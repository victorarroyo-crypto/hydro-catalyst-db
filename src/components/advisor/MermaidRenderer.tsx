import { useEffect, useState, useRef, useCallback } from 'react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { sanitizeMermaidContent, isLikelyValidMermaid } from '@/utils/mermaidSanitizer';

interface MermaidRendererProps {
  content: string;
  className?: string;
  onError?: () => void;
}

// Initialize mermaid once at module level
let mermaidInitialized = false;

function initializeMermaid(theme: string | undefined) {
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === 'dark' ? 'dark' : 'neutral',
    securityLevel: 'loose',
    fontFamily: 'inherit',
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
    },
    suppressErrorRendering: true,
  });
  mermaidInitialized = true;
}

// Counter for unique IDs across all instances
let renderCounter = 0;

export function MermaidRenderer({ content, className, onError }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSource, setShowSource] = useState(false);
  const { theme } = useTheme();
  const renderIdRef = useRef<number>(0);

  // Initialize mermaid when theme changes
  useEffect(() => {
    initializeMermaid(theme);
  }, [theme]);

  const renderDiagram = useCallback(async () => {
    if (!content.trim() || !containerRef.current) return;

    // Track this render to avoid race conditions
    renderIdRef.current += 1;
    const currentRenderId = renderIdRef.current;

    // Ensure mermaid is initialized
    if (!mermaidInitialized) {
      initializeMermaid(theme);
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the comprehensive sanitizer
      const cleanContent = sanitizeMermaidContent(content);
      
      // Pre-validate before attempting render
      if (!cleanContent || !isLikelyValidMermaid(cleanContent)) {
        throw new Error('Contenido no parece ser Mermaid válido');
      }

      // Generate truly unique ID for this render
      renderCounter += 1;
      const id = `mermaid-${renderCounter}-${Date.now()}`;
      
      // Render to SVG string
      const { svg: renderedSvg } = await mermaid.render(id, cleanContent);
      
      // Only update if this is still the latest render request
      if (currentRenderId === renderIdRef.current && containerRef.current) {
        // Safely clear and update the container
        containerRef.current.innerHTML = renderedSvg;
        setIsLoading(false);
      }
    } catch (err) {
      // Enhanced logging for debugging
      const cleanContent = sanitizeMermaidContent(content);
      console.warn('Mermaid render error:', {
        error: err,
        originalLength: content.length,
        cleanedLength: cleanContent.length,
        cleanedPreview: cleanContent.slice(0, 200),
        hadMarkdownFormatting: content !== cleanContent
      });
      
      // Only update if this is still the latest render request
      if (currentRenderId === renderIdRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        // Extract useful info from Mermaid parse errors
        const parseMatch = errorMessage.match(/Parse error on line (\d+)/);
        if (parseMatch) {
          setError(`Error de sintaxis en línea ${parseMatch[1]}`);
        } else {
          setError('Error al renderizar diagrama');
        }
        setIsLoading(false);
        onError?.();
      }
    }
  }, [content, theme, onError]);

  // Render diagram when content changes
  useEffect(() => {
    renderDiagram();
    
    // Cleanup function - clear container when unmounting
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [renderDiagram]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setError(null);
    setShowSource(false);
    renderDiagram();
  }, [renderDiagram]);

  if (error) {
    const sanitizedContent = sanitizeMermaidContent(content);
    
    return (
      <div className="my-4 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-destructive font-medium">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSource(!showSource)}
              className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
            >
              {showSource ? 'Ocultar código' : 'Ver código'}
            </button>
            <button
              onClick={handleRetry}
              className="text-xs px-2 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
        
        {showSource && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">Contenido original:</p>
            <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap bg-muted/30 p-2 rounded max-h-40 overflow-y-auto">
              {content}
            </pre>
            {sanitizedContent !== content && (
              <>
                <p className="text-xs text-muted-foreground mt-2">Contenido limpio:</p>
                <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap bg-muted/30 p-2 rounded max-h-40 overflow-y-auto">
                  {sanitizedContent}
                </pre>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "my-4 pt-6 pb-4 px-4 bg-card rounded-lg border border-border overflow-x-auto",
        "[&_svg]:max-w-full [&_svg]:h-auto [&_svg]:mx-auto",
        isLoading && "min-h-32 animate-pulse bg-muted/30",
        className
      )}
    />
  );
}
