import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ExportPanel } from "../components/ExportPanel";
import { useMealsInRange, useWorkoutsInRange } from "../hooks/use-backend";
import type { Meal, Task, WaterLog, Workout } from "../types";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Range = "daily" | "weekly" | "monthly" | "yearly";

interface WorkoutPoint {
  label: string;
  workouts: number;
  volume: number;
}
interface NutritionPoint {
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
interface MacroPieSlice {
  name: string;
  value: number;
  color: string;
}
interface TaskPoint {
  label: string;
  completed: number;
  total: number;
}
interface WaterPoint {
  label: string;
  water: number;
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

function iso(d: Date): string {
  return d.toISOString().split("T")[0];
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function getRangeWindow(range: Range): { start: string; end: string } {
  const t = today();
  switch (range) {
    case "daily":
      return { start: iso(addDays(t, -6)), end: iso(t) };
    case "weekly":
      return { start: iso(addDays(t, -27)), end: iso(t) };
    case "monthly":
      return { start: iso(addDays(t, -364)), end: iso(t) };
    case "yearly":
      return { start: iso(addDays(t, -3 * 365)), end: iso(t) };
  }
}

// ─── Aggregation helpers ───────────────────────────────────────────────────────

function buildWorkoutPoints(items: Workout[], range: Range): WorkoutPoint[] {
  const t = today();
  if (range === "daily") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(t, i - 6);
      const key = iso(d);
      const ws = items.filter((w) => w.date === key);
      return {
        label: d.toLocaleDateString("en-US", {
          weekday: "short",
          day: "numeric",
        }),
        workouts: ws.length,
        volume: ws.reduce((s, w) => s + w.sets * w.reps * w.weightKg, 0),
      };
    });
  }
  if (range === "weekly") {
    return Array.from({ length: 4 }, (_, i) => {
      const wEnd = addDays(t, -(3 - i) * 7);
      const wStart = addDays(wEnd, -6);
      const ws = items.filter(
        (w) => w.date >= iso(wStart) && w.date <= iso(wEnd),
      );
      return {
        label: wStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        workouts: ws.length,
        volume: ws.reduce((s, w) => s + w.sets * w.reps * w.weightKg, 0),
      };
    });
  }
  if (range === "monthly") {
    return Array.from({ length: 12 }, (_, i) => {
      const month = new Date(t.getFullYear(), t.getMonth() - 11 + i, 1);
      const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
      const ws = items.filter(
        (w) => w.date >= iso(month) && w.date < iso(next),
      );
      return {
        label: month.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        workouts: ws.length,
        volume: ws.reduce((s, w) => s + w.sets * w.reps * w.weightKg, 0),
      };
    });
  }
  return Array.from({ length: 3 }, (_, i) => {
    const yr = t.getFullYear() - 2 + i;
    const ws = items.filter((w) => w.date.startsWith(`${yr}`));
    return {
      label: `${yr}`,
      workouts: ws.length,
      volume: ws.reduce((s, w) => s + w.sets * w.reps * w.weightKg, 0),
    };
  });
}

function buildNutritionPoints(items: Meal[], range: Range): NutritionPoint[] {
  const t = today();
  if (range === "daily") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(t, i - 6);
      const key = iso(d);
      const ms = items.filter((m) => m.date === key);
      return {
        label: d.toLocaleDateString("en-US", {
          weekday: "short",
          day: "numeric",
        }),
        calories: ms.reduce((s, m) => s + m.calories, 0),
        protein: ms.reduce((s, m) => s + m.proteinG, 0),
        carbs: ms.reduce((s, m) => s + m.carbsG, 0),
        fat: ms.reduce((s, m) => s + m.fatG, 0),
      };
    });
  }
  if (range === "weekly") {
    return Array.from({ length: 4 }, (_, i) => {
      const wEnd = addDays(t, -(3 - i) * 7);
      const wStart = addDays(wEnd, -6);
      const ms = items.filter(
        (m) => m.date >= iso(wStart) && m.date <= iso(wEnd),
      );
      return {
        label: wStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        calories: ms.reduce((s, m) => s + m.calories, 0),
        protein: ms.reduce((s, m) => s + m.proteinG, 0),
        carbs: ms.reduce((s, m) => s + m.carbsG, 0),
        fat: ms.reduce((s, m) => s + m.fatG, 0),
      };
    });
  }
  if (range === "monthly") {
    return Array.from({ length: 12 }, (_, i) => {
      const month = new Date(t.getFullYear(), t.getMonth() - 11 + i, 1);
      const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
      const ms = items.filter(
        (m) => m.date >= iso(month) && m.date < iso(next),
      );
      return {
        label: month.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        calories: ms.reduce((s, m) => s + m.calories, 0),
        protein: ms.reduce((s, m) => s + m.proteinG, 0),
        carbs: ms.reduce((s, m) => s + m.carbsG, 0),
        fat: ms.reduce((s, m) => s + m.fatG, 0),
      };
    });
  }
  return Array.from({ length: 3 }, (_, i) => {
    const yr = t.getFullYear() - 2 + i;
    const ms = items.filter((m) => m.date.startsWith(`${yr}`));
    return {
      label: `${yr}`,
      calories: ms.reduce((s, m) => s + m.calories, 0),
      protein: ms.reduce((s, m) => s + m.proteinG, 0),
      carbs: ms.reduce((s, m) => s + m.carbsG, 0),
      fat: ms.reduce((s, m) => s + m.fatG, 0),
    };
  });
}

