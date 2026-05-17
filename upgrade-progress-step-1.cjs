const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  throw new Error("Could not find src/App.jsx. Make sure this file is inside your project folder.");
}

const source = fs.readFileSync(appPath, "utf8");

const startNeedle = "function ProgressScreen(";
const endNeedle = "\nfunction LoginScreen()";

const start = source.indexOf(startNeedle);
const end = source.indexOf(endNeedle, start);

if (start === -1) {
  throw new Error("Could not find ProgressScreen.");
}

if (end === -1) {
  throw new Error("Could not find LoginScreen after ProgressScreen. No changes made.");
}

const backupPath = path.join(
  __dirname,
  "src",
  `App-before-progress-step-1-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

const newProgressScreen = `
function ProgressScreen({
  savedPlans,
  workoutLogs,
  selectedWorkoutLogId,
  setSelectedWorkoutLogId,
  deleteWorkoutLog,
}) {
  const completedLogs = workoutLogs.filter((log) => log.status === "completed");
  const skippedLogs = workoutLogs.filter((log) => log.status === "skipped");

  const selectedWorkoutLog =
    workoutLogs.find((log) => log.id === selectedWorkoutLogId) ||
    workoutLogs[0] ||
    null;

  const trackedEntries = workoutLogs.flatMap((log) =>
    (log.entries || []).map((entry) => ({
      ...entry,
      logId: log.id,
      clientName: log.clientName,
      planName: log.planName,
      dayName: log.dayName,
      status: log.status,
      submittedAt: log.submittedAt,
      timestamp: log.timestamp || 0,
    }))
  );

  const substitutions = trackedEntries.filter((entry) => entry.substitution);
  const notes = trackedEntries.filter((entry) => entry.notes);

  const completionRate =
    workoutLogs.length === 0
      ? 0
      : Math.round((completedLogs.length / workoutLogs.length) * 100);

  const clientNames = Array.from(
    new Set([
      ...savedPlans.map((plan) => plan.clientName),
      ...workoutLogs.map((log) => log.clientName),
    ])
  ).filter(Boolean);

  const clientStats = clientNames.map((clientName) => {
    const clientPlans = savedPlans.filter((plan) => plan.clientName === clientName);
    const clientLogs = workoutLogs.filter((log) => log.clientName === clientName);
    const clientCompleted = clientLogs.filter((log) => log.status === "completed");
    const clientSkipped = clientLogs.filter((log) => log.status === "skipped");

    const rate =
      clientLogs.length === 0
        ? 0
        : Math.round((clientCompleted.length / clientLogs.length) * 100);

    return {
      clientName,
      plans: clientPlans.length,
      logs: clientLogs.length,
      completed: clientCompleted.length,
      skipped: clientSkipped.length,
      rate,
    };
  });

  const recentExerciseHistory = [...trackedEntries].sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
  );

  return (
    <div>
      <SectionHeader
        eyebrow="Progress"
        title="Tracking Comes Next"
        description="This screen now summarizes progress, client consistency, exercise history, completed workouts, skipped workouts, substitutions, and detailed workout logs."
      />

      <div className="mb-6 rounded-[1.5rem] border border-[#00BF63]/30 bg-[#00BF63]/10 p-5">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
          Frontend Step 1 Complete
        </p>
        <h3 className="mt-2 text-2xl font-black uppercase text-white">
          Progress Dashboard
        </h3>
        <p className="mt-2 text-sm font-bold leading-6 text-white/65">
          Local React state and localStorage are still powering this screen. Backend progress tables can come later after the frontend is stable.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Saved Plans" value={savedPlans.length} />
        <StatCard label="Workout Logs" value={workoutLogs.length} />
        <StatCard label="Completed" value={completedLogs.length} />
        <StatCard label="Skipped" value={skippedLogs.length} />
        <StatCard label="Completion Rate" value={String(completionRate) + "%"} />
        <StatCard label="Substitutions" value={substitutions.length} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="text-xl font-black uppercase">Progress Summary</h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                Workout notes logged
              </p>
              <p className="mt-2 text-2xl font-black text-[#00BF63]">
                {notes.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                Exercise entries tracked
              </p>
              <p className="mt-2 text-2xl font-black text-[#00BF63]">
                {trackedEntries.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                Completed sessions
              </p>
              <p className="mt-2 text-2xl font-black text-[#00BF63]">
                {completedLogs.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                Skipped sessions
              </p>
              <p className="mt-2 text-2xl font-black text-[#00BF63]">
                {skippedLogs.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="text-xl font-black uppercase">Client Consistency Stats</h3>

          {clientStats.length === 0 ? (
            <div className="mt-4">
              <EmptyState text="Create clients, assign plans, and log workouts to see consistency stats." />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {clientStats.map((client) => (
                <div
                  key={client.clientName}
                  className="rounded-2xl border border-white/10 bg-black/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black uppercase">{client.clientName}</p>
                      <p className="mt-1 text-sm text-white/55">
                        {client.plans} plan(s) / {client.logs} workout log(s)
                      </p>
                    </div>

                    <span className="rounded-full bg-[#00BF63]/15 px-3 py-1 text-xs font-black uppercase text-[#00BF63]">
                      {client.rate}% complete
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs font-black uppercase text-white/40">Completed</p>
                      <p className="mt-1 text-lg font-black text-white">{client.completed}</p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs font-black uppercase text-white/40">Skipped</p>
                      <p className="mt-1 text-lg font-black text-white">{client.skipped}</p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs font-black uppercase text-white/40">Plans</p>
                      <p className="mt-1 text-lg font-black text-white">{client.plans}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <h3 className="text-xl font-black uppercase">Exercise History</h3>

        {recentExerciseHistory.length === 0 ? (
          <div className="mt-4">
            <EmptyState text="Exercise history will show after a client completes or skips a workout." />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {recentExerciseHistory.slice(0, 10).map((entry, index) => (
              <div
                key={entry.logId + "-" + entry.exerciseId + "-" + index}
                className="rounded-2xl border border-white/10 bg-black/40 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-black uppercase">{entry.exerciseName}</p>
                    <p className="mt-1 text-sm text-white/55">
                      {entry.clientName} / {entry.planName} / {entry.dayName}
                    </p>
                  </div>

                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase text-white/70">
                    {entry.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-white/65 sm:grid-cols-2">
                  <p>Actual Weight Used: {entry.actualWeight || "N/A"}</p>
                  <p>Sets Completed: {entry.setsCompleted || "N/A"}</p>
                  <p>Reps Completed: {entry.repsCompleted || "N/A"}</p>
                  <p>Time Completed: {entry.timeCompleted || "N/A"}</p>
                  <p>Actual Rest Used: {entry.restUsed || "N/A"}</p>
                  <p>Submitted: {entry.submittedAt || "N/A"}</p>
                </div>

                {entry.substitution && (
                  <p className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm font-bold text-yellow-200">
                    Exercise Substitution: {entry.substitution}
                  </p>
                )}

                {entry.notes && (
                  <p className="mt-3 rounded-xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-3 text-sm font-bold text-[#00BF63]">
                    Client Notes: {entry.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="text-xl font-black uppercase">Recent Workout Logs</h3>

          <div className="mt-4">
            <WorkoutLogList
              logs={workoutLogs.slice(0, 8)}
              selectedLogId={selectedWorkoutLog?.id}
              onSelect={setSelectedWorkoutLogId}
              onDelete={deleteWorkoutLog}
            />

            {workoutLogs.length === 0 && (
              <EmptyState text="No workout logs yet. Complete or skip a workout in the Tracker tab." />
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-xl font-black uppercase">Workout Log Details</h3>
          <WorkoutLogDetails log={selectedWorkoutLog} onDelete={deleteWorkoutLog} />
        </div>
      </div>
    </div>
  );
}
`;

const updated =
  source.slice(0, start) + newProgressScreen.trimStart() + "\n" + source.slice(end);

fs.writeFileSync(appPath, updated, "utf8");

console.log("Progress Step 1 installed successfully.");
console.log(`Backup saved at: ${backupPath}`);