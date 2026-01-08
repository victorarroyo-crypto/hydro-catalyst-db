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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

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

    // Check for duplicates by name
    const { data: existing } = await supabase
      .from('scouting_queue')
      .select('id')
      .ilike('Nombre de la tecnología', technology_name.trim())
      .limit(1)

    if (existing && existing.length > 0) {
      console.log('Technology already exists in queue:', technology_name)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Esta tecnología ya existe en la cola de scouting',
          duplicate: true 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert into scouting_queue with pending status
    const { data, error } = await supabase
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
      console.error('Error inserting technology:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Technology saved successfully:', data.id)

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
