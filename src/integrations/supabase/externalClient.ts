/**
 * Cliente Supabase para base de datos externa
 * 
 * Este cliente conecta directamente a la BD externa de Railway/Supabase
 * donde se almacenan los datos de scouting.
 * 
 * Schema: snake_case (nombre, proveedor, status, etc.)
 */
import { createClient } from '@supabase/supabase-js';

const EXTERNAL_URL = 'https://ktzhrlcvluaptixngrsh.supabase.co';
// Using service_role key to bypass RLS on external database
const EXTERNAL_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0emhybGN2bHVhcHRpeG5ncnNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE0NjUyMCwiZXhwIjoyMDgyNzIyNTIwfQ.1tY0IDPKq4xDTwdtw7NOZPwnzy1NOVdwG9qBOGXzezk';

export const externalSupabase = createClient(EXTERNAL_URL, EXTERNAL_SERVICE_KEY);
