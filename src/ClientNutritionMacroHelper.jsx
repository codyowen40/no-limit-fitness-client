import { useMemo, useState } from "react";

const nutritionGoals = [
  {
    id: "fat-loss",
    label: "Fat Loss",
    adjustment: -0.12,
    proteinPerPound: 1,
    fatRatio: 0.25,
    shortExplanation: "Moderate deficit, easier to stick with.",
    coachExplanation:
      "Fat Loss uses a moderate calorie deficit. It is usually easier to follow because the drop from maintenance is not extreme.",
  },
  {
    id: "cutting",
    label: "Cutting",
    adjustment: -0.2,
    proteinPerPound: 1.05,
    fatRatio: 0.24,
    shortExplanation: "More aggressive deficit, faster but harder.",
    coachExplanation:
      "Cutting uses a bigger calorie deficit. It can move faster, but hunger and low energy may be harder to manage.",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    adjustment: 0,
    proteinPerPound: 0.9,
    fatRatio: 0.27,
    shortExplanation: "Hold body weight and build consistency.",
    coachExplanation:
      "Maintenance keeps calories close to what your body uses daily. This is useful for consistency, performance, and learning habits.",
  },
  {
    id: "lean-bulk",
    label: "Lean Bulk",
    adjustment: 0.08,
    proteinPerPound: 0.9,
    fatRatio: 0.25,
    shortExplanation: "Small surplus to build muscle with control.",
    coachExplanation:
      "Lean Bulk uses a small calorie surplus. The goal is to support muscle growth without pushing weight gain too fast.",
  },
];

const activityLevels = [
  {
    id: "mostly-sitting",
    label: "Mostly sitting",
    factor: 1.2,
    explanation: "Desk job, driving, school, or very little walking during the day.",
  },
  {
    id: "light-movement",
    label: "Light movement",
    factor: 1.375,
    explanation: "Some walking, errands, light housework, or light daily movement.",
  },
  {
    id: "on-feet",
    label: "On your feet often",
    factor: 1.55,
    explanation: "Retail, coaching, walking around at work, or moving through the day.",
  },
  {
    id: "physical-job",
    label: "Physical job",
    factor: 1.725,
    explanation:
      "Lifting, labor, warehouse work, construction, military-style work, or hard daily movement.",
  },
  {
    id: "very-active",
    label: "Very active",
    factor: 1.9,
    explanation:
      "Physical job plus hard training, lots of daily steps, or very demanding movement.",
  },
];

const mealPatterns = {
  2: [0.45, 0.55],
  3: [0.25, 0.35, 0.4],
  4: [0.17, 0.29, 0.37, 0.17],
  5: [0.15, 0.2, 0.25, 0.25, 0.15],
  6: [0.12, 0.16, 0.2, 0.2, 0.18, 0.14],
};

