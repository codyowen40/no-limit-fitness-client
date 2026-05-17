const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  throw new Error("Could not find src/App.jsx. Make sure this file is inside your project folder.");
}

let source = fs.readFileSync(appPath, "utf8");

const bridgeImport =
  'import { fetchBackendClients, fetchBackendPlans, fetchBackendWorkoutLogs, fetchBackendMessages, fetchBackendNotifications, fetchBackendNotificationPreferences, fetchBackendExerciseLibrary } from "./lib/noLimitBackendBridge";\n';

if (!source.includes("./lib/noLimitBackendBridge")) {
  const importBlockMatch = source.match(/^(?:import[\s\S]*?;\r?\n)+/);

  if (!importBlockMatch) {
    throw new Error("Could not find import block at top of App.jsx.");
  }

  source =
    source.slice(0, importBlockMatch[0].length) +
    bridgeImport +
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
  `App-before-backend-7-sync-panel-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

const newLoginAndSyncPanel = `
function BackendSyncPanel() {
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState(
    "Backend sync has not been loaded yet."
  );
  const [backendSnapshot, setBackendSnapshot] = useState(null);

  async function handleLoadBackendData() {
    setBackendLoading(true);
    setBackendStatus("Loading Supabase backend data...");

    try {
      const [
        exercises,
        clients,
        plans,
        workoutLogs,
        messages,
        notifications,
        preferences,
      ] = await Promise.all([
        fetchBackendExerciseLibrary(),
        fetchBackendClients(),
        fetchBackendPlans(),
        fetchBackendWorkoutLogs(),
        fetchBackendMessages(),
        fetchBackendNotifications(),
        fetchBackendNotificationPreferences(),
      ]);

      setBackendSnapshot({
        exercises,
        clients,
        plans,
        workoutLogs,
        messages,
        notifications,
        preferences,
      });

      setBackendStatus(
        "Backend data loaded successfully. LocalStorage is still the safe app workflow."
      );
    } catch (error) {
      setBackendSnapshot(null);
      setBackendStatus(
        "Backend sync failed: " + (error.message || String(error))
      );
    } finally {
      setBackendLoading(false);
    }
  }

  const exercises = backendSnapshot?.exercises || [];
  const clients = backendSnapshot?.clients || [];
  const plans = backendSnapshot?.plans || [];
  const workoutLogs = backendSnapshot?.workoutLogs || [];
  const messages = backendSnapshot?.messages || [];
  const notifications = backendSnapshot?.notifications || [];
  const preferences = backendSnapshot?.preferences || null;

  const latestPlan = plans[0] || null;
  const latestWorkoutLog = workoutLogs[0] || null;
  const latestMessage = messages[messages.length - 1] || null;
  const latestNotification = notifications[0] || null;

  return (
    <div className="mt-6 rounded-[1.5rem] border border-[#00BF63]/30 bg-[#00BF63]/10 p-6">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
        Backend 7 Sync Panel
      </p>

      <h3 className="mt-2 text-2xl font-black uppercase text-white">
        Supabase Data Bridge Preview
      </h3>

      <p className="mt-3 text-sm leading-6 text-white/65">
        This panel reads real Supabase data through the backend bridge, but it does not replace your localStorage app flow yet.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleLoadBackendData}
          disabled={backendLoading}
          className="rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-white disabled:opacity-50"
        >
          Load Backend Data
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
          Backend Status
        </p>

        <p className="mt-2 text-sm font-bold text-white/75">
          {backendStatus}
        </p>
      </div>

      {backendSnapshot && (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard label="Backend Exercises" value={exercises.length} />
            <StatCard label="Backend Clients" value={clients.length} />
            <StatCard label="Backend Plans" value={plans.length} />
            <StatCard label="Backend Logs" value={workoutLogs.length} />
            <StatCard label="Backend Messages" value={messages.length} />
            <StatCard label="Backend Alerts" value={notifications.length} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/40 p-5">
              <h4 className="text-xl font-black uppercase">
                Backend Clients Preview
              </h4>

              {clients.length === 0 ? (
                <p className="mt-3 text-sm font-bold text-white/55">
                  No backend clients visible. Sign in as coach, then load again.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {clients.slice(0, 5).map((client) => (
                    <div
                      key={client.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <p className="font-black text-white">{client.name}</p>
                      <p className="mt-1 text-sm text-white/55">{client.email}</p>
                      <p className="mt-2 text-xs font-black uppercase tracking-wide text-[#00BF63]">
                        {client.status}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-black/40 p-5">
              <h4 className="text-xl font-black uppercase">
                Backend Exercise Library Preview
              </h4>

              {exercises.length === 0 ? (
                <p className="mt-3 text-sm font-bold text-white/55">
                  No backend exercises loaded.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {exercises.slice(0, 6).map((exercise) => (
                    <div
                      key={exercise.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <p className="font-black text-white">{exercise.name}</p>
                      <p className="mt-1 text-sm text-white/55">
                        {exercise.musclesWorked}
                      </p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#00BF63]">
                        {exercise.categories.join(" / ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-black/40 p-5">
              <h4 className="text-xl font-black uppercase">
                Latest Backend Plan
              </h4>

              {latestPlan ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-black text-white">{latestPlan.planName}</p>
                  <p className="mt-1 text-sm text-white/55">
                    Client: {latestPlan.clientName || "N/A"}
                  </p>
                  <p className="mt-1 text-sm text-white/55">
                    Days: {latestPlan.days.length}
                  </p>

                  {latestPlan.days[0]?.exercises?.[0] && (
                    <p className="mt-3 rounded-xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-3 text-sm font-bold text-[#00BF63]">
                      First exercise: {latestPlan.days[0].exercises[0].exerciseName}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm font-bold text-white/55">
                  No backend plans visible yet.
                </p>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-black/40 p-5">
              <h4 className="text-xl font-black uppercase">
                Latest Backend Workout Log
              </h4>

              {latestWorkoutLog ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-black text-white">{latestWorkoutLog.planName}</p>
                  <p className="mt-1 text-sm text-white/55">
                    Client: {latestWorkoutLog.clientName || "N/A"}
                  </p>
                  <p className="mt-1 text-sm text-white/55">
                    Status: {latestWorkoutLog.status}
                  </p>

                  {latestWorkoutLog.entries[0] && (
                    <p className="mt-3 rounded-xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-3 text-sm font-bold text-[#00BF63]">
                      Latest entry: {latestWorkoutLog.entries[0].exerciseName} / {latestWorkoutLog.entries[0].actualWeight || "N/A"}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm font-bold text-white/55">
                  No backend workout logs visible yet.
                </p>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-black/40 p-5">
              <h4 className="text-xl font-black uppercase">
                Backend Messages Preview
              </h4>

              {latestMessage ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-black text-[#00BF63]">
                    {latestMessage.sender}
                  </p>
                  <p className="mt-2 text-sm text-white/70">{latestMessage.body}</p>
                  <p className="mt-2 text-xs text-white/40">{latestMessage.sentAt}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm font-bold text-white/55">
                  No backend messages visible yet.
                </p>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-black/40 p-5">
              <h4 className="text-xl font-black uppercase">
                Backend Notifications Preview
              </h4>

              {latestNotification ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-black text-white">{latestNotification.title}</p>
                  <p className="mt-2 text-sm text-white/70">{latestNotification.body}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-wide text-[#00BF63]">
                    {latestNotification.type}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm font-bold text-white/55">
                  No backend notifications visible yet.
                </p>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-black/40 p-5 xl:col-span-2">
              <h4 className="text-xl font-black uppercase">
                Backend Notification Preferences
              </h4>

              {preferences ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <MiniProgram
                    label="Coach Email"
                    value={preferences.coachEmail || "N/A"}
                  />
                  <MiniProgram
                    label="Email Provider"
                    value={preferences.futureEmailProvider || "N/A"}
                  />
                  <MiniProgram
                    label="Backend Status"
                    value={preferences.backendStatus || "N/A"}
                  />
                </div>
              ) : (
                <p className="mt-3 text-sm font-bold text-white/55">
                  No backend notification preferences visible. Coach login may be required.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
        description="Supabase Auth is connected for coach and client sign-in testing. The main app workflow still stays localStorage-first until migration is finished."
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

      <BackendSyncPanel />
    </div>
  );
}
`;

const updated =
  source.slice(0, start) + newLoginAndSyncPanel.trimStart() + "\n" + source.slice(end);

fs.writeFileSync(appPath, updated, "utf8");

console.log("Backend 7 Sync Panel installed successfully.");
console.log(`Backup saved at: ${backupPath}`);