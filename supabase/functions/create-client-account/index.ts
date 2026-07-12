import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization") || "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Missing Supabase function environment" }, 500);
  }
  if (!authorization) return json({ error: "Unauthorized" }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);

  const { data: coachProfile, error: profileError } = await callerClient
    .from("profiles")
    .select("id, role")
    .eq("id", userData.user.id)
    .single();
  if (profileError || coachProfile?.role !== "coach") {
    return json({ error: "Only authenticated coaches can create client accounts" }, 403);
  }

  const payload = await request.json().catch(() => ({}));
  const firstName = String(payload.firstName || "").trim().slice(0, 60);
  const lastName = String(payload.lastName || "").trim().slice(0, 60);
  const name = `${firstName} ${lastName}`.trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const accountRole = payload.role === "coach" ? "coach" : "client";

  if (!firstName || !lastName || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return json({ error: "Valid first name, last name, email, and an 8-character password are required" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName, full_name: name, role: accountRole },
  });
  if (createError || !created.user) {
    return json({ error: createError?.message || "Unable to create client account" }, 400);
  }

  const userId = created.user.id;
  const { error: profileInsertError } = await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: name,
    role: accountRole,
  });
  if (profileInsertError) {
    await admin.auth.admin.deleteUser(userId);
    return json({ error: "Unable to create client profile" }, 500);
  }

  if (accountRole === "coach") {
    return json({
      success: true,
      profile: { id: userId, full_name: name, email, role: accountRole },
    }, 201);
  }

  const { data: clientRecord, error: clientError } = await admin
    .from("clients")
    .insert({
      coach_id: coachProfile.id,
      profile_id: userId,
      name,
      email,
      status: "Active",
    })
    .select("id, profile_id, name, email, status")
    .single();
  if (clientError) {
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    return json({ error: "Unable to link client account to coach" }, 500);
  }

  return json({ success: true, client: clientRecord }, 201);
});
