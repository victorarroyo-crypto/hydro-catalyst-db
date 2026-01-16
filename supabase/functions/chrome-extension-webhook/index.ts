import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Usar base de datos EXTERNA (Railway) directamente
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY')
    
    if (!externalUrl || !externalKey) {
      console.error('Missing EXTERNAL_SUPABASE_URL or EXTERNAL_SUPABASE_SERVICE_KEY')
      return new Response(
        JSON.stringify({ success: false, error: 'Configuración de BD externa no disponible' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const externalSupabase = createClient(externalUrl, externalKey)

    const body = await req.json()
    console.log('Received technology from Chrome extension:', body)

    const { 
      technology_name, 
      provider, 
      url, 
      description, 
      country,
      captured_from_url 
    } = body

    // Validate required field
    if (!technology_name || technology_name.trim() === '') {
      return new Response(
        JSON.stringify({ success: false, error: 'El nombre de la tecnología es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicates in EXTERNAL DB by name
    const { data: existing } = await externalSupabase
      .from('scouting_queue')
      .select('id')
      .ilike('Nombre de la tecnología', technology_name.trim())
      .limit(1)

    if (existing && existing.length > 0) {
      console.log('Technology already exists in external queue:', technology_name)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Esta tecnología ya existe en la cola de scouting',
          duplicate: true 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert into EXTERNAL scouting_queue with pending status
    const { data, error } = await externalSupabase
      .from('scouting_queue')
      .insert({
        'Nombre de la tecnología': technology_name.trim(),
        'Proveedor / Empresa': provider?.trim() || null,
        'Web de la empresa': url?.trim() || null,
        'Descripción técnica breve': description?.trim() || null,
        'País de origen': country?.trim() || null,
        'Tipo de tecnología': 'Por clasificar',
        queue_status: 'pending',
        source: 'chrome_extension',
        source_url: captured_from_url || null,
        'Fecha de scouting': new Date().toISOString().split('T')[0],
        notes: `Capturado desde Chrome Extension el ${new Date().toLocaleString('es-ES')}`
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting technology into external DB:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Technology saved to EXTERNAL DB successfully:', data.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Tecnología guardada para revisión',
        id: data.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
