const fs = require("fs");
const path = require("path");
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

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex === -1) {
      continue;
    }

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

  const supabase = createClient(supabaseUrl, supabasePublishableKey);

  const { data, error, count } = await supabase
    .from("exercise_library")
    .select("id,name,categories,muscles_worked,equipment", { count: "exact" })
    .order("name", { ascending: true })
    .limit(5);

  if (error) {
    throw error;
  }

  console.log("Backend smoke test passed.");
  console.log(`Exercise library visible from local app: ${count || data.length} exercises`);
  console.log("First few exercises:");

  for (const exercise of data) {
    console.log(`- ${exercise.name}`);
  }
}

main().catch((error) => {
  console.error("Backend smoke test failed.");
  console.error(error.message || error);
  process.exit(1);
});