import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRouter } from "@tanstack/react-router";
import {
  BarChart2,
  CalendarDays,
  CheckSquare,
  Droplets,
  Dumbbell,
  Flame,
  Heart,
  ListTodo,
  MessageCircle,
  Salad,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  UtensilsCrossed,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MiniProgressBar } from "../components/MiniProgressBar";
import { StatCard } from "../components/StatCard";
import {
  todayISO,
  useDailySummary,
  useFeed,
  useGoals,
  useMealsForDate,
  useMyProfile,
  useStories,
  useTasksForDate,
  useToggleTask,
  useWaterForDate,
  useWorkoutsForDate,
  useWorkoutsInRange,
} from "../hooks/use-backend";
import type { Story } from "../types";

const WATER_GOAL_ML = 2000; // 8+ cups

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Returns [Monday ISO, Sunday ISO] for the week containing `dateStr` */
function getWeekRange(dateStr: string): [string, string] {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return [mon.toISOString().split("T")[0], sun.toISOString().split("T")[0]];
}

// ── Circular progress ring ──────────────────────────────────────────────────
interface GoalRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color: string; // oklch(...)
  icon: React.ReactNode;
  label: string;
  current: string;
  target: string;
  badge?: React.ReactNode; // emoji/icon if goal met
  goalMet?: boolean;
  ocid?: string;
}

