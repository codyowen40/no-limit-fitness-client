const fs = require("fs");
const path = require("path");

const appPath = path.join("src", "App.jsx");
const backupPath = path.join("src", "App-before-bundle-2C.jsx");
let app = fs.readFileSync(appPath, "utf8");

if (app.includes("Bundle 2C update complete marker")) {
  console.log("Bundle 2C already appears to be installed.");
  process.exit(0);
}

fs.writeFileSync(backupPath, app, "utf8");

function mustInclude(text, label) {
  if (!app.includes(text)) throw new Error(`Could not find ${label}. Make sure src/App.jsx is your passed Bundle 2B file.`);
}
function replaceText(oldText, newText, label) {
  mustInclude(oldText, label);
  app = app.replace(oldText, newText);
}
function replaceRegex(regex, newText, label) {
  if (!regex.test(app)) throw new Error(`Could not find ${label}. Make sure src/App.jsx is your passed Bundle 2B file.`);
  app = app.replace(regex, newText);
}

replaceText(
`const getTrackingKey = (planId, dayId, exerciseId) => \`${"${planId}"}-${"${dayId}"}-${"${exerciseId}"}\`;
`,
`const getTrackingKey = (planId, dayId, exerciseId) => \`${"${planId}"}-${"${dayId}"}-${"${exerciseId}"}\`;

const defaultNotificationPreferences = {
  completedWorkout: true,
  skippedWorkout: true,
  changedValues: true,
  substitutions: true,
  workoutNotes: true,
  planAssigned: true,
  messages: true,
};

const defaultBackendSettings = {
  coachEmail: "",
  emailProvider: "Supabase + Resend",
  backendStatus: "Frontend placeholder only",
  notes: "Email alerts should be sent from a backend later. Do not send email directly inside App.jsx.",
};

function copyPlanDaysForEdit(days) {
  return days.map((day) => ({
    ...day,
    exercises: day.exercises.map((exercise) => ({ ...exercise })),
  }));
}

function clonePlanDays(days) {
  return days.map((day) => ({
    ...day,
    id: makeId("day"),
    exercises: day.exercises.map((exercise) => ({ ...exercise, id: makeId("plan-exercise") })),
  }));
}
`,
"tracking key helpers"
);

replaceText(
`    readActivityIds: [],
`,
`    readActivityIds: [],
    notificationPreferences: defaultNotificationPreferences,
    backendSettings: defaultBackendSettings,
`,
"default state fields"
);

replaceText(
`      readActivityIds: Array.isArray(parsed.readActivityIds) ? parsed.readActivityIds : [],
`,
`      readActivityIds: Array.isArray(parsed.readActivityIds) ? parsed.readActivityIds : [],
      notificationPreferences: { ...defaultNotificationPreferences, ...(parsed.notificationPreferences || {}) },
      backendSettings: { ...defaultBackendSettings, ...(parsed.backendSettings || {}) },
`,
"loaded state fields"
);

replaceText(
`  const [readActivityIds, setReadActivityIds] = useState(initialState.readActivityIds);
  const [activityFilter, setActivityFilter] = useState("All");`,
`  const [readActivityIds, setReadActivityIds] = useState(initialState.readActivityIds);
  const [activityFilter, setActivityFilter] = useState("All");
  const [notificationPreferences, setNotificationPreferences] = useState(initialState.notificationPreferences);
  const [backendSettings, setBackendSettings] = useState(initialState.backendSettings);
  const [editingPlanId, setEditingPlanId] = useState("");`,
"state fields"
);

replaceText(
`    "Local saving is active. Clients, plans, logs, skipped reasons, messages, unread indicators, activity read status, client profiles, plan details, and workout log details will stay after refresh."`,
`    "Local saving is active. Clients, plans, logs, skipped reasons, messages, unread indicators, activity read status, plan editing, notification preferences, backend placeholders, and workout log details will stay after refresh."`,
"local save message"
);