function buildMacroPie(points: NutritionPoint[]): MacroPieSlice[] {
  const totalProtein = points.reduce((s, p) => s + p.protein, 0);
  const totalCarbs = points.reduce((s, p) => s + p.carbs, 0);
  const totalFat = points.reduce((s, p) => s + p.fat, 0);
  return [
    {
      name: "Protein",
      value: Math.round(totalProtein),
      color: "oklch(0.68 0.18 50)",
    },
    {
      name: "Carbs",
      value: Math.round(totalCarbs),
      color: "oklch(0.63 0.14 255)",
    },
    { name: "Fat", value: Math.round(totalFat), color: "oklch(0.82 0.16 88)" },
  ];
}

function buildTaskPoints(): TaskPoint[] {
  const t = today();
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(t, i - 6);
    const key = iso(d);
    const raw = localStorage.getItem(`tasks:${key}`);
    const tasks: Task[] = raw ? (JSON.parse(raw) as Task[]) : [];
    return {
      label: d.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
      }),
      completed: tasks.filter((tk) => tk.completed).length,
      total: tasks.length,
    };
  });
}

function buildWaterPoints(): WaterPoint[] {
  const t = today();
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(t, i - 6);
    const key = iso(d);
    const raw = localStorage.getItem(`water:${key}`);
    const log: WaterLog = raw
      ? (JSON.parse(raw) as WaterLog)
      : { date: key, totalMl: 0 };
    return {
      label: d.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
      }),
      water: log.totalMl,
    };
  });
}

function hasValues(
  data: Record<string, number | string>[],
  keys: string[],
): boolean {
  return data.some((row) => keys.some((k) => Number(row[k] ?? 0) > 0));
}

// ─── Design tokens ─────────────────────────────────────────────────────────────

const PINK = "oklch(0.65 0.23 354)";
const PINK_FADE = "oklch(0.65 0.23 354 / 0.18)";
const TEAL = "oklch(0.68 0.14 185)";
const AMBER = "oklch(0.68 0.18 50)";
const PURPLE = "oklch(0.62 0.18 290)";
const GRID_LINE = "oklch(0.5 0 0 / 0.1)";
const TICK = "oklch(0.52 0 0)";

// ─── Custom Tooltip ────────────────────────────────────────────────────────────

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3.5 py-2.5 shadow-elevated text-sm min-w-[140px]">
      <p className="font-display font-semibold text-foreground mb-2 text-xs uppercase tracking-wide opacity-70">
        {label}
      </p>
      {payload.map((entry) => (
        <div
          key={entry.name}
          className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5"
        >
          <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ background: entry.color }}
          />
          <span className="capitalize">{entry.name}</span>
          <span className="ml-auto font-semibold text-foreground tabular-nums">
            {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Pie Tooltip ───────────────────────────────────────────────────────────────

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: MacroPieSlice }[];
}) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: slice } = payload[0];
  return (
    <div className="rounded-xl border border-border bg-popover px-3.5 py-2.5 shadow-elevated text-sm">
      <div className="flex items-center gap-2 text-xs">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: slice.color }}
        />
        <span className="font-semibold text-foreground">{name}</span>
        <span className="ml-2 text-muted-foreground tabular-nums">
          {value.toLocaleString()}g
        </span>
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  message = "Not enough data yet — log some entries to see your progress",
}: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center select-none">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
        style={{ background: PINK_FADE }}
      >
        📊
      </div>
      <p className="font-display text-sm font-semibold text-foreground">
        Not enough data yet
      </p>
      <p className="text-muted-foreground text-xs max-w-[240px] leading-relaxed">
        {message}
      </p>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 h-[220px]">
        {[60, 80, 45, 90, 70, 55, 85].map((h) => (
          <Skeleton
            key={h}
            className="flex-1 rounded-t-md"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="flex-1 h-3 rounded-sm" />
        ))}
      </div>
    </div>
  );
}

