// ⚠️⚠️⚠️ SUPABASE IS DISABLED ⚠️⚠️⚠️
//
// This FinMax application does NOT use Supabase.
// This file exists because Figma Make platform created it.
//
// SUPABASE INFO: DISABLED
// - No Supabase client
// - No Supabase authentication
// - No Supabase database
// - No edge functions
//
// Authentication: localStorage-based (see /src/app/utils/localStorage-auth.ts)
// Data Storage: localStorage only
// Backend: None needed
//
// Deployment: Static site only (dist/ folder)

export const supabaseEnabled = false;
export const supabaseUrl = '';
export const supabaseAnonKey = '';
export const supabaseClient = null;

export default {
  enabled: false,
  url: null,
  key: null,
  client: null,
  notice: "This application does not use Supabase - all data is in localStorage"
};
