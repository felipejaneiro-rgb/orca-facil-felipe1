
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const getEnvVar = (name: string): string | undefined => {
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[name]) return metaEnv[name];
  } catch (e) {}
  try {
    const processEnv = (globalThis as any).process?.env;
    if (processEnv && processEnv[name]) return processEnv[name];
  } catch (e) {}
  return undefined;
};

const PROVIDED_URL = 'https://vteatzydoarvgjiqtvpa.supabase.co';
const PROVIDED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZWF0enlkb2FydmdqaXF0dnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjUyNjMsImV4cCI6MjA4MTQwMTI2M30.JgoBwtcu5PYt4npuWw3ScQ03L-5NIDnukQLpnuPCGzg';

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || PROVIDED_URL;
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || PROVIDED_ANON_KEY;

/**
 * CONFIGURAÇÃO DE SESSÃO: persistSession: false
 * Isso impede que o Supabase salve o token no LocalStorage.
 * O usuário SERÁ DESLOGADO ao fechar a aba ou dar F5, conforme sua regra de negócio.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: true // Necessário para o retorno do Google OAuth funcionar
  }
});