const commonFoods = [
  {
    label: "Premier Protein shake",
    aliases: ["premier protein shake", "premier protein"],
    calories: 160,
    protein: 30,
    carbs: 5,
    fats: 3,
    serving: "1 shake",
    isBrandSpecific: true,
  },
  {
    label: "Fairlife protein shake",
    aliases: ["fairlife shake", "fairlife protein shake", "fairlife"],
    calories: 150,
    protein: 30,
    carbs: 4,
    fats: 2,
    serving: "1 shake",
    isBrandSpecific: true,
  },
  {
    label: "Muscle Milk shake",
    aliases: ["muscle milk", "muscle milk shake"],
    calories: 160,
    protein: 25,
    carbs: 9,
    fats: 4,
    serving: "1 shake",
    isBrandSpecific: true,
  },
  {
    label: "protein shake",
    aliases: ["protein shake", "shake", "protein drink"],
    calories: 180,
    protein: 25,
    carbs: 10,
    fats: 4,
    serving: "1 generic shake",
    needsBrandFollowUp: true,
  },
  {
    label: "egg",
    aliases: ["egg", "eggs"],
    calories: 70,
    protein: 6,
    carbs: 0,
    fats: 5,
    serving: "1 large egg",
  },
  {
    label: "toast",
    aliases: ["toast", "bread", "slice of bread", "slices of bread"],
    calories: 80,
    protein: 4,
    carbs: 14,
    fats: 1,
    serving: "1 slice",
  },
  {
    label: "banana",
    aliases: ["banana", "bananas"],
    calories: 105,
    protein: 1,
    carbs: 27,
    fats: 0,
    serving: "1 medium banana",
  },
  {
    label: "chicken breast",
    aliases: ["chicken breast", "chicken"],
    calories: 185,
    protein: 35,
    carbs: 0,
    fats: 4,
    serving: "4 oz cooked",
    ouncesPerServing: 4,
    needsPortionFollowUp: true,
  },
  {
    label: "rice",
    aliases: ["rice", "white rice", "brown rice"],
    calories: 205,
    protein: 4,
    carbs: 45,
    fats: 0,
    serving: "1 cup cooked",
    needsPortionFollowUp: true,
  },
  {
    label: "broccoli",
    aliases: ["broccoli"],
    calories: 55,
    protein: 4,
    carbs: 11,
    fats: 1,
    serving: "1 cup",
  },
  {
    label: "oatmeal",
    aliases: ["oatmeal", "oats"],
    calories: 150,
    protein: 5,
    carbs: 27,
    fats: 3,
    serving: "1 serving",
  },
  {
    label: "peanut butter",
    aliases: ["peanut butter"],
    calories: 190,
    protein: 7,
    carbs: 7,
    fats: 16,
    serving: "2 tbsp",
    needsPortionFollowUp: true,
  },
  {
    label: "greek yogurt",
    aliases: ["greek yogurt", "yogurt"],
    calories: 130,
    protein: 18,
    carbs: 8,
    fats: 2,
    serving: "1 cup",
  },
  {
    label: "ground beef",
    aliases: ["ground beef", "beef"],
    calories: 240,
    protein: 22,
    carbs: 0,
    fats: 16,
    serving: "4 oz cooked",
    ouncesPerServing: 4,
    needsPortionFollowUp: true,
  },
  {
    label: "potato",
    aliases: ["potato", "potatoes"],
    calories: 160,
    protein: 4,
    carbs: 37,
    fats: 0,
    serving: "1 medium potato",
  },
];

const numberWords = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function roundToNearest(value, step) {
  return Math.round(value / step) * step;
}

function formatNumber(value) {
  return Math.round(value).toLocaleString();
}

