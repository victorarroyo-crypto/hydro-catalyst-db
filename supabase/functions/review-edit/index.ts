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
    const { editId, action, reviewComments } = await req.json()

    if (!editId || !['approve', 'reject'].includes(action)) {
      throw new Error('Invalid request: editId and action (approve/reject) required')
    }

    console.log(`Processing ${action} for edit ${editId}`)

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization required')
    }

    // Internal Supabase client with service role for admin operations
    const internalUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(internalUrl, serviceKey)

    // Client with user's token to verify permissions
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
    const supabaseUser = createClient(internalUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get user info
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is supervisor or admin
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'supervisor'])
    
    if (!roles || roles.length === 0) {
      throw new Error('Only supervisors and admins can approve/reject edits')
    }

    // Get the edit proposal
    const { data: edit, error: editError } = await supabaseAdmin
      .from('technology_edits')
      .select('*')
      .eq('id', editId)
      .single()

    if (editError || !edit) {
      throw new Error('Edit not found')
    }

    if (edit.status !== 'pending') {
      throw new Error('Edit has already been processed')
    }

    const editType = edit.edit_type || 'update'
    console.log(`Edit type: ${editType}`)

    if (action === 'reject') {
      // Just update status to rejected
      const { error: updateError } = await supabaseAdmin
        .from('technology_edits')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_comments: reviewComments || null,
        })
        .eq('id', editId)

      if (updateError) throw updateError

      return new Response(
        JSON.stringify({ success: true, message: 'Edit rejected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Action is 'approve' - apply changes based on edit_type
    const proposedChanges = edit.proposed_changes as Record<string, unknown>
    const approvalDate = new Date().toISOString()

    // Get analyst name (the one who created the edit)
    const { data: analystProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', edit.created_by)
      .maybeSingle()

    // Get reviewer name (current user - admin/supervisor)
    const { data: reviewerProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle()

    // Get reviewer role
    const reviewerRole = roles[0]?.role === 'admin' ? 'Admin' : 'Supervisor'

    const analystName = analystProfile?.full_name || 'Analista'
    const reviewerName = reviewerProfile?.full_name || reviewerRole

    if (editType === 'create') {
      // Create new technology from proposal
      const estadoSeguimiento = `Propuesta por ${analystName} y aprobada por ${reviewerName} (${reviewerRole})`
      
      const { data: newTech, error: insertError } = await supabaseAdmin
        .from('technologies')
        .insert({
          ...proposedChanges,
          'Fecha de scouting': approvalDate.split('T')[0],
          'Estado del seguimiento': estadoSeguimiento,
          updated_by: edit.created_by,
          reviewer_id: user.id,
          reviewed_at: approvalDate,
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(`Failed to create technology: ${insertError.message}`)
      }

      console.log('New technology created:', newTech?.id)

      // Update the edit with the new technology_id
      await supabaseAdmin
        .from('technology_edits')
        .update({ technology_id: newTech?.id })
        .eq('id', editId)

    } else if (editType === 'classify') {
      // Apply classification
      const tipoId = proposedChanges.tipo_id as number

      const { error: classifyError } = await supabaseAdmin
        .from('technologies')
        .update({
          tipo_id: tipoId,
          updated_by: edit.created_by,
          updated_at: approvalDate,
          reviewer_id: user.id,
          reviewed_at: approvalDate,
        })
        .eq('id', edit.technology_id)

      if (classifyError) {
        throw new Error(`Failed to classify technology: ${classifyError.message}`)
      }

      console.log('Technology classified with tipo_id:', tipoId)

    } else {
      // Default 'update' type - existing behavior
      const estadoSeguimiento = `Edición revisada por ${analystName} y aprobada por ${reviewerName} (${reviewerRole})`

      const { error: localUpdateError } = await supabaseAdmin
        .from('technologies')
        .update({
          ...proposedChanges,
          'Fecha de scouting': approvalDate.split('T')[0],
          'Estado del seguimiento': estadoSeguimiento,
          updated_by: edit.created_by,
          updated_at: approvalDate,
          reviewer_id: user.id,
          reviewed_at: approvalDate,
        })
        .eq('id', edit.technology_id)

      if (localUpdateError) {
        throw new Error(`Failed to update local technology: ${localUpdateError.message}`)
      }

      console.log('Local technology updated with tracking info:', estadoSeguimiento)

      // Sync to external Supabase
      const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL')
      const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY')

      if (externalUrl && externalKey) {
        try {
          const externalSupabase = createClient(externalUrl, externalKey)

          // Get the current technology to find matching criteria
          const { data: currentTech } = await supabaseAdmin
            .from('technologies')
            .select('*')
            .eq('id', edit.technology_id)
            .single()

          if (currentTech) {
            // Sync to external DB including tracking fields
            const externalUpdate = {
              ...proposedChanges,
              'Fecha de scouting': approvalDate.split('T')[0],
              'Estado del seguimiento': estadoSeguimiento,
            }
            
            const { error: externalError } = await externalSupabase
              .from('technologies')
              .update(externalUpdate)
              .eq('"Nombre de la tecnología"', currentTech["Nombre de la tecnología"])

            if (externalError) {
              console.error('External sync error:', externalError)
            } else {
              console.log('External database synced successfully')
            }
          }
        } catch (syncError) {
          console.error('External sync failed:', syncError)
        }
      } else {
        console.log('External Supabase not configured, skipping sync')
      }
    }

    // Mark edit as approved
    const { error: approveError } = await supabaseAdmin
      .from('technology_edits')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_comments: reviewComments || null,
      })
      .eq('id', editId)

    if (approveError) throw approveError

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Edit ${editType} approved and applied successfully`,
        editType,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
