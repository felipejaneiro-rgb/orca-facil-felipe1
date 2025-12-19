
// Fixed: Removed failing type reference to vite/client.
// The necessary ImportMeta types are defined manually below to support environment variables.

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
