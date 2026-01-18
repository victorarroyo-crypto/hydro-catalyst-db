import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Tag, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { TaxonomyData } from '@/hooks/useTaxonomy3Levels';

interface TaxonomyTreeViewProps {
  taxonomyData: TaxonomyData;
}

export const TaxonomyTreeView = ({ taxonomyData }: TaxonomyTreeViewProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  // Filter taxonomy based on search term
  const filteredTaxonomy = useMemo(() => {
    if (!searchTerm.trim()) return taxonomyData.taxonomy;

    const term = searchTerm.toLowerCase();
    const filtered: typeof taxonomyData.taxonomy = {};

    Object.entries(taxonomyData.taxonomy).forEach(([codigo, categoria]) => {
      // Check if category matches
      const categoryMatches = 
        codigo.toLowerCase().includes(term) || 
        categoria.nombre.toLowerCase().includes(term) ||
        categoria.descripcion?.toLowerCase().includes(term);

      // Check types and subcategories
      const matchingTypes: Record<string, string[]> = {};
      
      Object.entries(categoria.tipos).forEach(([tipo, subcategorias]) => {
        const tipoMatches = tipo.toLowerCase().includes(term);
        const matchingSubcats = subcategorias.filter(sub => 
          sub.toLowerCase().includes(term)
        );

        if (tipoMatches || matchingSubcats.length > 0) {
          matchingTypes[tipo] = tipoMatches ? subcategorias : matchingSubcats;
        }
      });

      if (categoryMatches || Object.keys(matchingTypes).length > 0) {
        filtered[codigo] = {
          ...categoria,
          tipos: Object.keys(matchingTypes).length > 0 ? matchingTypes : categoria.tipos
        };
      }
    });

    return filtered;
  }, [taxonomyData.taxonomy, searchTerm]);

  // Auto-expand when searching
  useMemo(() => {
    if (searchTerm.trim()) {
      const allCodes = new Set(Object.keys(filteredTaxonomy));
      setExpandedCategories(allCodes);
      
      const allTypeKeys = new Set<string>();
      Object.entries(filteredTaxonomy).forEach(([codigo, cat]) => {
        Object.keys(cat.tipos).forEach(tipo => {
          allTypeKeys.add(`${codigo}-${tipo}`);
        });
      });
      setExpandedTypes(allTypeKeys);
    }
  }, [filteredTaxonomy, searchTerm]);

  const toggleCategory = (codigo: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(codigo)) {
        next.delete(codigo);
      } else {
        next.add(codigo);
      }
      return next;
    });
  };

  const toggleType = (key: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allCodes = new Set(Object.keys(taxonomyData.taxonomy));
    setExpandedCategories(allCodes);
    
    const allTypeKeys = new Set<string>();
    Object.entries(taxonomyData.taxonomy).forEach(([codigo, cat]) => {
      Object.keys(cat.tipos).forEach(tipo => {
        allTypeKeys.add(`${codigo}-${tipo}`);
      });
    });
    setExpandedTypes(allTypeKeys);
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
    setExpandedTypes(new Set());
  };

  const categoryEntries = Object.entries(filteredTaxonomy);

  return (
    <div className="space-y-4">
      {/* Search and controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en taxonomía..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            Expandir todo
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            Colapsar todo
          </button>
        </div>
      </div>

      {/* Results count when searching */}
      {searchTerm && (
        <p className="text-sm text-muted-foreground">
          {categoryEntries.length} categorías encontradas
        </p>
      )}

      {/* Tree view */}
      <ScrollArea className="h-[calc(100vh-320px)] pr-4">
        <div className="space-y-2">
          {categoryEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron resultados para "{searchTerm}"
            </div>
          ) : (
            categoryEntries.map(([codigo, categoria]) => {
              const isExpanded = expandedCategories.has(codigo);
              const tiposCount = Object.keys(categoria.tipos).length;
              const subcatsCount = Object.values(categoria.tipos).flat().length;

              return (
                <Collapsible
                  key={codigo}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(codigo)}
                >
                  <CollapsibleTrigger asChild>
                    <div
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                        "hover:bg-muted/50 border border-transparent",
                        isExpanded && "bg-muted/30 border-border"
                      )}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      {isExpanded ? (
                        <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                      ) : (
                        <Folder className="h-5 w-5 text-primary shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs shrink-0">
                            {codigo}
                          </Badge>
                          <span className="font-medium truncate">{categoria.nombre}</span>
                        </div>
                        {categoria.descripcion && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {categoria.descripcion}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                        <span>{tiposCount} tipos</span>
                        <span>•</span>
                        <span>{subcatsCount} subcategorías</span>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="ml-8 mt-1 space-y-1 border-l-2 border-muted pl-4">
                      {Object.entries(categoria.tipos).map(([tipo, subcategorias]) => {
                        const typeKey = `${codigo}-${tipo}`;
                        const isTypeExpanded = expandedTypes.has(typeKey);

                        return (
                          <Collapsible
                            key={typeKey}
                            open={isTypeExpanded}
                            onOpenChange={() => toggleType(typeKey)}
                          >
                            <CollapsibleTrigger asChild>
                              <div
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                                  "hover:bg-muted/50",
                                  isTypeExpanded && "bg-muted/20"
                                )}
                              >
                                {isTypeExpanded ? (
                                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                )}
                                <Tag className="h-4 w-4 text-secondary-foreground shrink-0" />
                                <span className="text-sm flex-1">{tipo}</span>
                                <span className="text-xs text-muted-foreground">
                                  {subcategorias.length} subcategorías
                                </span>
                              </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <div className="ml-6 mt-1 mb-2 flex flex-wrap gap-1.5 pl-4 border-l border-muted">
                                {subcategorias.map((subcategoria, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-xs font-normal"
                                  >
                                    {subcategoria}
                                  </Badge>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
