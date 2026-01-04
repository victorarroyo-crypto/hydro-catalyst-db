import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Lightbulb, Tag, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface TechnologicalTrend {
  id: string;
  name: string;
  description: string | null;
  technology_type: string;
  subcategory: string | null;
  sector: string | null;
  created_at: string;
}

const Trends = () => {
  const { user } = useAuth();
  const [selectedTrend, setSelectedTrend] = useState<TechnologicalTrend | null>(null);

  const { data: trends, isLoading } = useQuery({
    queryKey: ['technological-trends'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technological_trends')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TechnologicalTrend[];
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tendencias Tecnológicas</h1>
          <p className="text-muted-foreground">
            Categorías y tendencias identificadas en el sector del tratamiento de agua
          </p>
        </div>
      </div>

      {trends && trends.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lightbulb className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              No hay tendencias tecnológicas registradas aún.
              <br />
              Las tecnologías que son categorías o tendencias pueden moverse aquí desde su ficha.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trends?.map((trend) => (
            <Card 
              key={trend.id} 
              className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50"
              onClick={() => setSelectedTrend(trend)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg leading-tight">{trend.name}</CardTitle>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {trend.technology_type}
                  </Badge>
                  {trend.subcategory && (
                    <Badge variant="outline" className="text-xs">
                      {trend.subcategory}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {trend.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {trend.description}
                  </p>
                )}
                {trend.sector && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Sector:</span> {trend.sector}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Trend Detail Modal */}
      <Dialog open={!!selectedTrend} onOpenChange={(open) => !open && setSelectedTrend(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTrend && (
            <>
              <DialogHeader className="pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl font-display mb-2">
                      {selectedTrend.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{selectedTrend.technology_type}</Badge>
                      {selectedTrend.subcategory && (
                        <Badge variant="outline">{selectedTrend.subcategory}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Description */}
                {selectedTrend.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Descripción
                    </h3>
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
                      {selectedTrend.description}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Classification */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Clasificación
                  </h3>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Tipo de tecnología</p>
                        <p className="text-sm">{selectedTrend.technology_type}</p>
                      </div>
                    </div>
                    {selectedTrend.subcategory && (
                      <div className="flex items-start gap-3">
                        <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Subcategoría</p>
                          <p className="text-sm">{selectedTrend.subcategory}</p>
                        </div>
                      </div>
                    )}
                    {selectedTrend.sector && (
                      <div className="flex items-start gap-3">
                        <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Sector</p>
                          <p className="text-sm">{selectedTrend.sector}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div className="text-xs text-muted-foreground pt-4 border-t flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span>Registrado: {new Date(selectedTrend.created_at).toLocaleDateString('es-ES')}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Trends;
