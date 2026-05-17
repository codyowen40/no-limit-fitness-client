const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  throw new Error("Could not find src/App.jsx. Make sure this file is inside your project folder.");
}

let source = fs.readFileSync(appPath, "utf8");

const authImport =
  'import { getCurrentSession, getCurrentProfile, signInWithEmailPassword, signOutUser } from "./lib/noLimitSupabaseApi";\n';

if (!source.includes("./lib/noLimitSupabaseApi")) {
  const importBlockMatch = source.match(/^(?:import[\s\S]*?;\r?\n)+/);

  if (!importBlockMatch) {
    throw new Error("Could not find import block at top of App.jsx.");
  }

  source =
    source.slice(0, importBlockMatch[0].length) +
    authImport +
    source.slice(importBlockMatch[0].length);
}

const startNeedle = "function LoginScreen()";
const endNeedle = "\nfunction WorkoutLogList(";

const start = source.indexOf(startNeedle);
const end = source.indexOf(endNeedle, start);

if (start === -1) {
  throw new Error("Could not find LoginScreen.");
}

if (end === -1) {
  throw new Error("Could not find WorkoutLogList after LoginScreen. No changes made.");
}

const backupPath = path.join(
  __dirname,
  "src",
  `App-before-backend-4-auth-login-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

const newLoginScreen = `
function LoginScreen() {
  const [coachEmail, setCoachEmail] = useState("coach@nolimittest.com");
  const [coachPassword, setCoachPassword] = useState("");
  const [clientEmail, setClientEmail] = useState("client@nolimittest.com");
  const [clientPassword, setClientPassword] = useState("");
  const [authStatus, setAuthStatus] = useState("No Supabase user signed in yet.");
  const [authProfile, setAuthProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  async function handleCheckSession() {
    setAuthLoading(true);
    setAuthStatus("Checking Supabase session...");

    try {
      const session = await getCurrentSession();

      if (!session?.user?.email) {
        setAuthProfile(null);
        setAuthStatus("No active Supabase session found.");
        return;
      }

      const profile = await getCurrentProfile();

      setAuthProfile(profile);
      setAuthStatus(
        "Active Supabase session found for " +
          session.user.email +
          ". Role: " +
          (profile?.role || "profile role not found")
      );
    } catch (error) {
      setAuthProfile(null);
      setAuthStatus("Supabase session check failed: " + (error.message || String(error)));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogin(event, loginType) {
    event.preventDefault();

    const email = loginType === "coach" ? coachEmail : clientEmail;
    const password = loginType === "coach" ? coachPassword : clientPassword;

    if (!email || !password) {
      setAuthStatus("Enter the " + loginType + " email and password first.");
      return;
    }

    setAuthLoading(true);
    setAuthStatus("Signing in " + loginType + " with Supabase...");

    try {
      const result = await signInWithEmailPassword(email, password);
      const profile = await getCurrentProfile();

      setAuthProfile(profile);
      setAuthStatus(
        "Signed in as " +
          (result?.user?.email || email) +
          ". Supabase role: " +
          (profile?.role || "profile role not found")
      );
    } catch (error) {
      setAuthProfile(null);
      setAuthStatus("Supabase login failed: " + (error.message || String(error)));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    setAuthLoading(true);
    setAuthStatus("Signing out of Supabase...");

    try {
      await signOutUser();
      setAuthProfile(null);
      setAuthStatus("Signed out of Supabase.");
    } catch (error) {
      setAuthStatus("Supabase sign out failed: " + (error.message || String(error)));
    } finally {
      setAuthLoading(false);
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Login"
        title="Authentication Later"
        description="Supabase Auth is now connected for testing coach and client sign-in. The main app workflow still stays localStorage-first until migration is finished."
      />

      <div className="mb-6 rounded-[1.5rem] border border-[#00BF63]/30 bg-[#00BF63]/10 p-6">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
          Backend 4 Auth
        </p>

        <h3 className="mt-2 text-2xl font-black uppercase text-white">
          Supabase Login Test Panel
        </h3>

        <p className="mt-3 text-sm font-bold leading-6 text-[#00BF63]">
          Supabase/auth should come after the frontend structure is tested and stable.
        </p>

        <p className="mt-3 text-sm leading-6 text-white/65">
          This panel tests real Supabase Auth using your test coach and client accounts.
          Do not put secret keys or service-role keys inside the React frontend.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCheckSession}
            disabled={authLoading}
            className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63] disabled:opacity-50"
          >
            Check Current Session
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={authLoading}
            className="rounded-full border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-black uppercase text-red-200 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
          >
            Sign Out
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
            Auth Status
          </p>
          <p className="mt-2 text-sm font-bold text-white/75">{authStatus}</p>

          {authProfile && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniProgram label="Profile Email" value={authProfile.email || "N/A"} />
              <MiniProgram label="Profile Name" value={authProfile.full_name || "N/A"} />
              <MiniProgram label="Profile Role" value={authProfile.role || "N/A"} />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form
          onSubmit={(event) => handleLogin(event, "coach")}
          className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6"
        >
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
            Coach Access
          </p>

          <h3 className="mt-2 text-2xl font-black uppercase">
            Coach Login
          </h3>

          <p className="mt-3 text-sm leading-6 text-white/65">
            Use the coach test account you created in Supabase Auth. This should return the coach profile role from the profiles table.
          </p>

          <div className="mt-5 space-y-3">
            <Input
              label="Coach Email"
              value={coachEmail}
              onChange={setCoachEmail}
              placeholder="coach@nolimittest.com"
            />

            <Input
              label="Coach Password"
              value={coachPassword}
              onChange={setCoachPassword}
              placeholder="Enter saved coach password"
              type="password"
            />

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-white disabled:opacity-50"
            >
              Test Supabase Coach Login
            </button>
          </div>
        </form>

        <form
          onSubmit={(event) => handleLogin(event, "client")}
          className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6"
        >
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
            Client Access
          </p>

          <h3 className="mt-2 text-2xl font-black uppercase">
            Client Login
          </h3>

          <p className="mt-3 text-sm leading-6 text-white/65">
            Use the client test account you created in Supabase Auth. This should return the client profile role from the profiles table.
          </p>

          <div className="mt-5 space-y-3">
            <Input
              label="Client Email"
              value={clientEmail}
              onChange={setClientEmail}
              placeholder="client@nolimittest.com"
            />

            <Input
              label="Client Password"
              value={clientPassword}
              onChange={setClientPassword}
              placeholder="Enter saved client password"
              type="password"
            />

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-full border border-[#00BF63]/40 bg-[#00BF63]/10 px-5 py-3 text-sm font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black disabled:opacity-50"
            >
              Test Supabase Client Login
            </button>
          </div>
        </form>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-black uppercase">
            Role-Based Screen Plan
          </h3>

          <div className="mt-4 grid gap-3">
            <MiniProgram
              label="Coach role"
              value="Dashboard, clients, plans, activity, messages"
            />

            <MiniProgram
              label="Client role"
              value="Client portal, tracker, messages, progress"
            />

            <MiniProgram
              label="Auth provider"
              value="Supabase Auth active for testing"
            />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-black uppercase">
            Supabase-Ready Structure
          </h3>

          <p className="mt-3 text-sm leading-6 text-white/65">
            Suggested backend tables later: profiles, clients, workout_plans,
            workout_days, workout_exercises, workout_logs, workout_entries,
            messages, notifications, and notification_preferences.
          </p>

          <div className="mt-4 grid gap-3">
            <MiniProgram label="Database" value="Supabase connected" />
            <MiniProgram label="Storage" value="Workout data migration comes next" />
            <MiniProgram label="Security" value="RLS policies installed" />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6 xl:col-span-2">
          <h3 className="text-xl font-black uppercase">
            Email Notification Prep
          </h3>

          <p className="mt-3 text-sm leading-6 text-white/65">
            Email alerts should not be sent directly inside App.jsx. Later, use
            a backend route or Supabase Edge Function with Resend or SendGrid
            for personal email notifications.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MiniProgram label="Recommended backend" value="Supabase" />
            <MiniProgram label="Email option 1" value="Resend" />
            <MiniProgram label="Email option 2" value="SendGrid" />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[#00BF63]/30 bg-[#00BF63]/10 p-6 xl:col-span-2">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
            Backend Rule
          </p>

          <h3 className="mt-2 text-xl font-black uppercase text-white">
            Do not send email directly inside App.jsx
          </h3>

          <p className="mt-3 text-sm font-bold leading-6 text-[#00BF63]">
            Secret keys stay out of the frontend. Email alerts should run through a backend function later.
          </p>
        </div>
      </div>
    </div>
  );
}
`;

const updated =
  source.slice(0, start) + newLoginScreen.trimStart() + "\n" + source.slice(end);

fs.writeFileSync(appPath, updated, "utf8");

console.log("Backend 4 Auth Login installed successfully.");
console.log(`Backup saved at: ${backupPath}`);