replaceText(
`    saveStateToLocalStorage({ clients, savedPlans, workoutLogs, conversations, readActivityIds });
  }, [clients, savedPlans, workoutLogs, conversations, readActivityIds]);`,
`    saveStateToLocalStorage({ clients, savedPlans, workoutLogs, conversations, readActivityIds, notificationPreferences, backendSettings });
  }, [clients, savedPlans, workoutLogs, conversations, readActivityIds, notificationPreferences, backendSettings]);`,
"localStorage effect"
);

replaceRegex(/  function savePlan\(\) \{[\s\S]*?\n  \}\n\n  function resetPlanBuilder\(\)/,
`  function savePlan() {
    const planName = planDraft.planName.trim();
    if (!planName) return setBuilderMessage("Add a plan name before saving.");
    if (!planDraft.clientId) return setBuilderMessage("Select a client before saving.");

    const assignedClient = clients.find((client) => client.id === planDraft.clientId);
    const exerciseCount = planDraft.days.reduce((total, day) => total + day.exercises.length, 0);
    if (exerciseCount === 0) return setBuilderMessage("Add at least one exercise before saving.");

    const planDays = planDraft.days.map((day) => ({
      ...day,
      name: day.name || "Unnamed Training Day",
      exercises: day.exercises.map((exercise) => ({ ...exercise })),
    }));

    if (editingPlanId) {
      const existingPlan = savedPlans.find((plan) => plan.id === editingPlanId);
      if (!existingPlan) {
        setEditingPlanId("");
        return setBuilderMessage("That saved plan no longer exists. Save it as a new plan instead.");
      }

      const updatedPlan = {
        ...existingPlan,
        planName,
        clientId: planDraft.clientId,
        clientName: assignedClient?.name || "Unassigned Client",
        updatedAt: new Date().toLocaleString(),
        updatedTimestamp: Date.now(),
        days: planDays,
      };

      setSavedPlans((current) => current.map((plan) => (plan.id === editingPlanId ? updatedPlan : plan)));
      setSelectedPlanDetailId(updatedPlan.id);
      setTrackerClientId(updatedPlan.clientId);
      setSelectedTrackerPlanId(updatedPlan.id);
      setSelectedTrackerDayId(updatedPlan.days[0]?.id || "");
      setSelectedClientProfileId(updatedPlan.clientId);
      setBuilderMessage("Plan updated locally. Tracker and plan details now use the edited version.");
      return;
    }

    const newPlan = {
      id: makeId("saved-plan"),
      planName,
      clientId: planDraft.clientId,
      clientName: assignedClient?.name || "Unassigned Client",
      createdAt: new Date().toLocaleString(),
      timestamp: Date.now(),
      days: planDays,
    };

    setSavedPlans((current) => [newPlan, ...current]);
    setSelectedPlanDetailId(newPlan.id);
    setTrackerClientId(newPlan.clientId);
    setSelectedTrackerPlanId(newPlan.id);
    setSelectedTrackerDayId(newPlan.days[0]?.id || "");
    setSelectedClientProfileId(newPlan.clientId);
    setBuilderMessage("Plan saved locally and assigned to the selected client.");
  }

  function resetPlanBuilder()`,
"savePlan function"
);

replaceText(
`    setPlanCategory("All");
    setBuilderMessage("Builder reset.");`,
`    setPlanCategory("All");
    setEditingPlanId("");
    setBuilderMessage("Builder reset.");`,
"reset builder edit clear"
);

