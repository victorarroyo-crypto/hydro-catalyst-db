import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { externalSupabase } from '@/integrations/supabase/externalClient'
import { Loader2, CheckCircle, XCircle, Database, Sparkles } from 'lucide-react'

export default function AdminKBSync() {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [embeddingStatus, setEmbeddingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [syncResult, setSyncResult] = useState<Record<string, unknown> | null>(null)
  const [embeddingResult, setEmbeddingResult] = useState<Record<string, unknown> | null>(null)

  const runSyncChunks = async () => {
    setSyncStatus('loading')
    setSyncResult(null)
    
    const { data, error } = await externalSupabase.functions.invoke('sync-knowledge-chunks', {
      body: { exclude_corrupt: true }
    })
    
    if (error) {
      setSyncStatus('error')
      setSyncResult({ error: error.message })
    } else {
      setSyncStatus('success')
      setSyncResult(data)
    }
  }

  const runGenerateEmbeddings = async () => {
    setEmbeddingStatus('loading')
    setEmbeddingResult(null)
    
    const { data, error } = await externalSupabase.functions.invoke('generate-chunk-embeddings', {
      body: { batch_size: 50 }
    })
    
    if (error) {
      setEmbeddingStatus('error')
      setEmbeddingResult({ error: error.message })
    } else {
      setEmbeddingStatus('success')
      setEmbeddingResult(data)
    }
  }

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'loading') return <Loader2 className="h-5 w-5 animate-spin text-primary" />
    if (status === 'success') return <CheckCircle className="h-5 w-5 text-green-500" />
    if (status === 'error') return <XCircle className="h-5 w-5 text-destructive" />
    return null
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Database className="h-6 w-6" />
        Knowledge Base Sync
      </h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Paso 1: Sincronizar Chunks</span>
              <StatusIcon status={syncStatus} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sincroniza chunks de Lovable a BD Externa (Railway)
            </p>
            <Button 
              onClick={runSyncChunks} 
              disabled={syncStatus === 'loading'}
              className="w-full"
            >
              {syncStatus === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                'Ejecutar Sync'
              )}
            </Button>
            {syncResult && (
              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                {JSON.stringify(syncResult, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Paso 2: Generar Embeddings
              </span>
              <StatusIcon status={embeddingStatus} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Genera embeddings con OpenAI para búsqueda semántica (~5-10 min)
            </p>
            <Button 
              onClick={runGenerateEmbeddings} 
              disabled={embeddingStatus === 'loading' || syncStatus !== 'success'}
              variant={syncStatus === 'success' ? 'default' : 'secondary'}
              className="w-full"
            >
              {embeddingStatus === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                'Generar Embeddings'
              )}
            </Button>
            {syncStatus !== 'success' && (
              <p className="text-xs text-muted-foreground text-center">
                Completa el Paso 1 primero
              </p>
            )}
            {embeddingResult && (
              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                {JSON.stringify(embeddingResult, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
