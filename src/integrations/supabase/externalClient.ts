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
const EXTERNAL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0emhybGN2bHVhcHRpeG5ncnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM4NDcwNzMsImV4cCI6MjA0OTQyMzA3M30.7dxmKn_h1ELm7hxqBIU2WZEKquJPW2ck8pN1qNV-6DE';

export const externalSupabase = createClient(EXTERNAL_URL, EXTERNAL_ANON_KEY);
