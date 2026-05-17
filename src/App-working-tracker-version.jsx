import { useMemo, useState } from "react";
import {
  Activity,
  Bell,
  CheckCircle,
  ClipboardList,
  Dumbbell,
  Home,
  LogIn,
  MessageSquare,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

const exerciseCategories = [
  "All",
  "Bodybuilding",
  "Calisthenics",
  "Conditioning",
  "CrossFit",
  "Mobility",
  "Olympic Weightlifting",
  "Powerlifting",
  "Sports Performance",
  "Strongman",
];

const exerciseLibrary = [
  {
    name: "Ab Wheel Rollout",
    categories: ["Calisthenics", "Bodybuilding", "Sports Performance"],
    muscles: "Abs, lats, shoulders, hip flexors",
    equipment: "Ab wheel",
  },
  {
    name: "Back Squat",
    categories: ["Powerlifting", "Bodybuilding", "Sports Performance", "CrossFit"],
    muscles: "Quads, glutes, hamstrings, core, upper back",
    equipment: "Barbell, rack, plates",
  },
  {
    name: "Barbell Bench Press",
    categories: ["Powerlifting", "Bodybuilding", "Sports Performance"],
    muscles: "Chest, triceps, front delts",
    equipment: "Barbell, bench, plates",
  },
  {
    name: "Barbell Curl",
    categories: ["Bodybuilding"],
    muscles: "Biceps, forearms",
    equipment: "Barbell or EZ bar",
  },
  {
    name: "Barbell Row",
    categories: ["Bodybuilding", "Powerlifting", "Sports Performance"],
    muscles: "Lats, upper back, rear delts, biceps",
    equipment: "Barbell, plates",
  },
  {
    name: "Battle Rope Waves",
    categories: ["Conditioning", "CrossFit", "Sports Performance"],
    muscles: "Shoulders, arms, upper back, core",
    equipment: "Battle ropes",
  },
  {
    name: "Box Jump",
    categories: ["CrossFit", "Conditioning", "Sports Performance"],
    muscles: "Quads, glutes, calves, hamstrings",
    equipment: "Plyo box",
  },
  {
    name: "Bulgarian Split Squat",
    categories: ["Bodybuilding", "Sports Performance", "Mobility"],
    muscles: "Quads, glutes, hamstrings, calves",
    equipment: "Bench, dumbbells optional",
  },
  {
    name: "Burpee",
    categories: ["Calisthenics", "Conditioning", "CrossFit"],
    muscles: "Full body, chest, legs, shoulders, core",
    equipment: "Bodyweight",
  },
  {
    name: "Clean and Jerk",
    categories: ["Olympic Weightlifting", "CrossFit", "Sports Performance"],
    muscles: "Full body, quads, glutes, traps, shoulders",
    equipment: "Barbell, plates",
  },
  {
    name: "Deadlift",
    categories: ["Powerlifting", "Strongman", "Bodybuilding", "Sports Performance"],
    muscles: "Glutes, hamstrings, back, traps, grip",
    equipment: "Barbell, plates",
  },
  {
    name: "Dumbbell Bench Press",
    categories: ["Bodybuilding", "Sports Performance"],
    muscles: "Chest, triceps, front delts",
    equipment: "Dumbbells, bench",
  },
  {
    name: "Dumbbell Lateral Raise",
    categories: ["Bodybuilding"],
    muscles: "Side delts, traps",
    equipment: "Dumbbells",
  },
  {
    name: "Farmer Carry",
    categories: ["Strongman", "Conditioning", "Sports Performance", "CrossFit"],
    muscles: "Grip, traps, core, legs, upper back",
    equipment: "Dumbbells, kettlebells, farmer handles",
  },
  {
    name: "Front Squat",
    categories: ["Olympic Weightlifting", "CrossFit", "Sports Performance", "Bodybuilding"],
    muscles: "Quads, glutes, upper back, core",
    equipment: "Barbell, rack, plates",
  },
  {
    name: "Goblet Squat",
    categories: ["Bodybuilding", "Mobility", "Sports Performance"],
    muscles: "Quads, glutes, hamstrings, core",
    equipment: "Dumbbell or kettlebell",
  },
  {
    name: "Hamstring Curl",
    categories: ["Bodybuilding", "Sports Performance"],
    muscles: "Hamstrings, calves",
    equipment: "Machine or bands",
  },
  {
    name: "Hip Thrust",
    categories: ["Bodybuilding", "Sports Performance", "Powerlifting"],
    muscles: "Glutes, hamstrings, core",
    equipment: "Barbell, bench, pads",
  },
  {
    name: "Incline Dumbbell Press",
    categories: ["Bodybuilding", "Sports Performance"],
    muscles: "Upper chest, triceps, front delts",
    equipment: "Dumbbells, incline bench",
  },
  {
    name: "Kettlebell Swing",
    categories: ["Conditioning", "CrossFit", "Sports Performance"],
    muscles: "Glutes, hamstrings, back, core",
    equipment: "Kettlebell",
  },
  {
    name: "Lat Pulldown",
    categories: ["Bodybuilding"],
    muscles: "Lats, biceps, upper back",
    equipment: "Cable machine",
  },
  {
    name: "Leg Press",
    categories: ["Bodybuilding", "Sports Performance"],
    muscles: "Quads, glutes, hamstrings",
    equipment: "Leg press machine",
  },
  {
    name: "Lunge",
    categories: ["Bodybuilding", "Calisthenics", "Sports Performance", "Mobility"],
    muscles: "Quads, glutes, hamstrings, calves",
    equipment: "Bodyweight, dumbbells optional",
  },
  {
    name: "Medicine Ball Slam",
    categories: ["Conditioning", "CrossFit", "Sports Performance"],
    muscles: "Shoulders, lats, abs, hips",
    equipment: "Medicine ball",
  },
  {
    name: "Overhead Press",
    categories: ["Powerlifting", "Strongman", "Bodybuilding", "Sports Performance"],
    muscles: "Shoulders, triceps, upper chest, core",
    equipment: "Barbell, rack, plates",
  },
  {
    name: "Plank",
    categories: ["Calisthenics", "Mobility", "Sports Performance"],
    muscles: "Abs, shoulders, glutes, lower back",
    equipment: "Bodyweight",
  },
  {
    name: "Pull-Up",
    categories: ["Calisthenics", "Bodybuilding", "CrossFit", "Sports Performance"],
    muscles: "Lats, biceps, upper back, core",
    equipment: "Pull-up bar",
  },
  {
    name: "Push-Up",
    categories: ["Calisthenics", "Conditioning", "Sports Performance"],
    muscles: "Chest, triceps, shoulders, core",
    equipment: "Bodyweight",
  },
  {
    name: "Romanian Deadlift",
    categories: ["Bodybuilding", "Powerlifting", "Sports Performance"],
    muscles: "Hamstrings, glutes, lower back",
    equipment: "Barbell or dumbbells",
  },
  {
    name: "Row Erg",
    categories: ["Conditioning", "CrossFit", "Sports Performance"],
    muscles: "Legs, back, arms, core",
    equipment: "Rowing machine",
  },
  {
    name: "Sandbag Carry",
    categories: ["Strongman", "Conditioning", "Sports Performance", "CrossFit"],
    muscles: "Full body, core, traps, legs, grip",
    equipment: "Sandbag",
  },
  {
    name: "Seated Cable Row",
    categories: ["Bodybuilding"],
    muscles: "Lats, upper back, rear delts, biceps",
    equipment: "Cable machine",
  },
  {
    name: "Sled Push",
    categories: ["Conditioning", "Strongman", "Sports Performance"],
    muscles: "Quads, glutes, calves, core",
    equipment: "Sled, turf",
  },
  {
    name: "Snatch",
    categories: ["Olympic Weightlifting", "CrossFit", "Sports Performance"],
    muscles: "Full body, traps, shoulders, legs, core",
    equipment: "Barbell, plates",
  },
  {
    name: "Sprint",
    categories: ["Conditioning", "Sports Performance"],
    muscles: "Glutes, hamstrings, quads, calves",
    equipment: "Track, turf, open space",
  },
  {
    name: "Trap Bar Deadlift",
    categories: ["Strongman", "Powerlifting", "Sports Performance", "Bodybuilding"],
    muscles: "Glutes, quads, hamstrings, back, traps",
    equipment: "Trap bar, plates",
  },
  {
    name: "Turkish Get-Up",
    categories: ["Mobility", "Sports Performance", "Conditioning"],
    muscles: "Shoulders, core, hips, glutes",
    equipment: "Kettlebell or dumbbell",
  },
  {
    name: "Wall Ball",
    categories: ["CrossFit", "Conditioning", "Sports Performance"],
    muscles: "Quads, glutes, shoulders, triceps, core",
    equipment: "Medicine ball, wall target",
  },
].sort((a, b) => a.name.localeCompare(b.name));

const starterClients = [
  {
    id: "client-1",
    name: "Sample Client",
    email: "client@example.com",
    status: "Active",
  },
  {
    id: "client-2",
    name: "Athlete Demo",
    email: "athlete@example.com",
    status: "Active",
  },
];

const emptyTrackingEntry = {
  actualWeight: "",
  setsCompleted: "",
  repsCompleted: "",
  timeCompleted: "",
  restUsed: "",
  substitution: "",
  notes: "",
};

const makeId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getTrackingKey = (planId, dayId, exerciseId) =>
  `${planId}-${dayId}-${exerciseId}`;

export default function App() {
  const tabs = [
    { id: "Home", icon: Home },
    { id: "Coach", icon: ShieldCheck },
    { id: "Clients", icon: Users },
    { id: "Plans", icon: ClipboardList },
    { id: "Tracker", icon: CheckCircle },
    { id: "Exercises", icon: Dumbbell },
    { id: "Progress", icon: TrendingUp },
    { id: "Login", icon: LogIn },
  ];

  const [activeTab, setActiveTab] = useState("Home");

  const [clients, setClients] = useState(starterClients);
  const [clientForm, setClientForm] = useState({ name: "", email: "" });

  const [savedPlans, setSavedPlans] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);

  const [trackerClientId, setTrackerClientId] = useState(starterClients[0]?.id || "");
  const [selectedTrackerPlanId, setSelectedTrackerPlanId] = useState("");
  const [selectedTrackerDayId, setSelectedTrackerDayId] = useState("");
  const [trackingDrafts, setTrackingDrafts] = useState({});
  const [trackerMessage, setTrackerMessage] = useState("");

  const [planDraft, setPlanDraft] = useState({
    planName: "",
    clientId: starterClients[0]?.id || "",
    days: [
      {
        id: makeId("day"),
        name: "Day 1 - Upper Body",
        exercises: [],
      },
    ],
  });

  const [selectedDayId, setSelectedDayId] = useState(planDraft.days[0].id);
  const [planExerciseSearch, setPlanExerciseSearch] = useState("");
  const [planCategory, setPlanCategory] = useState("All");
  const [builderMessage, setBuilderMessage] = useState("");

  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategory, setLibraryCategory] = useState("All");

  const selectedClient = clients.find((client) => client.id === planDraft.clientId);
  const selectedDay =
    planDraft.days.find((day) => day.id === selectedDayId) || planDraft.days[0];

  const filteredLibraryExercises = useMemo(() => {
    return exerciseLibrary.filter((exercise) => {
      const matchesSearch =
        exercise.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
        exercise.muscles.toLowerCase().includes(librarySearch.toLowerCase()) ||
        exercise.equipment.toLowerCase().includes(librarySearch.toLowerCase());

      const matchesCategory =
        libraryCategory === "All" || exercise.categories.includes(libraryCategory);

      return matchesSearch && matchesCategory;
    });
  }, [librarySearch, libraryCategory]);

  const filteredBuilderExercises = useMemo(() => {
    return exerciseLibrary.filter((exercise) => {
      const matchesSearch =
        exercise.name.toLowerCase().includes(planExerciseSearch.toLowerCase()) ||
        exercise.muscles.toLowerCase().includes(planExerciseSearch.toLowerCase()) ||
        exercise.equipment.toLowerCase().includes(planExerciseSearch.toLowerCase());

      const matchesCategory =
        planCategory === "All" || exercise.categories.includes(planCategory);

      return matchesSearch && matchesCategory;
    });
  }, [planExerciseSearch, planCategory]);

  const coachNotifications = useMemo(() => {
    const workoutActivity = workoutLogs.flatMap((log) => {
      const activity = [
        {
          title:
            log.status === "completed"
              ? "Client completed workout"
              : "Client skipped workout",
          detail: `${log.clientName} marked ${log.dayName} from ${log.planName} as ${log.status}.`,
          time: log.submittedAt,
        },
      ];

      const changedValues = log.entries.filter(
        (entry) =>
          entry.actualWeight ||
          entry.setsCompleted ||
          entry.repsCompleted ||
          entry.timeCompleted ||
          entry.restUsed
      );

      const substitutions = log.entries.filter((entry) => entry.substitution);
      const notes = log.entries.filter((entry) => entry.notes);

      if (changedValues.length > 0) {
        activity.push({
          title: "Client changed workout values",
          detail: `${log.clientName} entered tracking values for ${changedValues.length} exercise(s).`,
          time: log.submittedAt,
        });
      }

      if (substitutions.length > 0) {
        activity.push({
          title: "Client changed assigned exercise",
          detail: `${log.clientName} substituted ${substitutions.length} exercise(s).`,
          time: log.submittedAt,
        });
      }

      if (notes.length > 0) {
        activity.push({
          title: "Client left workout note",
          detail: `${log.clientName} left notes on ${notes.length} exercise(s).`,
          time: log.submittedAt,
        });
      }

      return activity;
    });

    const planActivity = savedPlans.slice(0, 5).map((plan) => ({
      title: "Coach assigned new plan",
      detail: `${plan.planName} assigned to ${plan.clientName}.`,
      time: plan.createdAt,
    }));

    return [
      ...workoutActivity,
      ...planActivity,
      {
        title: "Email notifications not connected",
        detail:
          "Email alerts should be handled later through a backend like Supabase + Resend or SendGrid, not directly inside App.jsx.",
        time: "Frontend placeholder",
      },
    ];
  }, [savedPlans, workoutLogs]);

  function updatePlanField(field, value) {
    setPlanDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function addTrainingDay() {
    const newDay = {
      id: makeId("day"),
      name: `Day ${planDraft.days.length + 1}`,
      exercises: [],
    };

    setPlanDraft((current) => ({
      ...current,
      days: [...current.days, newDay],
    }));

    setSelectedDayId(newDay.id);
    setBuilderMessage("");
  }

  function updateTrainingDayName(dayId, value) {
    setPlanDraft((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === dayId ? { ...day, name: value } : day
      ),
    }));
  }

  function removeTrainingDay(dayId) {
    if (planDraft.days.length === 1) {
      setBuilderMessage("A plan needs at least one training day.");
      return;
    }

    const remainingDays = planDraft.days.filter((day) => day.id !== dayId);

    setPlanDraft((current) => ({
      ...current,
      days: remainingDays,
    }));

    if (selectedDayId === dayId) {
      setSelectedDayId(remainingDays[0].id);
    }

    setBuilderMessage("");
  }

  function addExerciseToSelectedDay(exercise) {
    if (!selectedDay) return;

    const planExercise = {
      id: makeId("plan-exercise"),
      exerciseName: exercise.name,
      categories: exercise.categories,
      muscles: exercise.muscles,
      equipment: exercise.equipment,
      sets: "3",
      repsOrTime: "8 - 12",
      weightGuidance: "Coach-guided",
      rest: "60 - 90 sec",
      notes: "",
    };

    setPlanDraft((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === selectedDay.id
          ? {
              ...day,
              exercises: [...day.exercises, planExercise],
            }
          : day
      ),
    }));

    setBuilderMessage(`${exercise.name} added to ${selectedDay.name}.`);
  }

  function updatePlanExercise(dayId, exerciseId, field, value) {
    setPlanDraft((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.id === exerciseId
                  ? {
                      ...exercise,
                      [field]: value,
                    }
                  : exercise
              ),
            }
          : day
      ),
    }));
  }

  function removePlanExercise(dayId, exerciseId) {
    setPlanDraft((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.filter((exercise) => exercise.id !== exerciseId),
            }
          : day
      ),
    }));

    setBuilderMessage("Exercise removed from plan.");
  }

  function savePlan() {
    const planName = planDraft.planName.trim();

    if (!planName) {
      setBuilderMessage("Add a plan name before saving.");
      return;
    }

    if (!planDraft.clientId) {
      setBuilderMessage("Select a client before saving.");
      return;
    }

    const exerciseCount = planDraft.days.reduce(
      (total, day) => total + day.exercises.length,
      0
    );

    if (exerciseCount === 0) {
      setBuilderMessage("Add at least one exercise before saving.");
      return;
    }

    const copiedDays = planDraft.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => ({ ...exercise })),
    }));

    const newPlan = {
      id: makeId("saved-plan"),
      planName,
      clientId: planDraft.clientId,
      clientName: selectedClient?.name || "Unassigned Client",
      createdAt: new Date().toLocaleString(),
      days: copiedDays,
    };

    setSavedPlans((current) => [newPlan, ...current]);
    setTrackerClientId(newPlan.clientId);
    setSelectedTrackerPlanId(newPlan.id);
    setSelectedTrackerDayId(newPlan.days[0]?.id || "");
    setBuilderMessage("Plan saved locally and assigned to the selected client.");
  }

  function resetPlanBuilder() {
    const newDay = {
      id: makeId("day"),
      name: "Day 1 - Upper Body",
      exercises: [],
    };

    setPlanDraft({
      planName: "",
      clientId: clients[0]?.id || "",
      days: [newDay],
    });

    setSelectedDayId(newDay.id);
    setPlanExerciseSearch("");
    setPlanCategory("All");
    setBuilderMessage("Builder reset.");
  }

  function addClient() {
    const name = clientForm.name.trim();
    const email = clientForm.email.trim();

    if (!name) return;

    const newClient = {
      id: makeId("client"),
      name,
      email: email || "No email added",
      status: "Active",
    };

    setClients((current) => [...current, newClient]);
    setClientForm({ name: "", email: "" });

    if (!planDraft.clientId) {
      setPlanDraft((current) => ({
        ...current,
        clientId: newClient.id,
      }));
    }
  }

  function updateTrackingDraft(planId, dayId, exerciseId, field, value) {
    const key = getTrackingKey(planId, dayId, exerciseId);

    setTrackingDrafts((current) => ({
      ...current,
      [key]: {
        ...(current[key] || emptyTrackingEntry),
        [field]: value,
      },
    }));
  }

  function markWorkoutStatus(plan, day, status) {
    if (!plan || !day) {
      setTrackerMessage("Select a plan and training day first.");
      return;
    }

    const entries = day.exercises.map((exercise) => {
      const key = getTrackingKey(plan.id, day.id, exercise.id);
      const draft = trackingDrafts[key] || emptyTrackingEntry;

      return {
        exerciseId: exercise.id,
        exerciseName: exercise.exerciseName,
        assignedSets: exercise.sets,
        assignedRepsOrTime: exercise.repsOrTime,
        assignedWeightGuidance: exercise.weightGuidance,
        assignedRest: exercise.rest,
        actualWeight: draft.actualWeight || "",
        setsCompleted: draft.setsCompleted || "",
        repsCompleted: draft.repsCompleted || "",
        timeCompleted: draft.timeCompleted || "",
        restUsed: draft.restUsed || "",
        substitution: draft.substitution || "",
        notes: draft.notes || "",
      };
    });

    const newLog = {
      id: makeId("workout-log"),
      clientId: plan.clientId,
      clientName: plan.clientName,
      planId: plan.id,
      planName: plan.planName,
      dayId: day.id,
      dayName: day.name,
      status,
      submittedAt: new Date().toLocaleString(),
      entries,
    };

    setWorkoutLogs((current) => [newLog, ...current]);
    setTrackerMessage(
      status === "completed"
        ? `${day.name} marked complete. Coach activity updated.`
        : `${day.name} marked skipped. Coach activity updated.`
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div
        className="fixed inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: "url('/images/gym-background.webp')" }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-black via-black/90 to-black" />

      <div className="relative z-10">
        <header className="border-b border-white/10 bg-black/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <button
              type="button"
              onClick={() => setActiveTab("Home")}
              className="flex items-center gap-3 text-left"
            >
              <img
                src="/images/logo.png"
                alt="No Limit Fitness"
                className="h-14 w-14 rounded-2xl object-contain"
              />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/50">
                  Coach Portal
                </p>
                <h1 className="text-2xl font-black uppercase tracking-wide">
                  No Limit <span className="text-[#00BF63]">Fitness</span>
                </h1>
              </div>
            </button>

            <nav className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                      isActive
                        ? "border-[#00BF63] bg-[#00BF63] text-black"
                        : "border-white/10 bg-white/5 text-white hover:border-[#00BF63]/70 hover:text-[#00BF63]"
                    }`}
                  >
                    <Icon size={16} />
                    {tab.id}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">
          {activeTab === "Home" && (
            <HomeScreen
              setActiveTab={setActiveTab}
              clients={clients}
              savedPlans={savedPlans}
              workoutLogs={workoutLogs}
              exerciseCount={exerciseLibrary.length}
            />
          )}

          {activeTab === "Coach" && (
            <CoachScreen
              notifications={coachNotifications}
              savedPlans={savedPlans}
              workoutLogs={workoutLogs}
            />
          )}

          {activeTab === "Clients" && (
            <ClientsScreen
              clients={clients}
              clientForm={clientForm}
              setClientForm={setClientForm}
              addClient={addClient}
            />
          )}

          {activeTab === "Plans" && (
            <PlansScreen
              clients={clients}
              planDraft={planDraft}
              selectedClient={selectedClient}
              selectedDay={selectedDay}
              selectedDayId={selectedDayId}
              setSelectedDayId={setSelectedDayId}
              updatePlanField={updatePlanField}
              addTrainingDay={addTrainingDay}
              updateTrainingDayName={updateTrainingDayName}
              removeTrainingDay={removeTrainingDay}
              planExerciseSearch={planExerciseSearch}
              setPlanExerciseSearch={setPlanExerciseSearch}
              planCategory={planCategory}
              setPlanCategory={setPlanCategory}
              filteredBuilderExercises={filteredBuilderExercises}
              addExerciseToSelectedDay={addExerciseToSelectedDay}
              updatePlanExercise={updatePlanExercise}
              removePlanExercise={removePlanExercise}
              savePlan={savePlan}
              resetPlanBuilder={resetPlanBuilder}
              builderMessage={builderMessage}
              savedPlans={savedPlans}
            />
          )}

          {activeTab === "Tracker" && (
            <TrackerScreen
              clients={clients}
              savedPlans={savedPlans}
              trackerClientId={trackerClientId}
              setTrackerClientId={setTrackerClientId}
              selectedTrackerPlanId={selectedTrackerPlanId}
              setSelectedTrackerPlanId={setSelectedTrackerPlanId}
              selectedTrackerDayId={selectedTrackerDayId}
              setSelectedTrackerDayId={setSelectedTrackerDayId}
              trackingDrafts={trackingDrafts}
              updateTrackingDraft={updateTrackingDraft}
              markWorkoutStatus={markWorkoutStatus}
              trackerMessage={trackerMessage}
              workoutLogs={workoutLogs}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === "Exercises" && (
            <ExercisesScreen
              librarySearch={librarySearch}
              setLibrarySearch={setLibrarySearch}
              libraryCategory={libraryCategory}
              setLibraryCategory={setLibraryCategory}
              filteredLibraryExercises={filteredLibraryExercises}
            />
          )}

          {activeTab === "Progress" && (
            <ProgressScreen savedPlans={savedPlans} workoutLogs={workoutLogs} />
          )}

          {activeTab === "Login" && <LoginScreen />}
        </main>
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.35em] text-[#00BF63]">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-black uppercase tracking-tight md:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65 md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}

function HomeScreen({ setActiveTab, clients, savedPlans, workoutLogs, exerciseCount }) {
  const homeCards = [
    {
      title: "Build Workout Plan",
      text: "Create structured training days, add exercises, and program coaching details.",
      icon: ClipboardList,
      target: "Plans",
    },
    {
      title: "Client Tracker",
      text: "Open an assigned workout and log actual client performance.",
      icon: CheckCircle,
      target: "Tracker",
    },
    {
      title: "Manage Clients",
      text: "Create client profiles now. Assign plans and tracking later.",
      icon: Users,
      target: "Clients",
    },
    {
      title: "Exercise Library",
      text: "Search the general database without sets, reps, weight, rest, or time.",
      icon: Dumbbell,
      target: "Exercises",
    },
  ];

  return (
    <div>
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-[#00BF63]">
              Built with structure. Backed by discipline.
            </p>
            <h2 className="text-4xl font-black uppercase leading-tight md:text-6xl">
              Coach-to-client workout tracking system.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-7 text-white/70">
              Build plans, assign them to clients, and test the frontend client
              tracker where workout values, notes, substitutions, skipped workouts,
              and completed workouts can be logged locally.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("Plans")}
                className="rounded-full bg-[#00BF63] px-6 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-white"
              >
                Build Plan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("Tracker")}
                className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
              >
                Open Tracker
              </button>
            </div>
          </div>

          <div className="grid gap-3 rounded-[2rem] border border-[#00BF63]/30 bg-black/60 p-5">
            <StatCard label="Clients" value={clients.length} />
            <StatCard label="Saved Plans" value={savedPlans.length} />
            <StatCard label="Workout Logs" value={workoutLogs.length} />
            <StatCard label="Exercise Library" value={exerciseCount} />
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {homeCards.map((card) => {
          const Icon = card.icon;

          return (
            <button
              key={card.title}
              type="button"
              onClick={() => setActiveTab(card.target)}
              className="group rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 text-left transition hover:-translate-y-1 hover:border-[#00BF63]/60 hover:bg-[#00BF63]/10"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00BF63] text-black">
                <Icon size={24} />
              </div>
              <h3 className="text-xl font-black uppercase">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">{card.text}</p>
            </button>
          );
        })}
      </section>
    </div>
  );
}

function CoachScreen({ notifications, savedPlans, workoutLogs }) {
  return (
    <div>
      <SectionHeader
        eyebrow="Coach Dashboard"
        title="Command Center"
        description="Coach-facing activity updates when a client completes, skips, changes values, substitutes exercises, or leaves notes. Email is still intentionally not connected."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Assigned Plans" value={savedPlans.length} />
        <StatCard label="Workout Logs" value={workoutLogs.length} />
        <StatCard
          label="Completed"
          value={workoutLogs.filter((log) => log.status === "completed").length}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-4 flex items-center gap-3">
            <Bell className="text-[#00BF63]" />
            <h3 className="text-xl font-black uppercase">Notification Types</h3>
          </div>

          <div className="space-y-3">
            {[
              "Client completed workout",
              "Client skipped workout",
              "Client changed assigned exercise",
              "Client changed sets, reps, weight, time, or rest",
              "Client left workout note",
              "Coach assigned new plan",
              "Coach sent message",
              "Client sent message",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 text-sm text-white/75"
              >
                <CheckCircle size={18} className="text-[#00BF63]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-4 flex items-center gap-3">
            <Activity className="text-[#00BF63]" />
            <h3 className="text-xl font-black uppercase">Recent App Activity</h3>
          </div>

          <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
            {notifications.map((notification, index) => (
              <div
                key={`${notification.title}-${index}`}
                className="rounded-2xl border border-white/10 bg-black/40 p-4"
              >
                <p className="font-black text-white">{notification.title}</p>
                <p className="mt-1 text-sm text-white/60">{notification.detail}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-[#00BF63]">
                  {notification.time}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-[#00BF63]/30 bg-[#00BF63]/10 p-5">
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-1 text-[#00BF63]" />
          <div>
            <h3 className="font-black uppercase">Messages Later</h3>
            <p className="mt-1 text-sm leading-6 text-white/65">
              Built-in coach/client messaging and unread indicators should be added
              after the plan builder and workout tracker are stable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientsScreen({ clients, clientForm, setClientForm, addClient }) {
  return (
    <div>
      <SectionHeader
        eyebrow="Clients"
        title="Client Management"
        description="Create sample clients locally for now. These can be selected inside the Workout Plan Builder and Client Tracker."
      />

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="mb-4 text-xl font-black uppercase">Add Client</h3>

          <div className="space-y-3">
            <Input
              label="Client Name"
              value={clientForm.name}
              onChange={(value) =>
                setClientForm((current) => ({ ...current, name: value }))
              }
              placeholder="Enter client name"
            />
            <Input
              label="Client Email"
              value={clientForm.email}
              onChange={(value) =>
                setClientForm((current) => ({ ...current, email: value }))
              }
              placeholder="Enter client email"
            />

            <button
              type="button"
              onClick={addClient}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00BF63] px-5 py-3 font-black uppercase text-black transition hover:bg-white"
            >
              <Plus size={18} />
              Add Client
            </button>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="mb-4 text-xl font-black uppercase">Client List</h3>

          <div className="grid gap-3 md:grid-cols-2">
            {clients.map((client) => (
              <div
                key={client.id}
                className="rounded-2xl border border-white/10 bg-black/40 p-4"
              >
                <p className="text-lg font-black">{client.name}</p>
                <p className="mt-1 text-sm text-white/55">{client.email}</p>
                <span className="mt-3 inline-flex rounded-full bg-[#00BF63]/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#00BF63]">
                  {client.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlansScreen({
  clients,
  planDraft,
  selectedClient,
  selectedDay,
  selectedDayId,
  setSelectedDayId,
  updatePlanField,
  addTrainingDay,
  updateTrainingDayName,
  removeTrainingDay,
  planExerciseSearch,
  setPlanExerciseSearch,
  planCategory,
  setPlanCategory,
  filteredBuilderExercises,
  addExerciseToSelectedDay,
  updatePlanExercise,
  removePlanExercise,
  savePlan,
  resetPlanBuilder,
  builderMessage,
  savedPlans,
}) {
  const totalExercises = planDraft.days.reduce(
    (total, day) => total + day.exercises.length,
    0
  );

  return (
    <div>
      <SectionHeader
        eyebrow="Workout Plan Builder"
        title="Build Training With Intent"
        description="Create a plan, select a client, build training days, add exercises from the general library, and program the workout details that belong inside the plan."
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center gap-3">
              <ClipboardList className="text-[#00BF63]" />
              <h3 className="text-xl font-black uppercase">Plan Setup</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Plan Name"
                value={planDraft.planName}
                onChange={(value) => updatePlanField("planName", value)}
                placeholder="Example: 4 Week Strength Plan"
              />

              <Select
                label="Select Client"
                value={planDraft.clientId}
                onChange={(value) => updatePlanField("clientId", value)}
                options={clients.map((client) => ({
                  label: client.name,
                  value: client.id,
                }))}
              />
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-[#00BF63]/30 bg-[#00BF63]/10 p-4 md:grid-cols-3">
              <StatCard label="Selected Client" value={selectedClient?.name || "None"} />
              <StatCard label="Training Days" value={planDraft.days.length} />
              <StatCard label="Plan Exercises" value={totalExercises} />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={savePlan}
                className="flex items-center gap-2 rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-white"
              >
                <Save size={17} />
                Save Plan Locally
              </button>

              <button
                type="button"
                onClick={resetPlanBuilder}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
              >
                <X size={17} />
                Reset Builder
              </button>
            </div>

            {builderMessage && (
              <p className="mt-4 rounded-2xl border border-[#00BF63]/30 bg-black/50 p-3 text-sm font-bold text-[#00BF63]">
                {builderMessage}
              </p>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Dumbbell className="text-[#00BF63]" />
                <h3 className="text-xl font-black uppercase">Add Exercises</h3>
              </div>

              <button
                type="button"
                onClick={addTrainingDay}
                className="flex items-center gap-2 rounded-full border border-[#00BF63]/40 bg-[#00BF63]/10 px-4 py-2 text-sm font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"
              >
                <Plus size={16} />
                Add Day
              </button>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
              <SearchInput
                value={planExerciseSearch}
                onChange={setPlanExerciseSearch}
                placeholder="Search exercises to add..."
              />

              <select
                value={planCategory}
                onChange={(event) => setPlanCategory(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#00BF63]"
              >
                {exerciseCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {filteredBuilderExercises.map((exercise) => (
                <div
                  key={exercise.name}
                  className="rounded-2xl border border-white/10 bg-black/40 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        {exercise.categories.map((category) => (
                          <CategoryPill key={category}>{category}</CategoryPill>
                        ))}
                      </div>
                      <h4 className="text-lg font-black">{exercise.name}</h4>
                      <p className="mt-1 text-sm text-white/55">
                        <span className="font-bold text-white/80">Muscles:</span>{" "}
                        {exercise.muscles}
                      </p>
                      <p className="mt-1 text-sm text-white/55">
                        <span className="font-bold text-white/80">Equipment:</span>{" "}
                        {exercise.equipment}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => addExerciseToSelectedDay(exercise)}
                      className="shrink-0 rounded-full bg-[#00BF63] px-4 py-2 text-sm font-black uppercase text-black transition hover:bg-white"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}

              {filteredBuilderExercises.length === 0 && (
                <EmptyState text="No exercises match your search." />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 flex items-center gap-3">
              <Activity className="text-[#00BF63]" />
              <h3 className="text-xl font-black uppercase">Training Days</h3>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {planDraft.days.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedDayId(day.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                    selectedDayId === day.id
                      ? "border-[#00BF63] bg-[#00BF63] text-black"
                      : "border-white/10 bg-black/40 text-white hover:border-[#00BF63]"
                  }`}
                >
                  {day.name || "Unnamed Day"}
                </button>
              ))}
            </div>

            {selectedDay && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input
                    label="Training Day Name"
                    value={selectedDay.name}
                    onChange={(value) => updateTrainingDayName(selectedDay.id, value)}
                    placeholder="Example: Day 1 - Lower Body"
                  />

                  <button
                    type="button"
                    onClick={() => removeTrainingDay(selectedDay.id)}
                    className="mt-auto flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black uppercase text-red-300 transition hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 size={17} />
                    Remove Day
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedDay.exercises.map((exercise, index) => (
                    <div
                      key={exercise.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
                            Exercise {index + 1}
                          </p>
                          <h4 className="mt-1 text-xl font-black">
                            {exercise.exerciseName}
                          </h4>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {exercise.categories.map((category) => (
                              <CategoryPill key={category}>{category}</CategoryPill>
                            ))}
                          </div>
                          <p className="mt-2 text-sm text-white/50">
                            {exercise.muscles} • {exercise.equipment}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removePlanExercise(selectedDay.id, exercise.id)
                          }
                          className="rounded-full border border-red-500/30 bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500 hover:text-white"
                          aria-label="Remove exercise"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <Input
                          label="Sets"
                          value={exercise.sets}
                          onChange={(value) =>
                            updatePlanExercise(
                              selectedDay.id,
                              exercise.id,
                              "sets",
                              value
                            )
                          }
                          placeholder="Example: 3"
                        />
                        <Input
                          label="Reps or Time"
                          value={exercise.repsOrTime}
                          onChange={(value) =>
                            updatePlanExercise(
                              selectedDay.id,
                              exercise.id,
                              "repsOrTime",
                              value
                            )
                          }
                          placeholder="Example: 8 - 12 or 30 sec"
                        />
                        <Input
                          label="Weight Guidance"
                          value={exercise.weightGuidance}
                          onChange={(value) =>
                            updatePlanExercise(
                              selectedDay.id,
                              exercise.id,
                              "weightGuidance",
                              value
                            )
                          }
                          placeholder="Example: RPE 7"
                        />
                        <Input
                          label="Rest Period"
                          value={exercise.rest}
                          onChange={(value) =>
                            updatePlanExercise(
                              selectedDay.id,
                              exercise.id,
                              "rest",
                              value
                            )
                          }
                          placeholder="Example: 60 - 90 sec"
                        />
                        <div className="md:col-span-2">
                          <Input
                            label="Coach Notes"
                            value={exercise.notes}
                            onChange={(value) =>
                              updatePlanExercise(
                                selectedDay.id,
                                exercise.id,
                                "notes",
                                value
                              )
                            }
                            placeholder="Tempo, form cue, substitution note, etc."
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {selectedDay.exercises.length === 0 && (
                    <EmptyState text="No exercises added to this training day yet. Search the library and click Add." />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <h3 className="mb-4 text-xl font-black uppercase">Saved Local Plans</h3>

            <div className="space-y-3">
              {savedPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-white/10 bg-black/40 p-4"
                >
                  <p className="text-lg font-black">{plan.planName}</p>
                  <p className="mt-1 text-sm text-white/60">
                    Client: {plan.clientName}
                  </p>
                  <p className="mt-1 text-sm text-white/60">
                    Days: {plan.days.length} • Exercises:{" "}
                    {plan.days.reduce(
                      (total, day) => total + day.exercises.length,
                      0
                    )}
                  </p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-[#00BF63]">
                    {plan.createdAt}
                  </p>
                </div>
              ))}

              {savedPlans.length === 0 && (
                <EmptyState text="No saved plans yet. Build one and save it locally." />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackerScreen({
  clients,
  savedPlans,
  trackerClientId,
  setTrackerClientId,
  selectedTrackerPlanId,
  setSelectedTrackerPlanId,
  selectedTrackerDayId,
  setSelectedTrackerDayId,
  trackingDrafts,
  updateTrackingDraft,
  markWorkoutStatus,
  trackerMessage,
  workoutLogs,
  setActiveTab,
}) {
  const assignedPlans = savedPlans.filter((plan) => plan.clientId === trackerClientId);
  const selectedPlan =
    assignedPlans.find((plan) => plan.id === selectedTrackerPlanId) ||
    assignedPlans[0] ||
    null;
  const selectedDay =
    selectedPlan?.days.find((day) => day.id === selectedTrackerDayId) ||
    selectedPlan?.days[0] ||
    null;

  const selectedClient = clients.find((client) => client.id === trackerClientId);
  const clientLogs = workoutLogs.filter((log) => log.clientId === trackerClientId);

  return (
    <div>
      <SectionHeader
        eyebrow="Client Workout Tracker"
        title="Log The Work"
        description="Open an assigned plan and let the client enter actual weight, sets, reps, time, rest, substitutions, and notes. Completing or skipping a workout creates coach-facing activity locally."
      />

      {savedPlans.length === 0 && (
        <div className="rounded-[1.5rem] border border-[#00BF63]/30 bg-[#00BF63]/10 p-6">
          <h3 className="text-xl font-black uppercase">No Assigned Plans Yet</h3>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Build and save a workout plan first. Once saved, it will appear here
            for the selected client.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab("Plans")}
            className="mt-5 rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-white"
          >
            Build A Plan
          </button>
        </div>
      )}

      {savedPlans.length > 0 && (
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-center gap-3">
                <Users className="text-[#00BF63]" />
                <h3 className="text-xl font-black uppercase">Tracker Setup</h3>
              </div>

              <div className="space-y-4">
                <Select
                  label="Client"
                  value={trackerClientId}
                  onChange={(value) => {
                    setTrackerClientId(value);
                    setSelectedTrackerPlanId("");
                    setSelectedTrackerDayId("");
                  }}
                  options={clients.map((client) => ({
                    label: client.name,
                    value: client.id,
                  }))}
                />

                <Select
                  label="Assigned Plan"
                  value={selectedPlan?.id || ""}
                  onChange={(value) => {
                    setSelectedTrackerPlanId(value);
                    setSelectedTrackerDayId("");
                  }}
                  options={
                    assignedPlans.length > 0
                      ? assignedPlans.map((plan) => ({
                          label: plan.planName,
                          value: plan.id,
                        }))
                      : [{ label: "No plans assigned", value: "" }]
                  }
                />

                <div className="rounded-2xl border border-[#00BF63]/30 bg-[#00BF63]/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
                    Selected Client
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    {selectedClient?.name || "No client selected"}
                  </p>
                  <p className="mt-1 text-sm text-white/60">
                    Assigned plans: {assignedPlans.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-4 text-xl font-black uppercase">Training Days</h3>

              {selectedPlan && (
                <div className="flex flex-wrap gap-2">
                  {selectedPlan.days.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => setSelectedTrackerDayId(day.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                        selectedDay?.id === day.id
                          ? "border-[#00BF63] bg-[#00BF63] text-black"
                          : "border-white/10 bg-black/40 text-white hover:border-[#00BF63]"
                      }`}
                    >
                      {day.name}
                    </button>
                  ))}
                </div>
              )}

              {!selectedPlan && (
                <EmptyState text="This client does not have a saved plan assigned yet." />
              )}
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-4 text-xl font-black uppercase">Recent Client Logs</h3>

              <div className="space-y-3">
                {clientLogs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-white/10 bg-black/40 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black">{log.dayName}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                          log.status === "completed"
                            ? "bg-[#00BF63]/15 text-[#00BF63]"
                            : "bg-yellow-500/15 text-yellow-300"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-white/60">{log.planName}</p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-white/40">
                      {log.submittedAt}
                    </p>
                  </div>
                ))}

                {clientLogs.length === 0 && (
                  <EmptyState text="No workout logs for this client yet." />
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
                  Active Workout
                </p>
                <h3 className="mt-1 text-2xl font-black uppercase">
                  {selectedDay?.name || "No Day Selected"}
                </h3>
                <p className="mt-1 text-sm text-white/60">
                  {selectedPlan?.planName || "Select an assigned plan"}
                </p>
              </div>

              {selectedPlan && selectedDay && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => markWorkoutStatus(selectedPlan, selectedDay, "completed")}
                    className="rounded-full bg-[#00BF63] px-4 py-2 text-sm font-black uppercase text-black transition hover:bg-white"
                  >
                    Mark Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => markWorkoutStatus(selectedPlan, selectedDay, "skipped")}
                    className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm font-black uppercase text-yellow-200 transition hover:bg-yellow-500 hover:text-black"
                  >
                    Mark Skipped
                  </button>
                </div>
              )}
            </div>

            {trackerMessage && (
              <p className="mb-4 rounded-2xl border border-[#00BF63]/30 bg-black/50 p-3 text-sm font-bold text-[#00BF63]">
                {trackerMessage}
              </p>
            )}

            {selectedPlan && selectedDay && (
              <div className="space-y-4">
                {selectedDay.exercises.map((exercise, index) => {
                  const key = getTrackingKey(selectedPlan.id, selectedDay.id, exercise.id);
                  const draft = trackingDrafts[key] || emptyTrackingEntry;

                  return (
                    <div
                      key={exercise.id}
                      className="rounded-2xl border border-white/10 bg-black/40 p-4"
                    >
                      <div className="mb-4">
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
                          Exercise {index + 1}
                        </p>
                        <h4 className="mt-1 text-xl font-black">
                          {exercise.exerciseName}
                        </h4>
                        <p className="mt-1 text-sm text-white/50">
                          {exercise.muscles} • {exercise.equipment}
                        </p>
                      </div>

                      <div className="mb-4 grid gap-3 md:grid-cols-4">
                        <MiniProgram label="Assigned Sets" value={exercise.sets} />
                        <MiniProgram label="Assigned Reps/Time" value={exercise.repsOrTime} />
                        <MiniProgram label="Weight Guidance" value={exercise.weightGuidance} />
                        <MiniProgram label="Assigned Rest" value={exercise.rest} />
                      </div>

                      {exercise.notes && (
                        <div className="mb-4 rounded-2xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-3">
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00BF63]">
                            Coach Notes
                          </p>
                          <p className="mt-1 text-sm text-white/70">{exercise.notes}</p>
                        </div>
                      )}

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <Input
                          label="Actual Weight Used"
                          value={draft.actualWeight}
                          onChange={(value) =>
                            updateTrackingDraft(
                              selectedPlan.id,
                              selectedDay.id,
                              exercise.id,
                              "actualWeight",
                              value
                            )
                          }
                          placeholder="Example: 185 lb"
                        />
                        <Input
                          label="Sets Completed"
                          value={draft.setsCompleted}
                          onChange={(value) =>
                            updateTrackingDraft(
                              selectedPlan.id,
                              selectedDay.id,
                              exercise.id,
                              "setsCompleted",
                              value
                            )
                          }
                          placeholder="Example: 3"
                        />
                        <Input
                          label="Reps Completed"
                          value={draft.repsCompleted}
                          onChange={(value) =>
                            updateTrackingDraft(
                              selectedPlan.id,
                              selectedDay.id,
                              exercise.id,
                              "repsCompleted",
                              value
                            )
                          }
                          placeholder="Example: 10, 9, 8"
                        />
                        <Input
                          label="Time Completed"
                          value={draft.timeCompleted}
                          onChange={(value) =>
                            updateTrackingDraft(
                              selectedPlan.id,
                              selectedDay.id,
                              exercise.id,
                              "timeCompleted",
                              value
                            )
                          }
                          placeholder="Example: 30 sec"
                        />
                        <Input
                          label="Actual Rest Used"
                          value={draft.restUsed}
                          onChange={(value) =>
                            updateTrackingDraft(
                              selectedPlan.id,
                              selectedDay.id,
                              exercise.id,
                              "restUsed",
                              value
                            )
                          }
                          placeholder="Example: 90 sec"
                        />
                        <Input
                          label="Exercise Substitution"
                          value={draft.substitution}
                          onChange={(value) =>
                            updateTrackingDraft(
                              selectedPlan.id,
                              selectedDay.id,
                              exercise.id,
                              "substitution",
                              value
                            )
                          }
                          placeholder="Example: DB press instead"
                        />
                        <div className="md:col-span-2 xl:col-span-3">
                          <TextArea
                            label="Client Notes"
                            value={draft.notes}
                            onChange={(value) =>
                              updateTrackingDraft(
                                selectedPlan.id,
                                selectedDay.id,
                                exercise.id,
                                "notes",
                                value
                              )
                            }
                            placeholder="Pain, difficulty, form notes, energy level, or anything coach should know..."
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {selectedDay.exercises.length === 0 && (
                  <EmptyState text="This training day has no exercises." />
                )}
              </div>
            )}

            {!selectedPlan && <EmptyState text="Select a client with an assigned plan." />}
          </div>
        </div>
      )}
    </div>
  );
}

function ExercisesScreen({
  librarySearch,
  setLibrarySearch,
  libraryCategory,
  setLibraryCategory,
  filteredLibraryExercises,
}) {
  return (
    <div>
      <SectionHeader
        eyebrow="Exercise Library"
        title="General Exercise Database"
        description="This library is searchable and alphabetical. It does not show sets, reps, time, weight, or rest because those belong inside the Workout Plan Builder and Client Workout Tracker."
      />

      <div className="mb-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <SearchInput
            value={librarySearch}
            onChange={setLibrarySearch}
            placeholder="Search by exercise, muscle, or equipment..."
          />

          <div className="flex flex-wrap gap-2">
            {exerciseCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setLibraryCategory(category)}
                className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                  libraryCategory === category
                    ? "border-[#00BF63] bg-[#00BF63] text-black"
                    : "border-white/10 bg-black/40 text-white hover:border-[#00BF63]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredLibraryExercises.map((exercise) => (
          <ExerciseCard key={exercise.name} exercise={exercise} />
        ))}
      </div>

      {filteredLibraryExercises.length === 0 && (
        <EmptyState text="No exercises match your search." />
      )}
    </div>
  );
}

function ExerciseCard({ exercise }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 transition hover:border-[#00BF63]/60 hover:bg-[#00BF63]/10">
      <div className="mb-3 flex flex-wrap gap-2">
        {exercise.categories.map((category) => (
          <CategoryPill key={category}>{category}</CategoryPill>
        ))}
      </div>

      <h3 className="text-2xl font-black">{exercise.name}</h3>

      <div className="mt-4 space-y-2 text-sm text-white/65">
        <p>
          <span className="font-black text-white">Muscles worked:</span>{" "}
          {exercise.muscles}
        </p>
        <p>
          <span className="font-black text-white">Equipment:</span>{" "}
          {exercise.equipment}
        </p>
      </div>
    </div>
  );
}

function ProgressScreen({ savedPlans, workoutLogs }) {
  const completedLogs = workoutLogs.filter((log) => log.status === "completed");
  const skippedLogs = workoutLogs.filter((log) => log.status === "skipped");

  return (
    <div>
      <SectionHeader
        eyebrow="Progress"
        title="Tracking Comes Next"
        description="This screen summarizes local workout activity for now. Later it can become the client progress dashboard."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Saved Plans" value={savedPlans.length} />
        <StatCard label="Workout Logs" value={workoutLogs.length} />
        <StatCard label="Completed" value={completedLogs.length} />
        <StatCard label="Skipped" value={skippedLogs.length} />
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <h3 className="text-xl font-black uppercase">Recent Workout Logs</h3>

        <div className="mt-4 space-y-3">
          {workoutLogs.slice(0, 8).map((log) => (
            <div
              key={log.id}
              className="rounded-2xl border border-white/10 bg-black/40 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black">
                  {log.clientName} — {log.dayName}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                    log.status === "completed"
                      ? "bg-[#00BF63]/15 text-[#00BF63]"
                      : "bg-yellow-500/15 text-yellow-300"
                  }`}
                >
                  {log.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-white/60">{log.planName}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-white/40">
                {log.submittedAt}
              </p>
            </div>
          ))}

          {workoutLogs.length === 0 && (
            <EmptyState text="No workout logs yet. Complete or skip a workout in the Tracker tab." />
          )}
        </div>
      </div>
    </div>
  );
}

function LoginScreen() {
  return (
    <div>
      <SectionHeader
        eyebrow="Login"
        title="Authentication Later"
        description="Keep this frontend-only for now. Supabase/auth should come after the main screens and tracking flow are stable."
      />

      <div className="max-w-xl rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-xl font-black uppercase">Future Login Area</h3>
        <p className="mt-2 text-sm leading-6 text-white/65">
          Coach and client accounts can be connected later with Supabase. For now,
          the app is using local React state only.
        </p>

        <div className="mt-5 space-y-3">
          <Input label="Email" value="" onChange={() => {}} placeholder="Coming later" />
          <Input
            label="Password"
            value=""
            onChange={() => {}}
            placeholder="Coming later"
            type="password"
          />
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-2xl bg-white/10 px-5 py-3 font-black uppercase text-white/35"
          >
            Login Coming Later
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/40">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-[#00BF63]">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.25em] text-white/45">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-[#00BF63]"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.25em] text-white/45">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-[#00BF63]"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.25em] text-white/45">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-[#00BF63]"
      >
        {options.map((option) => (
          <option key={`${option.label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search
        size={18}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
      />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-black py-3 pl-11 pr-4 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-[#00BF63]"
      />
    </div>
  );
}

function CategoryPill({ children }) {
  return (
    <span className="rounded-full border border-[#00BF63]/30 bg-[#00BF63]/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#00BF63]">
      {children}
    </span>
  );
}

function MiniProgram({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-white">{value || "—"}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-black/30 p-6 text-center text-sm font-bold text-white/45">
      {text}
    </div>
  );
}