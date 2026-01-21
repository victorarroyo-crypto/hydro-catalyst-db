import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Lightbulb, Wrench, Loader2, MapPin, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { externalSupabase } from '@/integrations/supabase/externalClient';

interface CaseStudy {
  id: string;
  name: string;
  description: string | null;
  sector: string | null;
  country: string | null;
  technology_types: string[] | null;
  created_at: string;
}

interface CaseStudiesSectionProps {
  limit?: number;
  onCaseStudyClick?: (id: string) => void;
}

const CaseStudiesSection: React.FC<CaseStudiesSectionProps> = ({ 
  limit = 5,
  onCaseStudyClick 
}) => {
  const { data: caseStudies, isLoading } = useQuery({
    queryKey: ['case-studies-section', limit],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('casos_de_estudio')
        .select('id, name, description, sector, country, technology_types, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as CaseStudy[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5 text-primary" />
            Casos de Estudio Recientes
          </span>
          <Badge variant="secondary">{caseStudies?.length || 0}</Badge>
        </CardTitle>
        <CardDescription>
          Proyectos reales de tratamiento de agua con problema, solución y tecnologías aplicadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!caseStudies || caseStudies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay casos de estudio publicados aún</p>
            <p className="text-sm">Sube documentos de proyectos para crear casos de estudio</p>
          </div>
        ) : (
          <div className="space-y-3">
            {caseStudies.map((cs) => (
              <div
                key={cs.id}
                className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onCaseStudyClick?.(cs.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{cs.name}</h4>
                    {cs.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {cs.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {cs.sector && (
                        <Badge variant="outline" className="text-xs">
                          <Building2 className="h-3 w-3 mr-1" />
                          {cs.sector}
                        </Badge>
                      )}
                      {cs.country && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {cs.country}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(cs.created_at).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                </div>
                {cs.technology_types && cs.technology_types.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {cs.technology_types.slice(0, 3).map((tech, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        <Wrench className="h-3 w-3 mr-1" />
                        {tech}
                      </Badge>
                    ))}
                    {cs.technology_types.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{cs.technology_types.length - 3} más
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CaseStudiesSection;
