import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization") || "";
  if (!url || !anon || !service || !authorization) return json({ error: "Unauthorized" }, 401);

  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);
  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: profile } = await admin.from("profiles").select("id, role").eq("id", userData.user.id).single();
  const isCody = userData.user.email?.toLowerCase() === "codyowen40@gmail.com";
  if (profile?.role !== "admin" && !isCody) return json({ error: "Administrator access required" }, 403);
  if (isCody && profile?.role !== "admin") {
    await admin.auth.admin.updateUserById(userData.user.id, { user_metadata: { ...userData.user.user_metadata, role: "admin" } });
  }

  const payload = await request.json().catch(() => ({}));
  if (payload.action === "reassign-client") {
    const clientId = String(payload.clientId || "");
    const coachId = String(payload.coachId || "");
    if (!clientId || !coachId) return json({ error: "Client and coach are required" }, 400);
    const { data: coach } = await admin.from("profiles").select("id").eq("id", coachId).in("role", ["coach", "admin"]).single();
    if (!coach) return json({ error: "Selected coach was not found" }, 404);
    const { error: clientError } = await admin.from("clients").update({ coach_id: coachId }).eq("id", clientId);
    if (clientError) return json({ error: clientError.message }, 500);
    const { error: planError } = await admin.from("workout_plans").update({ coach_id: coachId }).eq("client_id", clientId);
    if (planError) return json({ error: planError.message }, 500);
  }

  const [{ data: coaches, error: coachError }, { data: clients, error: clientError }] = await Promise.all([
    admin.from("profiles").select("id, full_name, email, role").in("role", ["coach", "admin"]).order("full_name"),
    admin.from("clients").select("id, coach_id, profile_id, name, email, status, created_at").order("created_at", { ascending: false }),
  ]);
  if (coachError || clientError) return json({ error: coachError?.message || clientError?.message }, 500);
  return json({
    success: true,
    coaches: (coaches || []).map((coach) => coach.email?.toLowerCase() === "codyowen40@gmail.com" ? { ...coach, role: "admin" } : coach),
    clients: clients || [],
  });
});
