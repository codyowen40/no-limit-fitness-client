const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  throw new Error("Could not find src/App.jsx. Make sure this file is inside your project folder.");
}

const source = fs.readFileSync(appPath, "utf8");

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
  `App-before-login-step-2-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

const newLoginScreen = `
function LoginScreen() {
  return (
    <div>
      <SectionHeader
        eyebrow="Login"
        title="Authentication Later"
        description="Supabase/auth should come after the frontend structure is tested and stable. This screen is now ready for future coach and client role-based login."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
            Coach Access
          </p>

          <h3 className="mt-2 text-2xl font-black uppercase">
            Coach Login Placeholder
          </h3>

          <p className="mt-3 text-sm leading-6 text-white/65">
            Future coach login will control client management, workout plan building,
            Activity Center notifications, workout log review, and in-app messaging.
          </p>

          <div className="mt-5 space-y-3">
            <Input
              label="Coach Email Placeholder"
              value=""
              onChange={() => {}}
              placeholder="coach@example.com"
            />

            <Input
              label="Coach Password Placeholder"
              value=""
              onChange={() => {}}
              placeholder="Password handled by Supabase later"
              type="password"
            />

            <button
              type="button"
              className="w-full rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase text-black opacity-80"
            >
              Coach Login Later
            </button>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
            Client Access
          </p>

          <h3 className="mt-2 text-2xl font-black uppercase">
            Client Login Placeholder
          </h3>

          <p className="mt-3 text-sm leading-6 text-white/65">
            Future client login will open the Client Dashboard, assigned plans,
            workout tracker, messages, and progress history.
          </p>

          <div className="mt-5 space-y-3">
            <Input
              label="Client Email Placeholder"
              value=""
              onChange={() => {}}
              placeholder="client@example.com"
            />

            <Input
              label="Client Password Placeholder"
              value=""
              onChange={() => {}}
              placeholder="Password handled by Supabase later"
              type="password"
            />

            <button
              type="button"
              className="w-full rounded-full border border-[#00BF63]/40 bg-[#00BF63]/10 px-5 py-3 text-sm font-black uppercase text-[#00BF63] opacity-90"
            >
              Client Login Later
            </button>
          </div>
        </div>

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
              value="Supabase Auth later"
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
            <MiniProgram label="Database" value="Supabase later" />
            <MiniProgram label="Storage" value="Workout data moves out of localStorage later" />
            <MiniProgram label="Security" value="Role-based access later" />
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
            Supabase/auth should come after the frontend structure is tested and stable.
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

console.log("Login Step 2 installed successfully.");
console.log(`Backup saved at: ${backupPath}`);