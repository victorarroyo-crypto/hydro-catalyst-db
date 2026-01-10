import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Backoff exponencial en segundos: 1min, 5min, 15min, 1h, 4h
const RETRY_DELAYS = [60, 300, 900, 3600, 14400]

interface SyncQueueItem {
  id: string
  table_name: string
  operation: string
  record_id: string
  payload: Record<string, unknown>
  status: string
  attempts: number
  max_attempts: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('[sync-processor] Starting sync processor run')

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const railwaySyncSecret = Deno.env.get('RAILWAY_SYNC_SECRET')
    const railwayUrl = 'https://watertech-scouting-production.up.railway.app/api/sync/technology'

    if (!railwaySyncSecret) {
      throw new Error('RAILWAY_SYNC_SECRET not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Seleccionar items pendientes o fallidos listos para reintentar
    const { data: items, error: fetchError } = await supabase
      .from('sync_queue')
      .select('*')
      .or('status.eq.pending,and(status.eq.failed,next_retry_at.lte.now())')
      .lt('attempts', 5)
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      throw new Error(`Error fetching queue items: ${fetchError.message}`)
    }

    if (!items || items.length === 0) {
      console.log('[sync-processor] No items to process')
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        sent: 0,
        failed: 0,
        dead: 0,
        message: 'No items to process'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[sync-processor] Found ${items.length} items to process`)

    // 2. Marcar como 'processing'
    const itemIds = items.map((item: SyncQueueItem) => item.id)
    await supabase
      .from('sync_queue')
      .update({ status: 'processing' })
      .in('id', itemIds)

    let sent = 0
    let failed = 0
    let dead = 0
    const errors: string[] = []

    // 3. Procesar cada item
    for (const item of items as SyncQueueItem[]) {
      try {
        console.log(`[sync-processor] Processing item ${item.id}: ${item.operation} on ${item.table_name}`)

        // Enviar a Railway
        const response = await fetch(railwayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sync-Secret': railwaySyncSecret
          },
          body: JSON.stringify({
            id: item.id,
            operation: item.operation,
            table_name: item.table_name,
            record_id: item.record_id,
            payload: item.payload,
            sync_queue_id: item.id
          })
        })

        if (response.ok) {
          // Éxito: marcar como sent
          await supabase
            .from('sync_queue')
            .update({
              status: 'sent',
              processed_at: new Date().toISOString()
            })
            .eq('id', item.id)
          
          sent++
          console.log(`[sync-processor] Successfully sent item ${item.id}`)
        } else {
          const errorText = await response.text()
          throw new Error(`Railway responded with ${response.status}: ${errorText}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[sync-processor] Error processing item ${item.id}:`, errorMessage)
        
        const newAttempts = item.attempts + 1
        
        if (newAttempts >= item.max_attempts) {
          // Dead letter: máximo de intentos alcanzado
          await supabase
            .from('sync_queue')
            .update({
              status: 'dead',
              attempts: newAttempts,
              last_error: errorMessage,
              processed_at: new Date().toISOString()
            })
            .eq('id', item.id)
          
          dead++
          errors.push(`${item.id}: DEAD - ${errorMessage}`)
        } else {
          // Calcular próximo retry con backoff exponencial
          const delaySeconds = RETRY_DELAYS[Math.min(newAttempts - 1, RETRY_DELAYS.length - 1)]
          const nextRetry = new Date(Date.now() + delaySeconds * 1000)
          
          await supabase
            .from('sync_queue')
            .update({
              status: 'failed',
              attempts: newAttempts,
              last_error: errorMessage,
              next_retry_at: nextRetry.toISOString()
            })
            .eq('id', item.id)
          
          failed++
          errors.push(`${item.id}: ${errorMessage} (retry in ${delaySeconds}s)`)
        }
      }
    }

    const duration = Date.now() - startTime
    console.log(`[sync-processor] Completed in ${duration}ms: sent=${sent}, failed=${failed}, dead=${dead}`)

    return new Response(JSON.stringify({
      success: true,
      processed: items.length,
      sent,
      failed,
      dead,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: duration
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[sync-processor] Fatal error:', errorMessage)
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