replaceText(
`  function addClient() {`,
`  function startEditPlan(planId) {
    const plan = savedPlans.find((item) => item.id === planId);
    if (!plan) return;
    setEditingPlanId(plan.id);
    setPlanDraft({
      planName: plan.planName,
      clientId: plan.clientId,
      days: copyPlanDaysForEdit(plan.days),
    });
    setSelectedDayId(plan.days[0]?.id || "");
    setPlanExerciseSearch("");
    setPlanCategory("All");
    setSelectedPlanDetailId(plan.id);
    setActiveTab("Plans");
    setBuilderMessage(\`Editing \"\${plan.planName}\". Make changes and press Update Plan Locally.\`);
  }

  function duplicateSavedPlan(planId) {
    const plan = savedPlans.find((item) => item.id === planId);
    if (!plan) return;
    const duplicate = {
      ...plan,
      id: makeId("saved-plan"),
      planName: \`${"${plan.planName}"} Copy\`,
      createdAt: new Date().toLocaleString(),
      timestamp: Date.now(),
      updatedAt: "",
      updatedTimestamp: null,
      days: clonePlanDays(plan.days),
    };
    setSavedPlans((current) => [duplicate, ...current]);
    setSelectedPlanDetailId(duplicate.id);
    setBuilderMessage(\`Duplicated \"\${plan.planName}\" locally.\`);
  }

  function deleteSavedPlan(planId) {
    const plan = savedPlans.find((item) => item.id === planId);
    if (!plan) return;
    const remainingPlans = savedPlans.filter((item) => item.id !== planId);
    setSavedPlans(remainingPlans);
    setSelectedPlanDetailId((current) => (current === planId ? remainingPlans[0]?.id || "" : current));
    setSelectedTrackerPlanId((current) => (current === planId ? "" : current));
    if (editingPlanId === planId) setEditingPlanId("");
    setBuilderMessage(\`Deleted saved plan \"\${plan.planName}\" locally.\`);
  }

  function toggleNotificationPreference(key) {
    setNotificationPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  function updateBackendSetting(field, value) {
    setBackendSettings((current) => ({ ...current, [field]: value }));
  }

  function addClient() {`,
"plan action helpers"
);

replaceText(
`    setReadActivityIds([]);
`,
`    setReadActivityIds([]);
    setNotificationPreferences(fallback.notificationPreferences);
    setBackendSettings(fallback.backendSettings);
    setEditingPlanId("");
`,
"clear local added fields"
);

replaceText(
`              clearLocalData={clearLocalData}
            />`,
`              clearLocalData={clearLocalData}
              notificationPreferences={notificationPreferences}
              toggleNotificationPreference={toggleNotificationPreference}
              backendSettings={backendSettings}
              updateBackendSetting={updateBackendSetting}
            />`,
"HomeScreen props"
);

replaceText(
`              setSelectedPlanDetailId={setSelectedPlanDetailId}
            />`,
`              setSelectedPlanDetailId={setSelectedPlanDetailId}
              editingPlanId={editingPlanId}
              startEditPlan={startEditPlan}
              duplicateSavedPlan={duplicateSavedPlan}
              deleteSavedPlan={deleteSavedPlan}
            />`,
"PlansScreen props"
);

replaceText(
`function HomeScreen({ setActiveTab, clients, savedPlans, workoutLogs, exerciseCount, unreadCoachCount, unreadActivityCount, localSaveNotice, clearLocalData }) {`,
`function HomeScreen({ setActiveTab, clients, savedPlans, workoutLogs, exerciseCount, unreadCoachCount, unreadActivityCount, localSaveNotice, clearLocalData, notificationPreferences, toggleNotificationPreference, backendSettings, updateBackendSetting }) {`,
"HomeScreen signature"
);

replaceText(
`      </section>
    </div>
  );
}

function CoachScreen`,
`      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <NotificationPreferencesPanel preferences={notificationPreferences} onToggle={toggleNotificationPreference} />
        <BackendSettingsPanel settings={backendSettings} onChange={updateBackendSetting} />
      </section>
    </div>
  );
}

function CoachScreen`,
"home panels"
);

