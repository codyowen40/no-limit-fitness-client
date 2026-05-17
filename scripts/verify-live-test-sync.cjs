const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const env = {};

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

async function main() {
  const env = {
    ...loadEnvFile(path.join(process.cwd(), ".env.local")),
    ...process.env,
  };

  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY in .env.local"
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const testId = "smoke-test-" + Date.now();

  const testPayload = {
    clients: [],
    plans: [],
    workoutLogs: [],
    messages: [],
    notifications: [],
    smokeTest: true,
    createdAt: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from("no_limit_test_portal_state")
    .upsert({
      id: testId,
      payload: testPayload,
      updated_by: "verify-live-test-sync",
      updated_at: new Date().toISOString(),
    });

  if (upsertError) {
    throw new Error("Supabase upsert failed: " + upsertError.message);
  }

  const { data, error: selectError } = await supabase
    .from("no_limit_test_portal_state")
    .select("id, payload, updated_by, updated_at")
    .eq("id", testId)
    .single();

  if (selectError) {
    throw new Error("Supabase select failed: " + selectError.message);
  }

  if (!data || data.id !== testId || !data.payload?.smokeTest) {
    throw new Error("Supabase smoke test returned unexpected data.");
  }

  console.log("Live test sync Supabase smoke test passed.");
  console.log("Table: no_limit_test_portal_state");
  console.log("Test row:", testId);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
