import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Lightbulb } from "lucide-react";

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
            <Card key={trend.id} className="hover:shadow-md transition-shadow">
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
    </div>
  );
};

export default Trends;