replaceText(
`function PlansScreen({ clients, planDraft, selectedClient, selectedDay, selectedDayId, setSelectedDayId, updatePlanField, addTrainingDay, updateTrainingDayName, removeTrainingDay, planExerciseSearch, setPlanExerciseSearch, planCategory, setPlanCategory, filteredBuilderExercises, addExerciseToSelectedDay, updatePlanExercise, removePlanExercise, savePlan, resetPlanBuilder, builderMessage, savedPlans, selectedPlanDetailId, setSelectedPlanDetailId }) {`,
`function PlansScreen({ clients, planDraft, selectedClient, selectedDay, selectedDayId, setSelectedDayId, updatePlanField, addTrainingDay, updateTrainingDayName, removeTrainingDay, planExerciseSearch, setPlanExerciseSearch, planCategory, setPlanCategory, filteredBuilderExercises, addExerciseToSelectedDay, updatePlanExercise, removePlanExercise, savePlan, resetPlanBuilder, builderMessage, savedPlans, selectedPlanDetailId, setSelectedPlanDetailId, editingPlanId, startEditPlan, duplicateSavedPlan, deleteSavedPlan }) {`,
"PlansScreen signature"
);

replaceText(
`Create a plan, select a client, build training days, add exercises from the larger general library, and program workout details.`,
`Create, edit, duplicate, and delete saved plans. Select a client, build training days, add exercises from the larger general library, and program workout details.`,
"PlanScreen header text"
);

replaceText(
`            <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={savePlan} className="flex items-center gap-2 rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-white"><Save size={17} />Save Plan Locally</button><button type="button" onClick={resetPlanBuilder} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"><X size={17} />Reset Builder</button></div>
            {builderMessage && <p className="mt-4 rounded-2xl border border-[#00BF63]/30 bg-black/50 p-3 text-sm font-bold text-[#00BF63]">{builderMessage}</p>}`,
`            {editingPlanId && <div className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm font-bold text-yellow-200">Editing saved plan mode is active. Press Update Plan Locally to save changes to the selected plan, or Reset Builder to cancel editing.</div>}
            <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={savePlan} className="flex items-center gap-2 rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-white"><Save size={17} />{editingPlanId ? "Update Plan Locally" : "Save Plan Locally"}</button><button type="button" onClick={resetPlanBuilder} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"><X size={17} />Reset Builder</button></div>
            {builderMessage && <p className="mt-4 rounded-2xl border border-[#00BF63]/30 bg-black/50 p-3 text-sm font-bold text-[#00BF63]">{builderMessage}</p>}`,
"plan save buttons"
);

replaceText(
`<SavedPlansPanel savedPlans={savedPlans} selectedPlanDetail={selectedPlanDetail} setSelectedPlanDetailId={setSelectedPlanDetailId} />`,
`<SavedPlansPanel savedPlans={savedPlans} selectedPlanDetail={selectedPlanDetail} setSelectedPlanDetailId={setSelectedPlanDetailId} startEditPlan={startEditPlan} duplicateSavedPlan={duplicateSavedPlan} deleteSavedPlan={deleteSavedPlan} />`,
"SavedPlansPanel call"
);

