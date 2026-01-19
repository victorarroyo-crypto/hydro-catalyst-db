import React, { useState, useEffect } from 'react';
import { BookOpen, Lightbulb, Wrench, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { API_URL } from '@/lib/api';

interface CaseStudy {
  id: string;
  title: string;
  sector: string;
  summary: string;
  created_at: string;
  key_findings_count: number;
  technologies_count: number;
  total_savings_eur: number;
}

interface CaseStudiesSectionProps {
  limit?: number;
  onCaseStudyClick?: (id: string) => void;
}

const CaseStudiesSection: React.FC<CaseStudiesSectionProps> = ({ 
  limit = 5,
  onCaseStudyClick 
}) => {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/kb/case-studies?limit=${limit}`)
      .then(res => res.json())
      .then(data => {
        setCaseStudies(data.case_studies || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching case studies:', error);
        setLoading(false);
      });
  }, [limit]);

  if (loading) {
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
          <Badge variant="secondary">{caseStudies.length}</Badge>
        </CardTitle>
        <CardDescription>
          Proyectos publicados en la base de conocimiento global
        </CardDescription>
      </CardHeader>
      <CardContent>
        {caseStudies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay casos de estudio publicados aún</p>
            <p className="text-sm">Completa un diagnóstico y publícalo para crear el primero</p>
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
                    <h4 className="font-medium">{cs.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {cs.summary}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline">{cs.sector}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(cs.created_at).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-green-600">
                      €{cs.total_savings_eur.toLocaleString('es-ES')}
                    </p>
                    <p className="text-xs text-muted-foreground">ahorro potencial</p>
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center">
                    <Lightbulb className="h-3 w-3 mr-1" />
                    {cs.key_findings_count} hallazgos
                  </span>
                  <span className="flex items-center">
                    <Wrench className="h-3 w-3 mr-1" />
                    {cs.technologies_count} tecnologías
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CaseStudiesSection;
