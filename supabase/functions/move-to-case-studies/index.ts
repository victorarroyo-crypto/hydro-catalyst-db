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
    console.log('Starting migration of municipalities to case studies...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find all technologies that are municipalities/corporations/councils
    const { data: technologies, error: fetchError } = await supabase
      .from('technologies')
      .select('*')
      .or(
        'Nombre de la tecnología.ilike.%municipal%,' +
        'Nombre de la tecnología.ilike.%corporation%,' +
        'Nombre de la tecnología.ilike.%council%,' +
        'Nombre de la tecnología.ilike.%palika%,' +
        'Nombre de la tecnología.ilike.%parishad%'
      )

    if (fetchError) throw fetchError

    console.log(`Found ${technologies?.length || 0} technologies to migrate`)

    if (!technologies || technologies.length === 0) {
      return new Response(
        JSON.stringify({ success: true, migrated: 0, message: 'No technologies to migrate' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let migrated = 0
    let errors: string[] = []

    for (const tech of technologies) {
      try {
        // Determine entity type based on name
        let entityType = 'municipal'
        const name = tech['Nombre de la tecnología']?.toLowerCase() || ''
        if (name.includes('corporation')) {
          entityType = 'corporation'
        } else if (name.includes('council')) {
          entityType = 'council'
        } else if (name.includes('palika') || name.includes('parishad')) {
          entityType = 'nagar_palika'
        }

        // Create case study record
        const caseStudy = {
          name: tech['Nombre de la tecnología'],
          description: tech['Descripción técnica breve'],
          entity_type: entityType,
          country: tech['País de origen'],
          sector: tech['Sector y subsector'],
          technology_types: tech['Tipo de tecnología'] ? [tech['Tipo de tecnología']] : null,
          original_data: tech,
          source_technology_id: tech.id,
        }

        const { error: insertError } = await supabase
          .from('casos_de_estudio')
          .insert(caseStudy)

        if (insertError) {
          errors.push(`Insert error for ${tech['Nombre de la tecnología']}: ${insertError.message}`)
          continue
        }

        // Delete from technologies
        const { error: deleteError } = await supabase
          .from('technologies')
          .delete()
          .eq('id', tech.id)

        if (deleteError) {
          errors.push(`Delete error for ${tech['Nombre de la tecnología']}: ${deleteError.message}`)
          continue
        }

        migrated++
        console.log(`Migrated: ${tech['Nombre de la tecnología']}`)
      } catch (err) {
        errors.push(`Error processing ${tech['Nombre de la tecnología']}: ${err}`)
      }
    }

    console.log(`Migration complete. Migrated: ${migrated}, Errors: ${errors.length}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        migrated, 
        total: technologies.length,
        errors: errors.length > 0 ? errors : undefined 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Migration error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