function formatMacro(value, suffix = "") {
  return `${formatNumber(value)}${suffix}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseQuantity(value) {
  if (!value) return 1;

  const normalized = String(value).toLowerCase().trim();

  if (numberWords[normalized]) return numberWords[normalized];

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return 1;

  return parsed;
}

function getGoalConfig(goal) {
  return nutritionGoals.find((item) => item.id === goal) || nutritionGoals[0];
}

function getActivityConfig(activity) {
  return activityLevels.find((item) => item.id === activity) || activityLevels[1];
}

function calculateNutritionTargets(form) {
  const sex = form.sex === "female" ? "female" : "male";
  const age = clampNumber(form.age, 13, 90, 30);
  const feet = clampNumber(form.heightFeet, 4, 7, 5);
  const inches = clampNumber(form.heightInches, 0, 11, 10);
  const weightPounds = clampNumber(form.weightPounds, 90, 500, 185);
  const meals = Math.min(6, Math.max(2, Number.parseInt(form.mealsPerDay, 10) || 4));

  const heightCm = feet * 30.48 + inches * 2.54;
  const weightKg = weightPounds / 2.20462;
  const sexAdjustment = sex === "male" ? 5 : -161;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexAdjustment;

  const goalConfig = getGoalConfig(form.goal);
  const activityConfig = getActivityConfig(form.activity);

  const maintenance = roundToNearest(bmr * activityConfig.factor, 25);
  const targetCalories = roundToNearest(maintenance * (1 + goalConfig.adjustment), 25);
  const protein = roundToNearest(weightPounds * goalConfig.proteinPerPound, 5);
  const fats = roundToNearest(Math.max(45, (targetCalories * goalConfig.fatRatio) / 9), 5);
  const remainingCalories = Math.max(0, targetCalories - protein * 4 - fats * 9);
  const carbs = roundToNearest(remainingCalories / 4, 5);

  const pattern = mealPatterns[meals] || mealPatterns[4];
  const flexibleMeals = pattern.map((percentage, index) => ({
    label: index === pattern.length - 1 && pattern.length >= 4 ? "Snack" : `Meal ${index + 1}`,
    calories: roundToNearest(targetCalories * percentage, 25),
  }));

  return {
    sex,
    age,
    feet,
    inches,
    weightPounds,
    meals,
    bmr,
    maintenance,
    targetCalories,
    protein,
    carbs,
    fats,
    perMealCalories: roundToNearest(targetCalories / meals, 5),
    perMealProtein: roundToNearest(protein / meals, 5),
    perMealCarbs: roundToNearest(carbs / meals, 5),
    perMealFats: roundToNearest(fats / meals, 5),
    flexibleMeals,
    goalConfig,
    activityConfig,
    comparisons: nutritionGoals.map((goal) => ({
      label: goal.label,
      calories: roundToNearest(maintenance * (1 + goal.adjustment), 25),
      explanation: goal.shortExplanation,
    })),
  };
}

function hasBrandSpecificShake(text) {
  return /premier protein|fairlife|muscle milk/i.test(text);
}

function getQuantityFromText(text, food) {
  if (food.label === "protein shake" && hasBrandSpecificShake(text)) {
    return 0;
  }

  for (const alias of food.aliases) {
    const escapedAlias = escapeRegExp(alias);

    if (food.ouncesPerServing) {
      const ouncePattern = new RegExp(
        `(\\d+(?:\\.\\d+)?)\\s*(?:oz|ounce|ounces)\\s+(?:of\\s+)?${escapedAlias}\\b`,
        "i"
      );
      const ounceMatch = text.match(ouncePattern);
      if (ounceMatch) return Number.parseFloat(ounceMatch[1]) / food.ouncesPerServing;
    }

    const pattern = new RegExp(
      `(?:(one|two|three|four|five|six|seven|eight|nine|ten|\\d+(?:\\.\\d+)?)\\s*)?(?:large\\s+|small\\s+|pieces?\\s+of\\s+|slices?\\s+of\\s+|cups?\\s+of\\s+|servings?\\s+of\\s+|tbsp\\s+of\\s+|tablespoons?\\s+of\\s+)?${escapedAlias}\\b`,
      "i"
    );

    const match = text.match(pattern);
    if (match) return parseQuantity(match[1]);
  }

  return 0;
}

function getMealEstimateConfidence(text, matchedFoods) {
  if (matchedFoods.length === 0) return "Rough";

  const hasNumbers = /\d|one|two|three|four|five|six|seven|eight|nine|ten/i.test(text);
  const hasPortions = /oz|ounce|cup|cups|tbsp|tablespoon|slice|slices|piece|pieces|serving/i.test(text);
  const hasBrand = /premier protein|fairlife|muscle milk|brand/i.test(text);
  const hasCookingMethod = /grilled|fried|baked|air fried|boiled|with oil|with butter/i.test(text);

  const detailScore = [hasNumbers, hasPortions, hasBrand, hasCookingMethod].filter(Boolean).length;

  return matchedFoods.length >= 2 && detailScore >= 2 ? "Good" : "Rough";
}

function getFollowUpQuestion(text, matchedFoods) {
  if (matchedFoods.length === 0) {
    return "Try simple wording like: 3 eggs, 2 pieces of toast, a banana, and a protein shake.";
  }

  const genericShake = matchedFoods.find((food) => food.needsBrandFollowUp);
  if (genericShake) {
    return "Protein shakes vary by brand. Was it Premier Protein, Fairlife, Muscle Milk, homemade, or another brand?";
  }

  const needsPortion = matchedFoods.find((food) => food.needsPortionFollowUp);
  const hasPortionDetail = /oz|ounce|cup|cups|tbsp|tablespoon|slice|slices|piece|pieces|serving/i.test(text);

  if (needsPortion && !hasPortionDetail) {
    return `To make this more accurate, about how much ${needsPortion.label} did you have?`;
  }

  if (!/grilled|fried|baked|air fried|boiled|with oil|with butter/i.test(text)) {
    return "Cooking style matters too. Fried foods, oil, butter, sauces, and restaurant meals can change calories fast.";
  }

  return "This is a solid amount of detail. Keep using portions, brands, and cooking style when you can.";
}

function estimateMealFromText(text) {
  const normalized = String(text || "").toLowerCase();
  const matchedFoods = [];

  for (const food of commonFoods) {
    const quantity = getQuantityFromText(normalized, food);

    if (quantity > 0) {
      matchedFoods.push({
        ...food,
        quantity,
        calories: food.calories * quantity,
        protein: food.protein * quantity,
        carbs: food.carbs * quantity,
        fats: food.fats * quantity,
      });
    }
  }

  const totals = matchedFoods.reduce(
    (sum, food) => ({
      calories: sum.calories + food.calories,
      protein: sum.protein + food.protein,
      carbs: sum.carbs + food.carbs,
      fats: sum.fats + food.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  return {
    matchedFoods,
    totals,
    confidence: getMealEstimateConfidence(normalized, matchedFoods),
    followUpQuestion: getFollowUpQuestion(normalized, matchedFoods),
  };
}

function buildMealCoachNote(totals, targets) {
  if (totals.calories <= 0) {
    return "I could not estimate that meal yet, but you are on the right track. Add simple portions and food names so I can help better.";
  }

  const notes = [];

  if (totals.protein >= targets.perMealProtein * 0.85) {
    notes.push("Good protein start.");
  } else {
    notes.push(
      "Protein looks low for this meal, so you may want to add chicken, eggs, greek yogurt, lean beef, fish, or a protein shake later."
    );
  }

  if (totals.calories > targets.perMealCalories * 1.3) {
    notes.push("This is a bigger meal, which is fine if the rest of the day is lighter.");
  } else if (totals.calories < targets.perMealCalories * 0.65) {
    notes.push("This is a lighter meal, so you may need more food later to hit your daily target.");
  } else {
    notes.push("This meal is close to a normal meal size for your current target.");
  }

  notes.push(
    "Remember: calories are the baseline. The meal does not have to be perfect by itself. What matters most is how your full day adds up."
  );

  return notes.join(" ");
}

function MacroCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function ChatBubble({ role, children }) {
  const isCoach = role === "coach";

  return (
    <div className={`flex ${isCoach ? "justify-start" : "justify-end"}`}>
      <div
        className={[
          "max-w-3xl rounded-3xl border p-4 text-sm leading-6",
          isCoach
            ? "border-[#00BF63]/25 bg-[#00BF63]/10 text-white/75"
            : "border-white/10 bg-white/[0.06] text-white/80",
        ].join(" ")}
      >
        <p
          className={`mb-1 text-xs font-black uppercase tracking-[0.2em] ${
            isCoach ? "text-[#00BF63]" : "text-white/40"
          }`}
        >
          {isCoach ? "Nutrition Coach" : "Client Answers"}
        </p>
        {children}
      </div>
    </div>
  );
}

export default function ClientNutritionMacroHelper() {
  const [activeMode, setActiveMode] = useState("");
  const [form, setForm] = useState({
    sex: "male",
    age: "30",
    heightFeet: "5",
    heightInches: "10",
    weightPounds: "185",
    goal: "fat-loss",
    mealsPerDay: "4",
    activity: "light-movement",
  });

  const [hasCalculated, setHasCalculated] = useState(false);
  const [mealInput, setMealInput] = useState("");
  const [mealFeedback, setMealFeedback] = useState(null);

  const targets = useMemo(() => calculateNutritionTargets(form), [form]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setHasCalculated(true);
  }

  function handleMealEstimate(event) {
    event.preventDefault();
    setMealFeedback(estimateMealFromText(mealInput));
  }

  function handleStartOver() {
    setActiveMode("");
    setHasCalculated(false);
    setMealInput("");
    setMealFeedback(null);
  }

  return (
    <article
      aria-label="No Limit Nutrition Coach"
      className="mt-4 rounded-3xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00BF63]">
            No Limit Nutrition Coach
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">
            Build your target. Check your meals. Stay consistent.
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            A simple chat-style nutrition tool for daily calories, macros, and meal feedback.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartOver}
          className="w-fit rounded-full border border-white/15 bg-black/40 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
        >
          Start Over
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        <ChatBubble role="coach">
          <p className="font-black text-white">What do you need help with today?</p>
          <p className="mt-2">
            I can help two ways: build your daily calorie and macro target, or estimate what you already ate.
            Start with one option below. Keep it simple, and I will walk you through it.
          </p>
        </ChatBubble>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            aria-label="Build My Target"
            onClick={() => {
              setActiveMode("target");
              setHasCalculated(false);
            }}
            className={`rounded-3xl border p-5 text-left transition ${
              activeMode === "target"
                ? "border-[#00BF63] bg-[#00BF63]/15"
                : "border-white/10 bg-black/40 hover:border-[#00BF63]/60"
            }`}
          >
            <p className="text-lg font-black text-white">Build My Target</p>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Calculate your daily calories, protein, carbs, and fats.
            </p>
          </button>

          <button
            type="button"
            aria-label="Check What I Ate"
            onClick={() => setActiveMode("meal")}
            className={`rounded-3xl border p-5 text-left transition ${
              activeMode === "meal"
                ? "border-[#00BF63] bg-[#00BF63]/15"
                : "border-white/10 bg-black/40 hover:border-[#00BF63]/60"
            }`}
          >
            <p className="text-lg font-black text-white">Check What I Ate</p>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Estimate calories and macros from a meal or snack.
            </p>
          </button>
        </div>

        {activeMode === "target" && (
          <>
            <ChatBubble role="coach">
              <p>
                Let&apos;s keep this simple. Answer these basics first and I&apos;ll build your starting calorie and macro target.
              </p>
              <p className="mt-2">
                I need sex, age, height, weight, goal, meals per day, and what kind of job or daily activity you normally have.
              </p>
            </ChatBubble>

            <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-black/40 p-4">
              <p className="text-sm font-black text-[#00BF63]">Basic Questions</p>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Sex
                  <select
                    aria-label="Sex"
                    value={form.sex}
                    onChange={(event) => updateField("sex", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-base font-black text-white outline-none transition focus:border-[#00BF63]"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>

                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Age
                  <input
                    aria-label="Age"
                    inputMode="numeric"
                    value={form.age}
                    onChange={(event) => updateField("age", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-base font-black text-white outline-none transition focus:border-[#00BF63]"
                  />
                </label>

                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Height feet
                  <input
                    aria-label="Height feet"
                    inputMode="numeric"
                    value={form.heightFeet}
                    onChange={(event) => updateField("heightFeet", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-base font-black text-white outline-none transition focus:border-[#00BF63]"
                  />
                </label>

                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Height inches
                  <input
                    aria-label="Height inches"
                    inputMode="numeric"
                    value={form.heightInches}
                    onChange={(event) => updateField("heightInches", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-base font-black text-white outline-none transition focus:border-[#00BF63]"
                  />
                </label>

                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Current body weight
                  <input
                    aria-label="Current body weight in pounds"
                    inputMode="numeric"
                    value={form.weightPounds}
                    onChange={(event) => updateField("weightPounds", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-base font-black text-white outline-none transition focus:border-[#00BF63]"
                  />
                </label>

                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Main goal
                  <select
                    aria-label="Main goal"
                    value={form.goal}
                    onChange={(event) => updateField("goal", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-base font-black text-white outline-none transition focus:border-[#00BF63]"
                  >
                    {nutritionGoals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Meals per day
                  <select
                    aria-label="Meals per day"
                    value={form.mealsPerDay}
                    onChange={(event) => updateField("mealsPerDay", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-base font-black text-white outline-none transition focus:border-[#00BF63]"
                  >
                    {["2", "3", "4", "5", "6"].map((mealCount) => (
                      <option key={mealCount} value={mealCount}>
                        {mealCount}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Job or daily activity
                  <select
                    aria-label="Job or daily activity"
                    value={form.activity}
                    onChange={(event) => updateField("activity", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-base font-black text-white outline-none transition focus:border-[#00BF63]"
                  >
                    {activityLevels.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-black text-[#00BF63]">Activity Help</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  {targets.activityConfig.label}: {targets.activityConfig.explanation}
                </p>
              </div>

              <button
                type="submit"
                className="mt-4 rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-[#00d36f]"
              >
                Show My Target
              </button>
            </form>
          </>
        )}

        {activeMode === "target" && hasCalculated && (
          <>
            <ChatBubble role="client">
              <p>
                {targets.sex === "male" ? "Male" : "Female"}, age {targets.age}, {targets.feet}
                &apos;{targets.inches}&quot;, {formatNumber(targets.weightPounds)} lb,{" "}
                {targets.goalConfig.label}, {targets.meals} meals per day, and{" "}
                {targets.activityConfig.label.toLowerCase()} daily activity.
              </p>
            </ChatBubble>

            <ChatBubble role="coach">
              <p>
                Based on your answers, your estimated maintenance is about{" "}
                <span className="font-black text-white">{formatMacro(targets.maintenance)} calories</span>.
              </p>
              <p className="mt-2">
                For <span className="font-black text-white">{targets.goalConfig.label}</span>, I would start you around{" "}
                <span className="font-black text-white">{formatMacro(targets.targetCalories)} calories</span>.
              </p>
              <p className="mt-2">{targets.goalConfig.coachExplanation}</p>
            </ChatBubble>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MacroCard label="Calories" value={formatMacro(targets.targetCalories)} />
              <MacroCard label="Protein" value={formatMacro(targets.protein, "g")} />
              <MacroCard label="Carbs" value={formatMacro(targets.carbs, "g")} />
              <MacroCard label="Fats" value={formatMacro(targets.fats, "g")} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
                <p className="text-sm font-black text-[#00BF63]">Goal Comparison</p>
                <div className="mt-3 grid gap-2">
                  {targets.comparisons.map((comparison) => (
                    <div key={comparison.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="font-black text-white">
                        {comparison.label}: about {formatMacro(comparison.calories)} calories
                      </p>
                      <p className="mt-1 text-sm text-white/55">{comparison.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
                <p className="text-sm font-black text-[#00BF63]">Calories Are The Baseline</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Calories are the baseline. Your meals do not have to be split perfectly even.
                  The goal is to get close to your daily calorie and macro targets by the end of the day.
                </p>

                <p className="mt-4 text-sm font-black text-white">How to use this:</p>
                <ul className="mt-2 grid gap-2 text-sm leading-6 text-white/65">
                  <li>1. Hit your daily calories first.</li>
                  <li>2. Keep protein close to the target.</li>
                  <li>3. Use carbs and fats to fill in the rest.</li>
                  <li>4. Meals do not have to be even.</li>
                  <li>5. One meal being high or low does not ruin the day.</li>
                </ul>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
              <p className="text-sm font-black text-[#00BF63]">Example Flexible Option</p>
              <p className="mt-2 text-sm leading-6 text-white/65">
                A simple split would be about {formatMacro(targets.perMealCalories)} calories,{" "}
                {formatMacro(targets.perMealProtein, "g")} protein,{" "}
                {formatMacro(targets.perMealCarbs, "g")} carbs, and{" "}
                {formatMacro(targets.perMealFats, "g")} fats per meal.
              </p>
              <p className="mt-2 text-sm leading-6 text-white/65">
                But you can also run the day flexibly:
              </p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {targets.flexibleMeals.map((meal) => (
                  <div key={meal.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                      {meal.label}
                    </p>
                    <p className="mt-1 font-black text-white">Around {formatMacro(meal.calories)} calories</p>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-sm leading-6 text-white/65">
                That still works because the full day adds up close to the target. The goal is not to make every meal perfect.
                The goal is to stay close to your daily calories, hit your protein, and use carbs and fats to fill in the rest.
              </p>
            </div>
          </>
        )}

        {activeMode === "meal" && (
          <section className="rounded-3xl border border-white/10 bg-black/40 p-4">
            <ChatBubble role="coach">
              <p className="font-black text-white">Tell me what you ate and I&apos;ll estimate calories and macros.</p>
              <p className="mt-2">
                For the best estimate, include portion sizes, brands when they matter, cooking style, drinks, sauces, oils, and extras.
              </p>
              <p className="mt-2">
                Example: 6 oz grilled chicken, 1 cup rice, broccoli, and a Premier Protein shake.
              </p>
            </ChatBubble>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-black text-[#00BF63]">Portion-Smart Meal Check</p>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Portion size + brand + cooking method = better feedback. You do not have to be perfect.
                Just get better over time.
              </p>
            </div>

            <form onSubmit={handleMealEstimate} className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">
                Meal description
                <input
                  aria-label="Meal description"
                  value={mealInput}
                  onChange={(event) => setMealInput(event.target.value)}
                  placeholder="Example: 3 eggs, 2 pieces of toast, and a protein shake"
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-base font-bold text-white outline-none transition placeholder:text-white/30 focus:border-[#00BF63]"
                />
              </label>

              <button
                type="submit"
                className="self-end rounded-full bg-[#00BF63] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-[#00d36f]"
              >
                Estimate Meal
              </button>
            </form>

            {mealFeedback && (
              <div className="mt-4 rounded-3xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-4">
                <p className="text-sm font-black text-[#00BF63]">Estimated Meal Feedback</p>
                <p className="mt-2 text-sm font-black text-white">
                  Estimate confidence: {mealFeedback.confidence}
                </p>

                {mealFeedback.matchedFoods.length > 0 ? (
                  <>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <MacroCard label="Calories" value={`About ${formatMacro(mealFeedback.totals.calories)}`} />
                      <MacroCard label="Protein" value={`About ${formatMacro(mealFeedback.totals.protein, "g")}`} />
                      <MacroCard label="Carbs" value={`About ${formatMacro(mealFeedback.totals.carbs, "g")}`} />
                      <MacroCard label="Fats" value={`About ${formatMacro(mealFeedback.totals.fats, "g")}`} />
                    </div>

                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                        Foods I recognized
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/65">
                        {mealFeedback.matchedFoods
                          .map((food) => `${Number(food.quantity.toFixed(1))} x ${food.label}`)
                          .join(", ")}
                      </p>
                    </div>
                  </>
                ) : null}

                <p className="mt-3 text-sm leading-6 text-white/70">
                  {buildMealCoachNote(mealFeedback.totals, targets)}
                </p>

                <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3">
                  <p className="text-sm font-black text-[#00BF63]">Accuracy Note</p>
                  <p className="mt-2 text-sm leading-6 text-white/65">
                    This is an estimate. Portion size and brand can change the numbers a lot,
                    especially for protein shakes, sauces, oils, peanut butter, rice, cereal, drinks, and restaurant meals.
                  </p>
                </div>

                <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3">
                  <p className="text-sm font-black text-[#00BF63]">One Helpful Follow-Up</p>
                  <p className="mt-2 text-sm leading-6 text-white/65">
                    {mealFeedback.followUpQuestion}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </article>
  );
}