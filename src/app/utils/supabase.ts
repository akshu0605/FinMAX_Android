import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ktkanoyjdczikahzivso.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Ml_JYVVezDtIZj3U-KqrQw_j6VTFd25';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
