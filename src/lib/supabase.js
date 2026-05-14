import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '⚠️ Supabase URL ou Anon Key não configurados.\n' +
    'Crie um arquivo .env na raiz do projeto com:\n' +
    'VITE_SUPABASE_URL=https://seu-projeto.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=sua-anon-key'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
