import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'list' | 'get' | 'update' | 'count' | 'count_by_session';
  status?: string;
  id?: string;
  updates?: Record<string, unknown>;
}

// External DB uses 'status' column, not 'queue_status'
// Status mapping for external database - maps UI filter names to external DB values
const STATUS_MAPPING: Record<string, string[]> = {
  'review': ['pending', 'new', 'reviewing', 'in_review', 'review'], // Added 'review' as possible value
  'pending_approval': ['pending_approval'],
  'approved': ['approved'],
  'rejected': ['rejected'],
  'active': ['pending', 'new', 'reviewing', 'in_review', 'review', 'pending_approval'],
};

// Map from local field names to external field names
const LOCAL_TO_EXTERNAL_FIELD: Record<string, string> = {
  'Nombre de la tecnología': 'nombre',
  'Proveedor / Empresa': 'proveedor',
  'País de origen': 'pais',
  'Web de la empresa': 'web',
  'Email de contacto': 'email',
  'Descripción técnica breve': 'descripcion',
  'Tipo de tecnología': 'tipo_sugerido',
  'Subcategoría': 'subcategoria',
  'Grado de madurez (TRL)': 'trl_estimado',
  'Ventaja competitiva clave': 'ventaja_competitiva',
  'Aplicación principal': 'aplicacion_principal',
  'Porque es innovadora': 'innovacion',
  'Casos de referencia': 'casos_referencia',
  'Paises donde actua': 'paises_actua',
  'Comentarios del analista': 'comentarios_analista',
  'Sector y subsector': 'sector',
  'queue_status': 'status',
};

// Map from external field names to local field names
const EXTERNAL_TO_LOCAL_FIELD: Record<string, string> = {
  'nombre': 'Nombre de la tecnología',
  'proveedor': 'Proveedor / Empresa',
  'pais': 'País de origen',
  'web': 'Web de la empresa',
  'email': 'Email de contacto',
  'descripcion': 'Descripción técnica breve',
  'tipo_sugerido': 'Tipo de tecnología',
  'subcategoria': 'Subcategoría',
  'subcategoria_sugerida': 'Subcategoría',
  'trl_estimado': 'Grado de madurez (TRL)',
  'ventaja_competitiva': 'Ventaja competitiva clave',
  'aplicacion_principal': 'Aplicación principal',
  'innovacion': 'Porque es innovadora',
  'casos_referencia': 'Casos de referencia',
  'paises_actua': 'Paises donde actua',
  'comentarios_analista': 'Comentarios del analista',
  'sector': 'Sector y subsector',
  'subsector': 'subsector_industrial',
  'status': 'queue_status',
  'review_notes': 'notes',
};

// Status value mapping from external to local UI values
const STATUS_VALUE_MAPPING: Record<string, string> = {
  'pending': 'review',
  'new': 'review', 
  'reviewing': 'review',
  'in_review': 'review',
  'review': 'review', // External DB may use 'review' directly
  'pending_approval': 'pending_approval',
  'approved': 'approved',
  'rejected': 'rejected',
};

// Transform external record to local format
function transformToLocal(record: Record<string, unknown>): Record<string, unknown> {
  const transformed: Record<string, unknown> = { id: record.id };
  
  for (const [extKey, localKey] of Object.entries(EXTERNAL_TO_LOCAL_FIELD)) {
    if (record[extKey] !== undefined) {
      // Special handling for status field - map values
      if (extKey === 'status') {
        const extStatus = record[extKey] as string;
        transformed[localKey] = STATUS_VALUE_MAPPING[extStatus] || extStatus;
      } else {
        transformed[localKey] = record[extKey];
      }
    }
  }
  
  // Keep timestamps
  if (record.created_at) transformed.created_at = record.created_at;
  if (record.updated_at) transformed.updated_at = record.updated_at;
  
  return transformed;
}

// Transform local updates to external format
function transformUpdatesToExternal(updates: Record<string, unknown>): Record<string, unknown> {
  const transformed: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(updates)) {
    const extKey = LOCAL_TO_EXTERNAL_FIELD[key] || key;
    transformed[extKey] = value;
  }
  
  return transformed;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get external Supabase credentials from secrets
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');

    if (!externalUrl || !externalKey) {
      throw new Error('External Supabase credentials not configured');
    }

    // Create client for external Supabase
    const externalSupabase = createClient(externalUrl, externalKey);

    const body: RequestBody = await req.json();
    const { action, status, id, updates } = body;

    console.log(`[external-scouting-queue] Action: ${action}, Status: ${status}, ID: ${id}`);

    if (action === 'list') {
      // Fetch scouting queue items from external DB
      // External DB uses 'status' column, not 'queue_status'
      let query = externalSupabase
        .from('scouting_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        const dbStatuses = STATUS_MAPPING[status] || [status];
        query = query.in('status', dbStatuses); // Use 'status' not 'queue_status'
      }

      const { data, error } = await query;

      if (error) {
        console.error('[external-scouting-queue] List error:', error);
        throw error;
      }

      // Transform data to local format
      const transformedData = (data || []).map(transformToLocal);

      return new Response(
        JSON.stringify({ success: true, data: transformedData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get' && id) {
      // Get single item from external DB
      const { data, error } = await externalSupabase
        .from('scouting_queue')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('[external-scouting-queue] Get error:', error);
        throw error;
      }

      // Transform to local format
      const transformedData = transformToLocal(data);

      return new Response(
        JSON.stringify({ success: true, data: transformedData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update' && id && updates) {
      // Transform updates to external field names
      const externalUpdates = transformUpdatesToExternal(updates);
      externalUpdates.updated_at = new Date().toISOString();
      
      console.log('[external-scouting-queue] Updating with:', externalUpdates);

      // Update item in external DB
      const { data, error } = await externalSupabase
        .from('scouting_queue')
        .update(externalUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[external-scouting-queue] Update error:', error);
        throw error;
      }

      // Transform response to local format
      const transformedData = transformToLocal(data);

      return new Response(
        JSON.stringify({ success: true, data: transformedData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'count') {
      // Get counts from external DB using 'status' column
      // External DB uses 'review' and 'pending_approval' as status values
      const [reviewRes, pendingRes] = await Promise.all([
        externalSupabase
          .from('scouting_queue')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'new', 'reviewing', 'in_review', 'review']),
        externalSupabase
          .from('scouting_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending_approval'),
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            review: reviewRes.count ?? 0,
            pending_approval: pendingRes.count ?? 0,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'count_by_session') {
      // Count technologies grouped by scouting_job_id (session_id)
      const { data, error } = await externalSupabase
        .from('scouting_queue')
        .select('scouting_job_id');

      if (error) {
        console.error('[external-scouting-queue] Count by session error:', error);
        throw error;
      }

      // Group and count by scouting_job_id
      const counts: Record<string, number> = {};
      for (const item of data || []) {
        const sessionId = item.scouting_job_id;
        if (sessionId) {
          counts[sessionId] = (counts[sessionId] || 0) + 1;
        }
      }

      return new Response(
        JSON.stringify({ success: true, data: counts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[external-scouting-queue] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
