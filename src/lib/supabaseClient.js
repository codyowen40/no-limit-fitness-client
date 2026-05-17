import { createClient } from "@supabase/supabase-js";

const env = import.meta.env || {};

const supabaseUrl =
  typeof env.VITE_SUPABASE_URL === "string"
    ? env.VITE_SUPABASE_URL.trim()
    : "";

const supabasePublishableKey =
  typeof env.VITE_SUPABASE_PUBLISHABLE_KEY === "string"
    ? env.VITE_SUPABASE_PUBLISHABLE_KEY.trim()
    : "";

const supabaseAnonKey =
  typeof env.VITE_SUPABASE_ANON_KEY === "string"
    ? env.VITE_SUPABASE_ANON_KEY.trim()
    : "";

const supabaseKey = supabasePublishableKey || supabaseAnonKey;

function isValidHttpUrl(value) {
  if (!value) return false;

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export const supabaseConfigStatus = {
  hasUrl: Boolean(supabaseUrl),
  hasPublishableKey: Boolean(supabasePublishableKey),
  hasAnonKey: Boolean(supabaseAnonKey),
  hasKey: Boolean(supabaseKey),
  isUrlValid: isValidHttpUrl(supabaseUrl),
};

export const isSupabaseClientConfigured =
  supabaseConfigStatus.hasUrl &&
  supabaseConfigStatus.hasKey &&
  supabaseConfigStatus.isUrlValid;

if (!supabaseConfigStatus.hasUrl) {
  console.warn("Missing VITE_SUPABASE_URL in .env.local");
}

if (!supabaseConfigStatus.hasKey) {
  console.warn(
    "Missing VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY in .env.local"
  );
}

if (supabaseUrl && !supabaseConfigStatus.isUrlValid) {
  console.warn("VITE_SUPABASE_URL must be a valid http or https URL.");
}

export const supabase = isSupabaseClientConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;