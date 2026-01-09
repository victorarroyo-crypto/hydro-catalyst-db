import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RAILWAY_BASE_URL = 'https://watertech-scouting-production.up.railway.app/api/sync';
const RAILWAY_SYNC_SECRET = Deno.env.get('RAILWAY_SYNC_SECRET') || 'wt-sync-2026-secure';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}

async function syncToRailway(endpoint: string, data: Record<string, unknown>): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log(`Syncing to Railway: ${endpoint}`, JSON.stringify(data).substring(0, 500));
    
    const response = await fetch(`${RAILWAY_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Secret': RAILWAY_SYNC_SECRET,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Railway sync failed: ${response.status} - ${errorText}`);
      return { success: false, error: `${response.status}: ${errorText}` };
    }

    const result = await response.json();
    console.log(`Railway sync success:`, result);
    return { success: true, error: null };
  } catch (error) {
    console.error(`Railway sync error:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

function prepareTechnologyData(record: Record<string, unknown>) {
  return {
    id: record.id,
    nombre: record['Nombre de la tecnología'],
    tipo: record['Tipo de tecnología'],
    subcategoria: record['Subcategoría'],
    sector: record['Sector y subsector'],
    proveedor: record['Proveedor / Empresa'],
    pais_origen: record['País de origen'],
    paises_actua: record['Paises donde actua'],
    web: record['Web de la empresa'],
    email: record['Email de contacto'],
    descripcion: record['Descripción técnica breve'],
    aplicacion: record['Aplicación principal'],
    ventaja: record['Ventaja competitiva clave'],
    innovacion: record['Porque es innovadora'],
    trl: record['Grado de madurez (TRL)'],
    casos_referencia: record['Casos de referencia'],
    comentarios: record['Comentarios del analista'],
    fecha_scouting: record['Fecha de scouting'],
    estado: record['Estado del seguimiento'],
    subsector_industrial: record.subsector_industrial,
    status: record.status,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function prepareDocumentData(record: Record<string, unknown>) {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    file_path: record.file_path,
    file_size: record.file_size,
    mime_type: record.mime_type,
    status: record.status,
    chunk_count: record.chunk_count,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function prepareChunkData(record: Record<string, unknown>) {
  return {
    id: record.id,
    document_id: record.document_id,
    chunk_index: record.chunk_index,
    content: record.content,
    tokens: record.tokens,
    created_at: record.created_at,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    console.log(`Received webhook: ${payload.type} on ${payload.table}`);

    const { type, table, record, old_record } = payload;

    // Skip DELETE operations for now
    if (type === 'DELETE') {
      console.log('DELETE operation - skipping sync');
      return new Response(JSON.stringify({ success: true, message: 'DELETE skipped' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let syncResult: { success: boolean; error: string | null } = { success: false, error: 'Unknown table' };

    switch (table) {
      case 'technologies':
        const techData = prepareTechnologyData(record);
        syncResult = await syncToRailway('/technology', techData);
        break;

      case 'knowledge_documents':
        // Only sync when status is 'processed'
        if (record.status === 'processed') {
          const docData = prepareDocumentData(record);
          syncResult = await syncToRailway('/document', docData);
        } else {
          console.log(`Skipping document sync - status is ${record.status}, not 'processed'`);
          syncResult = { success: true, error: null };
        }
        break;

      case 'knowledge_chunks':
        const chunkData = prepareChunkData(record);
        syncResult = await syncToRailway('/chunks', chunkData);
        break;

      default:
        console.log(`Unknown table: ${table}`);
    }

    if (!syncResult.success) {
      console.error(`Sync failed for ${table}:`, syncResult.error);
      // Still return 200 to not block the trigger, but log the error
    }

    return new Response(JSON.stringify({ 
      success: syncResult.success, 
      table,
      type,
      error: syncResult.error 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sync-advisor-embeddings:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
