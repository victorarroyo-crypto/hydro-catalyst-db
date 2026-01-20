import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Globe, 
  Building2, 
  BookOpen, 
  ExternalLink, 
  Star,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { ResearchSource } from '@/types/briefing';

interface ResearchSourcesViewProps {
  sources: ResearchSource[];
  isLoading?: boolean;
}

const sourceTypeIcons: Record<string, React.ElementType> = {
  technical: FileText,
  regulatory: BookOpen,
  company: Building2,
  academic: Globe,
};

const sourceTypeLabels: Record<string, string> = {
  technical: 'Técnicas',
  regulatory: 'Normativas',
  company: 'Empresa',
  academic: 'Académicas',
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  verified: CheckCircle2,
  starred: Star,
};

export function ResearchSourcesView({ sources, isLoading }: ResearchSourcesViewProps) {
  const groupedSources = React.useMemo(() => {
    return sources.reduce((acc, source) => {
      const type = source.source_type || 'technical';
      if (!acc[type]) acc[type] = [];
      acc[type].push(source);
      return acc;
    }, {} as Record<string, ResearchSource[]>);
  }, [sources]);

  const renderSourceCard = (source: ResearchSource) => {
    const Icon = sourceTypeIcons[source.source_type || 'technical'] || FileText;
    const StatusIcon = statusIcons[source.status || 'pending'] || Clock;

    return (
      <Card key={source.id} className="group hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">{source.title}</h4>
                  {source.relevance_score && source.relevance_score >= 0.8 && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      Alta relevancia
                    </Badge>
                  )}
                </div>
                {source.summary && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {source.summary}
                  </p>
                )}
                {source.key_findings && source.key_findings.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {source.key_findings.slice(0, 3).map((finding, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {finding.length > 30 ? `${finding.slice(0, 30)}...` : finding}
                      </Badge>
                    ))}
                    {source.key_findings.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{source.key_findings.length - 3} más
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusIcon className="h-4 w-4 text-muted-foreground" />
              {source.url && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  asChild
                >
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="h-12 w-12 bg-muted rounded-full" />
              <div className="h-4 w-48 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sources.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No hay fuentes de investigación</p>
            <p className="text-sm mt-1">Ejecuta la investigación preliminar para obtener fuentes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Fuentes de Investigación
        </CardTitle>
        <CardDescription>
          {sources.length} fuentes encontradas organizadas por tipo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              Todas ({sources.length})
            </TabsTrigger>
            {Object.entries(groupedSources).map(([type, items]) => (
              <TabsTrigger key={type} value={type}>
                {sourceTypeLabels[type] || type} ({items.length})
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value="all">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {sources.map(renderSourceCard)}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {Object.entries(groupedSources).map(([type, items]) => (
            <TabsContent key={type} value={type}>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {items.map(renderSourceCard)}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