function GoalRing({
  value,
  size = 90,
  strokeWidth = 8,
  color,
  icon,
  label,
  current,
  target,
  badge,
  goalMet,
  ocid,
}: GoalRingProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const dash = (pct / 100) * circ;

  return (
    <div
      className="flex flex-col items-center gap-2"
      data-ocid={ocid}
      aria-label={`${label}: ${current} of ${target}`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={strokeWidth}
            stroke={color}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-foreground opacity-60">{icon}</span>
          <span className="font-display font-bold text-sm text-foreground leading-none">
            {Math.round(pct)}%
          </span>
        </div>
        {goalMet && badge && (
          <div
            className="absolute -top-1 -right-1 text-base leading-none"
            role="img"
            aria-label="Goal met!"
          >
            {badge}
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-foreground leading-tight">
          {label}
        </p>
        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
          {current} / {target}
        </p>
      </div>
    </div>
  );
}

// ── Story viewer overlay ────────────────────────────────────────────────────
function StoryViewer({
  stories,
  startIndex,
  onClose,
}: {
  stories: Story[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const story = stories[idx];
  if (!story) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      open
      className="fixed inset-0 z-50 m-0 w-screen h-screen flex items-center justify-center bg-black/90 backdrop-blur-sm border-0 p-0 max-w-none max-h-none"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      data-ocid="dashboard.story_viewer.dialog"
    >
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {/* Story image */}
        {story.photoUrl ? (
          <img
            src={story.photoUrl}
            alt={story.text ?? "Story"}
            className="w-full aspect-[9/16] object-cover"
          />
        ) : (
          <div
            className="w-full aspect-[9/16] flex items-center justify-center"
            style={{ background: "oklch(var(--primary)/0.15)" }}
          >
            <span className="font-display text-2xl font-bold text-primary text-center px-6">
              {story.text}
            </span>
          </div>
        )}

        {/* Overlay top bar */}
        <div className="absolute top-0 inset-x-0 p-4 flex items-center gap-3 bg-gradient-to-b from-black/60 to-transparent">
          <Avatar className="w-8 h-8 ring-2 ring-white/60">
            <AvatarImage src={story.photoUrl} />
            <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
              {story.authorUsername.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight truncate">
              @{story.authorUsername}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-smooth"
            data-ocid="dashboard.story_viewer.close_button"
            aria-label="Close story"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Text caption */}
        {story.text && (
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <p className="text-sm text-white font-medium">{story.text}</p>
          </div>
        )}

        {/* Progress dots */}
        {stories.length > 1 && (
          <div className="absolute top-2 inset-x-4 flex gap-1">
            {stories.map((s, i) => (
              <div
                key={s.id}
                className="flex-1 h-0.5 rounded-full transition-smooth"
                style={{
                  background:
                    i <= idx
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
        )}

        {/* Navigation arrows */}
        {idx > 0 && (
          <button
            type="button"
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-smooth"
            onClick={() => setIdx((i) => i - 1)}
            aria-label="Previous story"
          >
            <span className="text-lg leading-none">‹</span>
          </button>
        )}
        {idx < stories.length - 1 && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-smooth"
            onClick={() => setIdx((i) => i + 1)}
            aria-label="Next story"
          >
            <span className="text-lg leading-none">›</span>
          </button>
        )}
      </div>
    </dialog>
  );
}

// ── Weekly bar chart ────────────────────────────────────────────────────────
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface WeeklyChartProps {
  weekWorkouts: Array<{ date: string }>;
  weekStart: string;
}

function WeeklyWorkoutChart({ weekWorkouts, weekStart }: WeeklyChartProps) {
  const data = DAYS.map((day, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    const count = weekWorkouts.filter((w) => w.date === iso).length;
    return { day, count, isToday: iso === todayISO() };
  });

  return (
    <ResponsiveContainer width="100%" height={100}>
      <BarChart
        data={data}
        barSize={18}
        margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
      >
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: "oklch(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "oklch(var(--primary)/0.06)" }}
          contentStyle={{
            background: "oklch(var(--card))",
            border: "1px solid oklch(var(--border))",
            borderRadius: "0.5rem",
            fontSize: 11,
            color: "oklch(var(--foreground))",
            padding: "4px 8px",
          }}
          formatter={(val: number) => [
            `${val} workout${val !== 1 ? "s" : ""}`,
            "",
          ]}
          labelFormatter={(label: string) => label}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={`cell-${entry.day}`}
              fill={
                entry.count > 0
                  ? entry.isToday
                    ? "oklch(var(--primary))"
                    : "oklch(var(--primary)/0.55)"
                  : "oklch(var(--muted))"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Dashboard skeleton ──────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-8" data-ocid="dashboard.loading_state">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
    </div>
  );
}

// ── Quick links ─────────────────────────────────────────────────────────────
const QUICK_LINKS = [
  {
    label: "Daily Planner",
    icon: ListTodo,
    path: "/planner",
    ocid: "dashboard.quicklink.planner",
  },
  {
    label: "Fitness Log",
    icon: Dumbbell,
    path: "/fitness",
    ocid: "dashboard.quicklink.fitness",
  },
  {
    label: "Nutrition Log",
    icon: UtensilsCrossed,
    path: "/nutrition",
    ocid: "dashboard.quicklink.nutrition",
  },
  {
    label: "View Charts",
    icon: BarChart2,
    path: "/charts",
    ocid: "dashboard.quicklink.charts",
  },
] as const;

// ── Main page ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const today = todayISO();
  const router = useRouter();
  const [storyViewerIdx, setStoryViewerIdx] = useState<number | null>(null);

  const { data: summary, isLoading: summaryLoading } = useDailySummary(today);
  const { data: tasks = [], isLoading: tasksLoading } = useTasksForDate(today);
  const { data: workouts = [] } = useWorkoutsForDate(today);
  const { data: meals = [] } = useMealsForDate(today);
  const { data: water } = useWaterForDate(today);
  const toggleTask = useToggleTask();
  const { data: stories = [] } = useStories();
  const { data: feed = [] } = useFeed();
  const { data: goals } = useGoals();
  const { data: myProfile } = useMyProfile();

  const [weekStart, weekEnd] = getWeekRange(today);
  const { data: weekWorkouts = [] } = useWorkoutsInRange(weekStart, weekEnd);

  const workoutDaysThisWeek = new Set(weekWorkouts.map((w) => w.date)).size;
  const dailyCalorieTarget = goals?.dailyCalorieTarget ?? 2000;
  const weeklyMinWorkouts = goals?.weeklyMinWorkouts ?? 3;

  if (summaryLoading || tasksLoading) return <DashboardSkeleton />;

  // ── Computed metrics ──
  const taskPct =
    summary && summary.tasksTotal > 0
      ? (summary.tasksCompleted / summary.tasksTotal) * 100
      : 0;
  const waterPct = water ? (water.totalMl / WATER_GOAL_ML) * 100 : 0;
  const caloriesConsumed = summary?.totalCaloriesConsumed ?? 0;
  const calPct = Math.min(100, (caloriesConsumed / dailyCalorieTarget) * 100);
  const workoutProgressPct = Math.min(
    100,
    (workoutDaysThisWeek / weeklyMinWorkouts) * 100,
  );
  const workoutGoalMet = workoutDaysThisWeek >= weeklyMinWorkouts;
  const waterGoalMet = (water?.totalMl ?? 0) >= WATER_GOAL_ML;
  const calGoalMet = calPct >= 80;
  const taskGoalMet = taskPct === 100 && (summary?.tasksTotal ?? 0) > 0;

  const hasGoals = goals !== undefined;

  const displayName =
    myProfile?.username && myProfile.username !== "you"
      ? myProfile.username
      : "there";

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-8 pb-4" data-ocid="dashboard.page">
      {/* Story viewer overlay */}
      {storyViewerIdx !== null && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          startIndex={storyViewerIdx}
          onClose={() => setStoryViewerIdx(null)}
        />
      )}

      {/* ── Hero header ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-elevated px-7 py-6">
        <div
          className="absolute -top-12 -right-12 w-56 h-56 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, oklch(var(--primary)/0.15) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary tracking-wide">
                {formattedDate}
              </span>
            </div>
            <h1
              className="font-display font-bold text-3xl md:text-4xl text-foreground leading-tight"
              data-ocid="dashboard.greeting"
            >
              {getGreeting()},{" "}
              <span className="text-primary">{displayName}!</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {summary && summary.tasksTotal > 0
                ? `${summary.tasksCompleted} of ${summary.tasksTotal} tasks done today`
                : "No tasks logged yet — start your day strong!"}
            </p>
          </div>
          <div
            className="flex flex-wrap gap-2"
            data-ocid="dashboard.quicklinks.section"
          >
            {QUICK_LINKS.map(({ label, icon: Icon, path, ocid }) => (
              <Button
                key={path}
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 border-border hover:border-primary/50 hover:text-primary transition-smooth"
                onClick={() => router.navigate({ to: path })}
                data-ocid={ocid}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Goal Progress Rings ────────────────────────────────────── */}
      <Card
        className="bg-card border-border shadow-subtle"
        data-ocid="dashboard.goals.section"
      >
        <CardHeader className="pb-3 px-6 pt-5">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Goal Progress
            </CardTitle>
            {!hasGoals && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary h-6 px-2 hover:bg-primary/10"
                onClick={() =>
                  router.navigate({
                    to: `/profile/${myProfile?.userId ?? "me"}`,
                  })
                }
                data-ocid="dashboard.goals.set_goals_button"
              >
                Set Goals
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {!hasGoals ? (
            <div
              className="flex flex-col items-center py-6 gap-3"
              data-ocid="dashboard.goals.empty_state"
            >
              <Trophy className="w-10 h-10 text-muted-foreground/30" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  No goals set yet
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set your daily calorie target and weekly workout goals in your
                  profile.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/10 text-xs mt-1"
                onClick={() =>
                  router.navigate({
                    to: `/profile/${myProfile?.userId ?? "me"}`,
                  })
                }
                data-ocid="dashboard.goals.empty_state.primary_button"
              >
                Go to Profile & Set Goals
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
                <GoalRing
                  value={calPct}
                  color="oklch(var(--primary))"
                  icon={<Flame className="w-4 h-4" />}
                  label="Calories"
                  current={`${caloriesConsumed} kcal`}
                  target={`${dailyCalorieTarget} kcal`}
                  goalMet={calGoalMet}
                  badge="🔥"
                  ocid="dashboard.goals.calories.ring"
                />
                <GoalRing
                  value={waterPct}
                  color="oklch(0.65 0.14 255)"
                  icon={
                    <Droplets
                      className="w-4 h-4"
                      style={{ color: "oklch(0.65 0.14 255)" }}
                    />
                  }
                  label="Hydration"
                  current={`${water?.totalMl ?? 0} ml`}
                  target={`${WATER_GOAL_ML} ml`}
                  goalMet={waterGoalMet}
                  badge="💧"
                  ocid="dashboard.goals.water.ring"
                />
                <GoalRing
                  value={workoutProgressPct}
                  color="oklch(0.65 0.15 145)"
                  icon={
                    <Dumbbell
                      className="w-4 h-4"
                      style={{ color: "oklch(0.65 0.15 145)" }}
                    />
                  }
                  label="Workouts"
                  current={`${workoutDaysThisWeek} days`}
                  target={`${weeklyMinWorkouts} / wk`}
                  goalMet={workoutGoalMet}
                  badge="⚡"
                  ocid="dashboard.goals.workouts.ring"
                />
                <GoalRing
                  value={taskPct}
                  color="oklch(0.62 0.18 300)"
                  icon={
                    <CheckSquare
                      className="w-4 h-4"
                      style={{ color: "oklch(0.62 0.18 300)" }}
                    />
                  }
                  label="Tasks"
                  current={`${summary?.tasksCompleted ?? 0}`}
                  target={`${summary?.tasksTotal ?? 0}`}
                  goalMet={taskGoalMet}
                  badge="⭐"
                  ocid="dashboard.goals.tasks.ring"
                />
              </div>

              {/* Mini bars below rings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MiniProgressBar
                  value={calPct}
                  label="Calories"
                  currentLabel={`${caloriesConsumed} kcal`}
                  targetLabel={`${dailyCalorieTarget}`}
                  color="pink"
                  size="md"
                />
                <MiniProgressBar
                  value={waterPct}
                  label="Hydration"
                  currentLabel={`${water?.totalMl ?? 0} ml`}
                  targetLabel={`${WATER_GOAL_ML} ml`}
                  color="blue"
                  size="md"
                />
                <MiniProgressBar
                  value={workoutProgressPct}
                  label="Weekly Workouts"
                  currentLabel={`${workoutDaysThisWeek}`}
                  targetLabel={`${weeklyMinWorkouts} days`}
                  color="green"
                  size="md"
                />
                <MiniProgressBar
                  value={taskPct}
                  label="Task Completion"
                  currentLabel={`${summary?.tasksCompleted ?? 0}`}
                  targetLabel={`${summary?.tasksTotal ?? 0} tasks`}
                  color="purple"
                  size="md"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Macro stat cards ───────────────────────────────────────── */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        data-ocid="dashboard.stats.section"
      >
        <StatCard
          label="Calories"
          value={caloriesConsumed}
          unit="kcal"
          icon={Flame}
          accent={calGoalMet}
          color="pink"
          trendValue={`of ${dailyCalorieTarget} goal`}
        />
        <StatCard
          label="Protein"
          value={Math.round(summary?.totalProteinG ?? 0)}
          unit="g"
          icon={Salad}
          color="green"
          trendValue="today"
        />
        <StatCard
          label="Carbs"
          value={Math.round(summary?.totalCarbsG ?? 0)}
          unit="g"
          icon={TrendingUp}
          color="orange"
          trendValue="today"
        />
        <StatCard
          label="Fat"
          value={Math.round(summary?.totalFatG ?? 0)}
          unit="g"
          icon={Target}
          color="purple"
          trendValue="today"
        />
      </div>

      {/* ── Weekly activity chart + Tasks ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekly bar chart */}
        <Card
          className="bg-card border-border shadow-subtle"
          data-ocid="dashboard.weekly_chart.card"
        >
          <CardHeader className="pb-2 px-5 pt-5">
            <CardTitle className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Weekly Workouts
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(weekStart).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
              {" – "}
              {new Date(weekEnd).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
              {" · "}
              <span className="font-semibold text-foreground">
                {workoutDaysThisWeek}
              </span>
              {` / ${weeklyMinWorkouts} days`}
              {workoutGoalMet && (
                <span className="ml-1" aria-label="Goal met">
                  ⚡
                </span>
              )}
            </p>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            <WeeklyWorkoutChart
              weekWorkouts={weekWorkouts}
              weekStart={weekStart}
            />
          </CardContent>
        </Card>

        {/* Task checklist */}
        <Card
          className="bg-card border-border shadow-subtle"
          data-ocid="dashboard.tasks.card"
        >
          <CardHeader className="pb-3 px-5 pt-5 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" />
              Daily Tasks
              {taskGoalMet && (
                <span className="text-base ml-0.5" aria-label="All done">
                  ⭐
                </span>
              )}
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => router.navigate({ to: "/planner" })}
              data-ocid="dashboard.tasks.manage_link"
            >
              Manage
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2">
            {tasks.length === 0 ? (
              <div
                className="flex flex-col items-center py-6 gap-2"
                data-ocid="dashboard.tasks.empty_state"
              >
                <ListTodo className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground text-center">
                  No tasks yet. Add some in Daily Planner.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs border-primary/30 text-primary hover:bg-primary/10 mt-1"
                  onClick={() => router.navigate({ to: "/planner" })}
                  data-ocid="dashboard.tasks.empty_state.primary_button"
                >
                  Add Tasks
                </Button>
              </div>
            ) : (
              tasks.slice(0, 6).map((task, i) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 py-1.5 group"
                  data-ocid={`dashboard.tasks.item.${i + 1}`}
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() =>
                      toggleTask.mutate({ date: today, id: task.id })
                    }
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    data-ocid={`dashboard.tasks.checkbox.${i + 1}`}
                  />
                  <span
                    className={`text-sm flex-1 min-w-0 truncate transition-smooth ${
                      task.completed
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.completed && (
                    <Star
                      className="w-3 h-3 shrink-0 text-primary/50"
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Stories + Feed preview ─────────────────────────────────── */}
      <Card
        className="bg-card border-border shadow-subtle"
        data-ocid="dashboard.social.section"
      >
        <CardHeader className="pb-3 px-5 pt-5 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Me &amp; People
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => router.navigate({ to: "/people" })}
            data-ocid="dashboard.social.see_all_link"
          >
            See all
          </Button>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          {/* Stories carousel */}
          {stories.length > 0 && (
            <div
              className="flex gap-3 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none" }}
              data-ocid="dashboard.social.stories.section"
            >
              {stories.map((story, i) => (
                <button
                  key={story.id}
                  type="button"
                  className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
                  onClick={() => setStoryViewerIdx(i)}
                  data-ocid={`dashboard.social.story_item.${i + 1}`}
                  aria-label={`View ${story.authorUsername}'s story`}
                >
                  <div
                    className="rounded-full p-0.5 transition-smooth group-hover:scale-105"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(var(--primary)) 0%, oklch(0.6 0.25 300) 100%)",
                    }}
                  >
                    <div className="rounded-full p-0.5 bg-background">
                      <Avatar className="w-11 h-11">
                        <AvatarImage src={story.photoUrl} />
                        <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
                          {story.authorUsername.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground max-w-[44px] truncate">
                    {story.authorUsername}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Divider between stories and feed */}
          {stories.length > 0 && feed.length > 0 && (
            <div className="border-t border-border" />
          )}

          {/* Feed preview — first 3 posts */}
          {feed.length === 0 ? (
            <div
              className="flex flex-col items-center py-4 gap-2"
              data-ocid="dashboard.social.empty_state"
            >
              <Users className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground text-center">
                Follow people on the People page to see their updates here.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => router.navigate({ to: "/people" })}
                data-ocid="dashboard.social.empty_state.primary_button"
              >
                Explore People
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {feed.slice(0, 3).map((post, i) => (
                <div
                  key={post.id}
                  className="flex items-start gap-3"
                  data-ocid={`dashboard.social.post.item.${i + 1}`}
                >
                  <Avatar className="w-8 h-8 shrink-0 ring-1 ring-primary/20">
                    <AvatarImage src={post.authorAvatarUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {post.authorUsername.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">
                        @{post.authorUsername}
                      </p>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {new Date(post.timestamp).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                      {post.text}
                    </p>
                    {post.photoUrl && (
                      <img
                        src={post.photoUrl}
                        alt="Post"
                        className="mt-2 rounded-lg w-full max-h-32 object-cover"
                      />
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Heart className="w-3 h-3" />
                        {post.likeCount}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MessageCircle className="w-3 h-3" />
                        {post.commentCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <Link
                to="/people"
                className="block text-center text-xs text-primary hover:underline pt-1 font-medium"
                data-ocid="dashboard.social.see_more_link"
              >
                See all posts →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Workout & nutrition summary ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Workouts */}
        <Card
          className="bg-card border-border shadow-subtle"
          data-ocid="dashboard.workouts.card"
        >
          <CardHeader className="pb-3 px-5 pt-5 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" />
              Today&apos;s Workouts
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => router.navigate({ to: "/fitness" })}
              data-ocid="dashboard.workouts.manage_link"
            >
              Log Workout
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2">
            {workouts.length === 0 ? (
              <div
                className="flex flex-col items-center py-5 gap-2"
                data-ocid="dashboard.workouts.empty_state"
              >
                <Dumbbell className="w-7 h-7 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground text-center">
                  No workouts logged yet today.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs border-primary/30 text-primary hover:bg-primary/10 mt-1"
                  onClick={() => router.navigate({ to: "/fitness" })}
                  data-ocid="dashboard.workouts.empty_state.primary_button"
                >
                  Log Workout
                </Button>
              </div>
            ) : (
              workouts.slice(0, 4).map((w, i) => (
                <div
                  key={w.id}
                  className="flex items-start justify-between py-1.5"
                  data-ocid={`dashboard.workouts.item.${i + 1}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {w.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {w.sets}×{w.reps}
                      {w.weightKg > 0 ? ` · ${w.weightKg}kg` : ""}
                      {" · "}
                      {w.durationMin} min
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs ml-2 shrink-0 border-primary/30 text-primary"
                  >
                    {w.caloriesBurned} kcal
                  </Badge>
                </div>
              ))
            )}
            {workouts.length > 0 && summary && (
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Total burned
                </span>
                <span className="text-xs font-bold text-foreground">
                  {summary.totalCaloriesBurned} kcal
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nutrition log */}
        <Card
          className="bg-card border-border shadow-subtle"
          data-ocid="dashboard.nutrition.card"
        >
          <CardHeader className="pb-3 px-5 pt-5 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-primary" />
              Nutrition Log
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => router.navigate({ to: "/nutrition" })}
              data-ocid="dashboard.nutrition.manage_link"
            >
              Log Meal
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2">
            {meals.length === 0 ? (
              <div
                className="flex flex-col items-center py-5 gap-2"
                data-ocid="dashboard.nutrition.empty_state"
              >
                <UtensilsCrossed className="w-7 h-7 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground text-center">
                  No meals logged yet today.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs border-primary/30 text-primary hover:bg-primary/10 mt-1"
                  onClick={() => router.navigate({ to: "/nutrition" })}
                  data-ocid="dashboard.nutrition.empty_state.primary_button"
                >
                  Log Meal
                </Button>
              </div>
            ) : (
              <>
                {(["breakfast", "lunch", "dinner", "snack"] as const).map(
                  (type, i) => {
                    const mealItems = meals.filter((m) => m.mealType === type);
                    if (!mealItems.length) return null;
                    const cal = mealItems.reduce((s, m) => s + m.calories, 0);
                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between py-1"
                        data-ocid={`dashboard.nutrition.item.${i + 1}`}
                      >
                        <span className="text-sm capitalize text-foreground">
                          {type}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {mealItems.length} item
                            {mealItems.length > 1 ? "s" : ""}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {cal} kcal
                          </Badge>
                        </div>
                      </div>
                    );
                  },
                )}
                {summary && (
                  <div className="pt-2 border-t border-border mt-2 space-y-2">
                    <MiniProgressBar
                      value={calPct}
                      label="Calories"
                      currentLabel={`${caloriesConsumed}`}
                      targetLabel={`${dailyCalorieTarget} kcal`}
                      color="pink"
                      size="sm"
                    />
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {[
                        {
                          label: "Protein",
                          val: Math.round(summary.totalProteinG),
                          unit: "g",
                          color: "#22c55e",
                        },
                        {
                          label: "Carbs",
                          val: Math.round(summary.totalCarbsG),
                          unit: "g",
                          color: "oklch(0.7 0.18 60)",
                        },
                        {
                          label: "Fat",
                          val: Math.round(summary.totalFatG),
                          unit: "g",
                          color: "oklch(0.62 0.18 300)",
                        },
                      ].map(({ label, val, unit, color }) => (
                        <div
                          key={label}
                          className="flex flex-col items-center py-1.5 rounded-lg bg-muted/50"
                        >
                          <span
                            className="text-xs font-bold text-foreground"
                            style={{ color }}
                          >
                            {val}
                            {unit}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Weekly workout goal badge ──────────────────────────────── */}
      <Card
        className="bg-card border-border shadow-subtle"
        data-ocid="dashboard.weekly_goal.card"
      >
        <CardContent className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: workoutGoalMet
                  ? "oklch(0.65 0.15 145 / 0.15)"
                  : "oklch(var(--muted))",
              }}
            >
              {workoutGoalMet ? (
                <Zap
                  className="w-5 h-5"
                  style={{ color: "oklch(0.65 0.15 145)" }}
                />
              ) : (
                <Trophy className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">
                {workoutGoalMet
                  ? "Weekly goal achieved! 🎉"
                  : "Weekly workout goal"}
              </p>
              <p className="text-xs text-muted-foreground">
                {workoutDaysThisWeek} of {weeklyMinWorkouts} workout days this
                week
              </p>
            </div>
          </div>
          <Badge
            variant={workoutGoalMet ? "default" : "outline"}
            className={`font-semibold shrink-0 ${
              workoutGoalMet
                ? "text-primary-foreground"
                : "border-primary/30 text-primary"
            }`}
            style={workoutGoalMet ? { background: "oklch(0.65 0.15 145)" } : {}}
            data-ocid="dashboard.goals.workouts.badge"
          >
            {Math.round(workoutProgressPct)}%
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