replaceRegex(/function SavedPlansPanel\(\{[\s\S]*?\n\}\n\nfunction PlanDetailView/,
`function SavedPlansPanel({ savedPlans, selectedPlanDetail, setSelectedPlanDetailId, startEditPlan, duplicateSavedPlan, deleteSavedPlan }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <h3 className="mb-4 text-xl font-black uppercase">Saved Local Plans</h3>
      <div className="space-y-3">
        {savedPlans.map((plan) => (
          <div key={plan.id} className={\`rounded-2xl border p-4 transition \${selectedPlanDetail?.id === plan.id ? "border-[#00BF63] bg-[#00BF63]/10" : "border-white/10 bg-black/40 hover:border-[#00BF63]/60"}\`}>
            <button type="button" onClick={() => setSelectedPlanDetailId(plan.id)} aria-label={\`Select Plan \${plan.planName}\`} className="w-full text-left">
              <p className="text-lg font-black">{plan.planName}</p>
              <p className="mt-1 text-sm text-white/60">Client: {plan.clientName}</p>
              <p className="mt-1 text-sm text-white/60">Days: {plan.days.length} • Exercises: {plan.days.reduce((total, day) => total + day.exercises.length, 0)}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-[#00BF63]">Created: {plan.createdAt}</p>
              {plan.updatedAt && <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">Updated: {plan.updatedAt}</p>}
            </button>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => startEditPlan(plan.id)} className="flex items-center gap-2 rounded-full border border-[#00BF63]/40 bg-[#00BF63]/10 px-3 py-2 text-xs font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"><ClipboardList size={14} />Edit Plan</button>
              <button type="button" onClick={() => duplicateSavedPlan(plan.id)} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"><Copy size={14} />Duplicate Plan</button>
              <button type="button" onClick={() => deleteSavedPlan(plan.id)} className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black uppercase text-red-300 transition hover:bg-red-500 hover:text-white"><Trash2 size={14} />Delete Saved Plan</button>
            </div>
          </div>
        ))}
        {savedPlans.length === 0 && <EmptyState text="No saved plans yet. Build one and save it locally." />}
      </div>
    </div>
  );
}

function PlanDetailView`,
"SavedPlansPanel function"
);

replaceText(
`<p className="mt-1 text-sm text-white/65">Assigned to {plan.clientName}</p></div>`,
`<p className="mt-1 text-sm text-white/65">Assigned to {plan.clientName}</p>{plan.updatedAt && <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-yellow-200">Updated {plan.updatedAt}</p>}</div>`,
"plan detail updated text"
);

replaceText(
`function HomeScreen(`,
`function NotificationPreferencesPanel({ preferences, onToggle }) {
  const options = [
    ["completedWorkout", "Client completed workout"],
    ["skippedWorkout", "Client skipped workout"],
    ["changedValues", "Client changed sets, reps, weight, time, or rest"],
    ["substitutions", "Client changed assigned exercise"],
    ["workoutNotes", "Client left workout note"],
    ["planAssigned", "Coach assigned new plan"],
    ["messages", "Coach/client messages"],
  ];

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 flex items-start gap-3"><Bell className="mt-1 text-[#00BF63]" /><div><h3 className="text-xl font-black uppercase">Notification Preferences</h3><p className="mt-1 text-sm leading-6 text-white/60">Placeholder controls for which in-app and future email alerts should matter. These save locally for now.</p></div></div>
      <div className="space-y-3">
        {options.map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-white/75">
            <span>{label}</span>
            <input type="checkbox" checked={Boolean(preferences[key])} onChange={() => onToggle(key)} className="h-5 w-5 accent-[#00BF63]" />
          </label>
        ))}
      </div>
    </div>
  );
}

function BackendSettingsPanel({ settings, onChange }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 flex items-start gap-3"><ShieldCheck className="mt-1 text-[#00BF63]" /><div><h3 className="text-xl font-black uppercase">Backend-Ready Settings</h3><p className="mt-1 text-sm leading-6 text-white/60">Frontend placeholder only. Later, these settings can connect to Supabase plus Resend or SendGrid for personal email alerts.</p></div></div>
      <div className="space-y-3">
        <Input label="Coach Email For Future Alerts" value={settings.coachEmail} onChange={(value) => onChange("coachEmail", value)} placeholder="your-email@example.com" />
        <Select label="Future Email Provider" value={settings.emailProvider} onChange={(value) => onChange("emailProvider", value)} options={["Supabase + Resend", "Supabase + SendGrid", "Backend undecided"].map((item) => ({ label: item, value: item }))} />
        <Input label="Backend Status" value={settings.backendStatus} onChange={(value) => onChange("backendStatus", value)} placeholder="Frontend placeholder only" />
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-100"><span className="font-black uppercase">Reminder:</span> {settings.notes}</div>
      </div>
    </div>
  );
}

function HomeScreen(`,
"notification/backend components"
);

app += "\n// Bundle 2C update complete marker\n";
fs.writeFileSync(appPath, app, "utf8");
console.log("Bundle 2C update complete.");
console.log("Backup saved at src/App-before-bundle-2C.jsx");
console.log("Updated src/App.jsx with plan edit, duplicate, delete, notification preferences, and backend placeholders.");