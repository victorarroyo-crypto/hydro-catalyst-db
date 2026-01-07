import { useState } from 'react';
import { useStudyResearch, useAddResearch, ScoutingStudy, StudyResearch } from '@/hooks/useScoutingStudies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  ExternalLink,
  FileText,
  BookOpen,
  Globe,
  Newspaper,
  ScrollText,
  Star,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  studyId: string;
  study: ScoutingStudy;
}

const SOURCE_TYPES = [
  { value: 'paper', label: 'Paper Científico', icon: BookOpen },
  { value: 'report', label: 'Informe Técnico', icon: FileText },
  { value: 'article', label: 'Artículo', icon: Newspaper },
  { value: 'patent', label: 'Patente', icon: ScrollText },
  { value: 'website', label: 'Sitio Web', icon: Globe },
  { value: 'other', label: 'Otro', icon: FileText },
];

export default function StudyPhase1Research({ studyId, study }: Props) {
  const { data: research, isLoading } = useStudyResearch(studyId);
  const addResearch = useAddResearch();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newResearch, setNewResearch] = useState({
    title: '',
    source_type: 'paper' as StudyResearch['source_type'],
    source_url: '',
    authors: '',
    summary: '',
    key_findings: [''],
    relevance_score: 3,
  });

  const handleAddResearch = async () => {
    if (!newResearch.title.trim()) return;
    await addResearch.mutateAsync({
      study_id: studyId,
      ...newResearch,
      key_findings: newResearch.key_findings.filter(f => f.trim()),
    });
    setIsAddOpen(false);
    setNewResearch({
      title: '',
      source_type: 'paper',
      source_url: '',
      authors: '',
      summary: '',
      key_findings: [''],
      relevance_score: 3,
    });
  };

  const getSourceIcon = (type: string | null) => {
    const source = SOURCE_TYPES.find(s => s.value === type);
    return source?.icon ?? FileText;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Fase 1: Investigación Bibliográfica</h2>
          <p className="text-sm text-muted-foreground">
            Recopila información para caracterizar el problema y el estado del arte
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <Sparkles className="w-4 h-4 mr-2" />
            Buscar con IA
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Añadir Fuente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Añadir Fuente de Investigación</DialogTitle>
                <DialogDescription>
                  Documenta una fuente bibliográfica relevante para el estudio
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={newResearch.title}
                    onChange={(e) => setNewResearch({ ...newResearch, title: e.target.value })}
                    placeholder="Título del documento o artículo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Fuente</Label>
                    <Select
                      value={newResearch.source_type ?? 'paper'}
                      onValueChange={(value) => setNewResearch({ ...newResearch, source_type: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="w-4 h-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Relevancia (1-5)</Label>
                    <Select
                      value={String(newResearch.relevance_score)}
                      onValueChange={(value) => setNewResearch({ ...newResearch, relevance_score: Number(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(n => (
                          <SelectItem key={n} value={String(n)}>
                            {n} - {n === 1 ? 'Baja' : n === 3 ? 'Media' : n === 5 ? 'Alta' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>URL de la Fuente</Label>
                  <Input
                    value={newResearch.source_url}
                    onChange={(e) => setNewResearch({ ...newResearch, source_url: e.target.value })}
                    placeholder="https://..."
                    type="url"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Autores</Label>
                  <Input
                    value={newResearch.authors}
                    onChange={(e) => setNewResearch({ ...newResearch, authors: e.target.value })}
                    placeholder="Nombres de los autores"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resumen</Label>
                  <Textarea
                    value={newResearch.summary}
                    onChange={(e) => setNewResearch({ ...newResearch, summary: e.target.value })}
                    placeholder="Resumen del contenido relevante"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hallazgos Clave</Label>
                  {newResearch.key_findings.map((finding, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={finding}
                        onChange={(e) => {
                          const updated = [...newResearch.key_findings];
                          updated[idx] = e.target.value;
                          setNewResearch({ ...newResearch, key_findings: updated });
                        }}
                        placeholder={`Hallazgo ${idx + 1}`}
                      />
                      {idx === newResearch.key_findings.length - 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setNewResearch({
                            ...newResearch,
                            key_findings: [...newResearch.key_findings, ''],
                          })}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddResearch}
                  disabled={!newResearch.title.trim() || addResearch.isPending}
                >
                  {addResearch.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Añadir
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {research?.length === 0 ? (
        <Card className="p-8 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sin fuentes de investigación</h3>
          <p className="text-muted-foreground mb-4">
            Añade artículos, papers, informes y otras fuentes para caracterizar el problema
          </p>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Añadir Primera Fuente
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {research?.map((item) => {
            const SourceIcon = getSourceIcon(item.source_type);
            return (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <SourceIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{item.title}</CardTitle>
                        {item.authors && (
                          <CardDescription>{item.authors}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.ai_extracted && (
                        <Badge variant="secondary">
                          <Sparkles className="w-3 h-3 mr-1" />
                          IA
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < (item.relevance_score ?? 0)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-muted'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {item.summary && (
                    <p className="text-sm text-muted-foreground mb-3">{item.summary}</p>
                  )}
                  {item.key_findings && item.key_findings.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                        Hallazgos Clave
                      </h4>
                      <ul className="space-y-1">
                        {item.key_findings.map((finding, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Añadido {format(new Date(item.created_at), "d MMM yyyy", { locale: es })}
                    </span>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        Ver fuente <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
