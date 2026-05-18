import { useMemo, useState } from "react";

const nutritionGoals = [
  {
    id: "cutting",
    label: "Cutting",
    caloriesPerPound: 11.5,
    proteinPerPound: 1,
    fatRatio: 0.24,
    note: "A controlled deficit for dropping weight while keeping training performance steady.",
  },
  {
    id: "fat-loss",
    label: "Fat Loss",
    caloriesPerPound: 12.5,
    proteinPerPound: 1,
    fatRatio: 0.25,
    note: "A steady starting point for losing fat without making the plan feel extreme.",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    caloriesPerPound: 14,
    proteinPerPound: 0.9,
    fatRatio: 0.27,
    note: "A balanced target for holding body weight while building better habits and consistency.",
  },
  {
    id: "lean-bulk",
    label: "Lean Bulk",
    caloriesPerPound: 16,
    proteinPerPound: 0.85,
    fatRatio: 0.25,
    note: "A small surplus for building muscle while keeping the plan controlled.",
  },
];

const activityLevels = [
  { id: "light", label: "Light", multiplier: 0.95 },
  { id: "balanced", label: "Balanced", multiplier: 1 },
  { id: "high", label: "High", multiplier: 1.08 },
];

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function roundToNearest(value, step) {
  return Math.round(value / step) * step;
}

function formatMacro(value, suffix = "") {
  return `${Math.round(value).toLocaleString()}${suffix}`;
}

function calculateMacroTargets({ bodyWeight, goal, activity, mealCount }) {
  const safeWeight = clampNumber(bodyWeight, 90, 400, 185);
  const safeMeals = Math.min(6, Math.max(2, Number.parseInt(mealCount, 10) || 4));
  const goalConfig = nutritionGoals.find((item) => item.id === goal) || nutritionGoals[1];
  const activityConfig =
    activityLevels.find((item) => item.id === activity) || activityLevels[1];

  const calories = roundToNearest(
    safeWeight * goalConfig.caloriesPerPound * activityConfig.multiplier,
    25
  );
  const protein = roundToNearest(safeWeight * goalConfig.proteinPerPound, 5);
  const fats = roundToNearest(Math.max(45, (calories * goalConfig.fatRatio) / 9), 5);
  const carbCalories = Math.max(0, calories - protein * 4 - fats * 9);
  const carbs = roundToNearest(carbCalories / 4, 5);

  return {
    calories,
    protein,
    carbs,
    fats,
    meals: safeMeals,
    perMealCalories: roundToNearest(calories / safeMeals, 5),
    perMealProtein: roundToNearest(protein / safeMeals, 5),
    perMealCarbs: roundToNearest(carbs / safeMeals, 5),
    perMealFats: roundToNearest(fats / safeMeals, 5),
    goalConfig,
    activityConfig,
  };
}

export default function ClientNutritionMacroHelper() {
  const [bodyWeight, setBodyWeight] = useState("185");
  const [goal, setGoal] = useState("fat-loss");
  const [activity, setActivity] = useState("balanced");
  const [mealCount, setMealCount] = useState("4");

  const targets = useMemo(
    () => calculateMacroTargets({ bodyWeight, goal, activity, mealCount }),
    [bodyWeight, goal, activity, mealCount]
  );

  const targetCards = [
    { label: "Calories", value: formatMacro(targets.calories) },
    { label: "Protein", value: formatMacro(targets.protein, "g") },
    { label: "Carbs", value: formatMacro(targets.carbs, "g") },
    { label: "Fats", value: formatMacro(targets.fats, "g") },
  ];

  return (
    <article
      aria-label="AI Nutrition Macros Helper"
      className="mt-4 rounded-3xl border border-[#00BF63]/20 bg-[#00BF63]/10 p-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00BF63]">
            AI Nutrition Helper
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">Calories & Macros</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            Use this as a simple starting target. Your coach can adjust it based on hunger,
            progress, training energy, and weekly check-ins.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-white/65">
          Current goal: <span className="text-[#00BF63]">{targets.goalConfig.label}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">
          Body weight
          <input
            aria-label="Body weight in pounds"
            inputMode="numeric"
            min="90"
            max="400"
            value={bodyWeight}
            onChange={(event) => setBodyWeight(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-base font-black text-white outline-none transition focus:border-[#00BF63]"
          />
        </label>

        <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">
          Goal
          <select
            aria-label="Nutrition goal"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-base font-black text-white outline-none transition focus:border-[#00BF63]"
          >
            {nutritionGoals.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">
          Activity
          <select
            aria-label="Activity level"
            value={activity}
            onChange={(event) => setActivity(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-base font-black text-white outline-none transition focus:border-[#00BF63]"
          >
            {activityLevels.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">
          Meals per day
          <select
            aria-label="Meals per day"
            value={mealCount}
            onChange={(event) => setMealCount(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-base font-black text-white outline-none transition focus:border-[#00BF63]"
          >
            {["2", "3", "4", "5", "6"].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {targetCards.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-sm font-black text-[#00BF63]">Simple Meal Breakdown</p>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Split across {targets.meals} meals: about{" "}
            <span className="font-black text-white">
              {formatMacro(targets.perMealCalories)} calories,{" "}
              {formatMacro(targets.perMealProtein, "g")} protein,{" "}
              {formatMacro(targets.perMealCarbs, "g")} carbs, and{" "}
              {formatMacro(targets.perMealFats, "g")} fats
            </span>{" "}
            per meal.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="text-sm font-black text-[#00BF63]">Coach Note</p>
          <p className="mt-2 text-sm leading-6 text-white/65">
            {targets.goalConfig.note} These numbers are not a strict diet. They are a clean
            baseline for consistency, check-ins, and better coaching decisions.
          </p>
        </div>
      </div>
    </article>
  );
}