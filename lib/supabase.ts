import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * Helper to fetch environment variables from Vite or generic process environments.
 */
const getEnvVar = (name: string): string | undefined => {
  try {
    // Vite context
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[name]) {
      return metaEnv[name];
    }
  } catch (e) {}

  try {
    // Process context (sandboxes)
    const processEnv = (globalThis as any).process?.env;
    if (processEnv && processEnv[name]) {
      return processEnv[name];
    }
  } catch (e) {}

  return undefined;
};

// Credentials provided by the user
const PROVIDED_URL = 'https://vteatzydoarvgjiqtvpa.supabase.co';
const PROVIDED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZWF0enlkb2FydmdqaXF0dnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MjUyNjMsImV4cCI6MjA4MTQwMTI2M30.JgoBwtcu5PYt4npuWw3ScQ03L-5NIDnukQLpnuPCGzg';

// Resolve values: Environment variable takes priority, otherwise use the provided hardcoded credentials.
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || PROVIDED_URL;
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || PROVIDED_ANON_KEY;

/**
 * Initialize Supabase Client.
 * Using guaranteed fallbacks to prevent the "supabaseUrl is required" error 
 * which occurs when the URL parameter is null or empty.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
