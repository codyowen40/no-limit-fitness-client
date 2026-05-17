const fs = require("fs");
const path = require("path");
const readline = require("readline/promises");
const { stdin: input, stdout: output } = require("process");
const { createClient } = require("@supabase/supabase-js");

function readEnvLocal() {
  const envPath = path.join(__dirname, ".env.local");

  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local was not found.");
  }

  const envText = fs.readFileSync(envPath, "utf8");
  const env = {};

  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();

    env[key] = value;
  }

  return env;
}

async function main() {
  const env = readEnvLocal();

  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabasePublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing VITE_SUPABASE_URL in .env.local");
  }

  if (!supabasePublishableKey) {
    throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY in .env.local");
  }

  const rl = readline.createInterface({ input, output });

  console.log("");
  console.log("Backend 9 Email Smoke Test");
  console.log("This signs in as coach and calls the Supabase Edge Function.");
  console.log("");

  const coachPassword = await rl.question(
    "Enter coach@nolimittest.com password: "
  );

  rl.close();

  const supabase = createClient(supabaseUrl, supabasePublishableKey);

  const { data: loginData, error: loginError } =
    await supabase.auth.signInWithPassword({
      email: "coach@nolimittest.com",
      password: coachPassword,
    });

  if (loginError) {
    throw new Error(`Coach login failed: ${loginError.message}`);
  }

  const accessToken = loginData.session?.access_token;

  if (!accessToken) {
    throw new Error("No access token returned after coach login.");
  }

  const timestamp = new Date().toLocaleString();

  const functionUrl = `${supabaseUrl}/functions/v1/send-notification-email`;

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "backend_9_email_smoke_test",
      title: "Backend 9 Email Test",
      clientName: "No Limit Fitness Test Client",
      message: `Backend 9 email notification test sent at ${timestamp}.`,
    }),
  });

  const result = await response.json().catch(() => ({}));

  await supabase.auth.signOut();

  if (!response.ok) {
    console.log("");
    console.log("Backend 9 email smoke test failed.");
    console.log("Status:", response.status);
    console.log("Result:", JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log("");
  console.log("Backend 9 email smoke test passed.");
  console.log("Result:", JSON.stringify(result, null, 2));
  console.log("");
  console.log("Now check your personal email inbox.");
}

main().catch((error) => {
  console.log("");
  console.error("Backend 9 email smoke test failed.");
  console.error(error.message || error);
  process.exit(1);
});