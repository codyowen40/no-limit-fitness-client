import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const alertToEmail = Deno.env.get("ALERT_TO_EMAIL");
  const alertFromEmail = Deno.env.get("ALERT_FROM_EMAIL");

  if (!resendApiKey) {
    return jsonResponse({ error: "Missing RESEND_API_KEY secret" }, 500);
  }

  if (!alertToEmail) {
    return jsonResponse({ error: "Missing ALERT_TO_EMAIL secret" }, 500);
  }

  if (!alertFromEmail) {
    return jsonResponse({ error: "Missing ALERT_FROM_EMAIL secret" }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = request.headers.get("Authorization") || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: "Missing Supabase function environment" }, 500);
  }

  if (!authorization) {
    return jsonResponse({ error: "Missing authorization header" }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "Unauthorized user" }, 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return jsonResponse({ error: "Profile not found" }, 403);
  }

  if (profile.role !== "coach") {
    return jsonResponse({ error: "Only coach users can send alert emails" }, 403);
  }

  const payload = await request.json().catch(() => ({}));

  const type = String(payload.type || "notification").slice(0, 80);
  const title = String(payload.title || "No Limit Fitness Alert").slice(0, 120);
  const clientName = String(payload.clientName || "Client").slice(0, 120);
  const message = String(
    payload.message || "A new app notification was created."
  ).slice(0, 1200);

  const safeType = escapeHtml(type);
  const safeTitle = escapeHtml(title);
  const safeClientName = escapeHtml(clientName);
  const safeMessage = escapeHtml(message);

  const subject = `No Limit Fitness Alert: ${title}`;

  const html = `
    <div style="font-family: Arial, sans-serif; background:#050505; color:#ffffff; padding:24px;">
      <div style="max-width:640px; margin:0 auto; border:1px solid #00BF63; border-radius:18px; padding:24px;">
        <p style="color:#00BF63; font-size:12px; letter-spacing:2px; text-transform:uppercase; font-weight:800;">
          No Limit Fitness
        </p>

        <h1 style="margin:8px 0 16px; font-size:28px; line-height:1.2;">
          ${safeTitle}
        </h1>

        <p style="margin:0 0 12px; color:#d6d6d6;">
          <strong>Type:</strong> ${safeType}
        </p>

        <p style="margin:0 0 12px; color:#d6d6d6;">
          <strong>Client:</strong> ${safeClientName}
        </p>

        <div style="margin-top:20px; background:#101010; border-radius:14px; padding:18px;">
          <p style="margin:0; color:#ffffff; line-height:1.6;">
            ${safeMessage}
          </p>
        </div>

        <p style="margin-top:24px; color:#00BF63; font-weight:800;">
          Built with structure. Backed by discipline.
        </p>
      </div>
    </div>
  `;

  const text = `No Limit Fitness Alert

Title: ${title}
Type: ${type}
Client: ${clientName}

${message}
`;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: alertFromEmail,
      to: [alertToEmail],
      subject,
      html,
      text,
    }),
  });

  const resendResult = await resendResponse.json().catch(() => ({}));

  if (!resendResponse.ok) {
    return jsonResponse(
      {
        error: "Resend email failed",
        resendStatus: resendResponse.status,
        resendResult,
      },
      502
    );
  }

  return jsonResponse({
    success: true,
    message: "Email notification sent",
    resendResult,
  });
});