// ─── Layout components ─────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
  accent,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <section
      className="rounded-2xl border border-border bg-card overflow-hidden shadow-subtle"
      data-ocid={`charts.${accent ?? title.toLowerCase()}.section`}
    >
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
        <span className="text-xl">{icon}</span>
        <h2 className="font-display font-bold text-base text-foreground">
          {title}
        </h2>
      </div>
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {children}
      </div>
    </section>
  );
}

function ChartCard({
  title,
  colSpan,
  children,
  loading,
}: {
  title: string;
  colSpan?: boolean;
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-background p-4 flex flex-col gap-3${colSpan ? " lg:col-span-2" : ""}`}
    >
      <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {loading ? <ChartSkeleton /> : children}
    </div>
  );
}

// ─── Range selector ────────────────────────────────────────────────────────────

const RANGES: { id: Range; label: string }[] = [
  { id: "daily", label: "Day" },
  { id: "weekly", label: "Week" },
  { id: "monthly", label: "Month" },
  { id: "yearly", label: "Year" },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ChartsPage() {
  const [range, setRange] = useState<Range>("daily");
  const { start, end } = useMemo(() => getRangeWindow(range), [range]);

  const { data: workouts = [], isLoading: loadingWorkouts } =
    useWorkoutsInRange(start, end);
  const { data: meals = [], isLoading: loadingMeals } = useMealsInRange(
    start,
    end,
  );

  const workoutPoints = useMemo(
    () => buildWorkoutPoints(workouts, range),
    [workouts, range],
  );
  const nutritionPoints = useMemo(
    () => buildNutritionPoints(meals, range),
    [meals, range],
  );
  const macroPie = useMemo(
    () => buildMacroPie(nutritionPoints),
    [nutritionPoints],
  );
  const taskPoints = useMemo(() => buildTaskPoints(), []);
  const waterPoints = useMemo(() => buildWaterPoints(), []);

  const hasWorkouts = hasValues(
    workoutPoints as unknown as Record<string, number | string>[],
    ["workouts"],
  );
  const hasVolume = hasValues(
    workoutPoints as unknown as Record<string, number | string>[],
    ["volume"],
  );
  const hasCalories = hasValues(
    nutritionPoints as unknown as Record<string, number | string>[],
    ["calories"],
  );
  const hasMacroData = macroPie.some((s) => s.value > 0);
  const hasTasks = hasValues(
    taskPoints as unknown as Record<string, number | string>[],
    ["total"],
  );
  const hasWater = hasValues(
    waterPoints as unknown as Record<string, number | string>[],
    ["water"],
  );

  const axisProps = {
    tick: { fontSize: 11, fill: TICK },
    axisLine: false,
    tickLine: false,
  };

  const legendStyle = {
    wrapperStyle: { fontSize: 11, paddingTop: 8 },
    formatter: (value: string) => (
      <span style={{ color: TICK }} className="capitalize">
        {value}
      </span>
    ),
  };

  return (
    <div className="min-h-screen bg-background" data-ocid="charts.page">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Progress Charts
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Visualize your fitness journey across all dimensions
          </p>
        </div>

        {/* Range selector tabs */}
        <div
          className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1"
          data-ocid="charts.range_selector"
        >
          {RANGES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              data-ocid={`charts.range.${id}_tab`}
              onClick={() => setRange(id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-smooth ${
                range === id
                  ? "text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={range === id ? { background: PINK } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Section 1: Fitness ─────────────────────────────────────────── */}
        <Section title="Fitness" icon="🏋️" accent="fitness">
          {/* Workouts completed — BarChart with pink bars */}
          <ChartCard title="Workouts Completed" loading={loadingWorkouts}>
            {hasWorkouts ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={workoutPoints}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={GRID_LINE}
                    vertical={false}
                  />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend {...legendStyle} />
                  <Bar
                    dataKey="workouts"
                    fill={PINK}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                    name="workouts"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Log workouts to track your sessions over time" />
            )}
          </ChartCard>

          {/* Total volume — AreaChart */}
          <ChartCard
            title="Total Volume (sets × reps × kg)"
            loading={loadingWorkouts}
          >
            {hasVolume ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={workoutPoints}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PINK} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={PINK} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_LINE} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend {...legendStyle} />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke={PINK}
                    strokeWidth={2.5}
                    fill="url(#volGrad)"
                    dot={{ fill: PINK, r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: PINK, strokeWidth: 0 }}
                    name="volume (kg)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Start logging weighted exercises to see volume trends" />
            )}
          </ChartCard>
        </Section>

        {/* ── Section 2: Nutrition ───────────────────────────────────────── */}
        <Section title="Nutrition" icon="🥗" accent="nutrition">
          {/* Calorie intake — AreaChart with pink fill */}
          <ChartCard title="Daily Calorie Intake" loading={loadingMeals}>
            {hasCalories ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={nutritionPoints}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PINK} stopOpacity={0.32} />
                      <stop offset="95%" stopColor={PINK} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={GRID_LINE}
                    vertical={false}
                  />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend {...legendStyle} />
                  <Area
                    type="monotone"
                    dataKey="calories"
                    stroke={PINK}
                    strokeWidth={2.5}
                    fill="url(#calGrad)"
                    dot={{ fill: PINK, r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: PINK, strokeWidth: 0 }}
                    name="calories (kcal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Log meals to track your calorie intake over time" />
            )}
          </ChartCard>

          {/* Macro Breakdown PieChart — protein=orange, carbs=blue, fat=yellow */}
          <ChartCard
            title="Macro Breakdown (Period Total)"
            loading={loadingMeals}
          >
            {hasMacroData ? (
              <div className="flex flex-col items-center gap-2">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={macroPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={88}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {macroPie.map((slice) => (
                        <Cell
                          key={slice.name}
                          fill={slice.color}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend
                      formatter={(value: string) => (
                        <span
                          style={{ color: TICK, fontSize: 11 }}
                          className="capitalize"
                        >
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 flex-wrap justify-center -mt-2">
                  {macroPie.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: s.color }}
                      />
                      <span>{s.name}</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {s.value}g
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState message="Log meals with macro details to see the breakdown" />
            )}
          </ChartCard>
        </Section>

        {/* ── Section 3: Water Intake ────────────────────────────────────── */}
        <Section title="Hydration" icon="💧" accent="water">
          {/* Water intake — LineChart with blue line */}
          <ChartCard title="Daily Water Intake — Last 7 Days" colSpan>
            {hasWater ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={waterPoints}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={TEAL} stopOpacity={0.22} />
                      <stop offset="95%" stopColor={TEAL} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_LINE} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend {...legendStyle} />
                  <ReferenceLine
                    y={2000}
                    stroke={AMBER}
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    label={{
                      value: "2000 ml goal",
                      position: "insideTopRight",
                      fontSize: 10,
                      fill: AMBER,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="water"
                    stroke={TEAL}
                    strokeWidth={2.5}
                    dot={{ fill: TEAL, r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: TEAL, strokeWidth: 0 }}
                    name="water (ml)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Log your water intake daily to track hydration progress" />
            )}
          </ChartCard>
        </Section>

        {/* ── Section 4: Task Completion ─────────────────────────────────── */}
        <Section title="Task Completion" icon="✅" accent="tasks">
          {/* Task completion % — LineChart with purple line */}
          <ChartCard title="Daily Task Completion % — Last 7 Days" colSpan>
            {hasTasks ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={taskPoints.map((p) => ({
                    ...p,
                    completionPct:
                      p.total > 0
                        ? Math.round((p.completed / p.total) * 100)
                        : 0,
                  }))}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_LINE} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v: number) => `${v}%`}
                    {...axisProps}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend {...legendStyle} />
                  <ReferenceLine
                    y={80}
                    stroke={AMBER}
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    label={{
                      value: "80% goal",
                      position: "insideTopRight",
                      fontSize: 10,
                      fill: AMBER,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completionPct"
                    stroke={PURPLE}
                    strokeWidth={2.5}
                    dot={{ fill: PURPLE, r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: PURPLE, strokeWidth: 0 }}
                    name="completion %"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Add and complete daily tasks to track your progress" />
            )}
          </ChartCard>
        </Section>

        {/* ── Export Section ─────────────────────────────────────────────── */}
        <ExportPanel />
      </div>
    </div>
  );
}
