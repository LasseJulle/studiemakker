import { createClient } from '@supabase/supabase-js';

// Vigtigt: Udskift disse med dine egne Supabase URL og Anon Key.
// I en rigtig applikation bør disse indlæses fra environment-variabler.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tdrojmgwsfjmjepxvirl.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkcm9qbWd3c2ZqbWplcHh2aXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NTg2OTgsImV4cCI6MjA3NjIzNDY5OH0.D5OO4he9jzwsYS8sjfQmG_IKclYVGJfR03F7E1QlRpU';

if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  console.warn(`
    --------------------------------------------------
    ADVARSEL: Supabase er ikke konfigureret korrekt.
    Gå til /lib/supabase/client.ts og erstat 
    'YOUR_SUPABASE_URL' og 'YOUR_SUPABASE_ANON_KEY' 
    med dine rigtige nøgler fra dit Supabase projekt.
    --------------------------------------------------
  `);
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey);
