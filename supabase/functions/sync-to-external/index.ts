import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, table, record, recordId } = body

    console.log(`Syncing to external Supabase: ${action} on ${table}`)

    // External Supabase client (destination - user's original Supabase)
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY')

    if (!externalUrl || !externalKey) {
      throw new Error('External Supabase credentials not configured')
    }

    const externalSupabase = createClient(externalUrl, externalKey)

    let result

    switch (action) {
      case 'INSERT':
        const { data: insertData, error: insertError } = await externalSupabase
          .from(table)
          .insert(record)
          .select()

        if (insertError) throw insertError
        result = { action: 'INSERT', data: insertData }
        break

      case 'UPDATE':
        const { data: updateData, error: updateError } = await externalSupabase
          .from(table)
          .update(record)
          .eq('id', recordId)
          .select()

        if (updateError) throw updateError
        result = { action: 'UPDATE', data: updateData }
        break

      case 'DELETE':
        const { error: deleteError } = await externalSupabase
          .from(table)
          .delete()
          .eq('id', recordId)

        if (deleteError) throw deleteError
        result = { action: 'DELETE', id: recordId }
        break

      case 'UPSERT':
        const { data: upsertData, error: upsertError } = await externalSupabase
          .from(table)
          .upsert(record, { onConflict: 'id' })
          .select()

        if (upsertError) throw upsertError
        result = { action: 'UPSERT', data: upsertData }
        break

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    console.log('Sync successful:', result)

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Sync error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
