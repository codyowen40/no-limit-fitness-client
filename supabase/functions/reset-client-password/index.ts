import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"); const anon = Deno.env.get("SUPABASE_ANON_KEY"); const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization") || "";
  if (!url || !anon || !service || !authorization) return json({ error: "Unauthorized" }, 401);
  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data: userData } = await caller.auth.getUser();
  if (!userData.user) return json({ error: "Unauthorized" }, 401);
  const { data: profile } = await caller.from("profiles").select("role").eq("id", userData.user.id).single();
  if (!profile || !["coach", "admin"].includes(profile.role)) return json({ error: "Coach or admin access required" }, 403);
  const payload = await request.json().catch(() => ({})); const clientId = String(payload.clientId || ""); const password = String(payload.password || "");
  if (!clientId || password.length < 8) return json({ error: "Client and an 8-character temporary password are required" }, 400);
  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: clientRecord } = await admin.from("clients").select("profile_id, coach_id").eq("id", clientId).single();
  if (!clientRecord?.profile_id || (profile.role !== "admin" && clientRecord.coach_id !== userData.user.id)) return json({ error: "Client is not assigned to this coach" }, 403);
  const { error } = await admin.auth.admin.updateUserById(clientRecord.profile_id, { password, user_metadata: { password_reset_required: true } });
  if (error) return json({ error: error.message }, 400);
  return json({ success: true });
});
