import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  console.warn("Missing VITE_SUPABASE_URL in .env.local");
}

if (!supabasePublishableKey) {
  console.warn("Missing VITE_SUPABASE_PUBLISHABLE_KEY in .env.local");
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);