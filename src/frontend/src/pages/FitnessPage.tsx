import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays,
  Check,
  Download,
  Dumbbell,
  Flame,
  Plus,
  Search,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "../components/EmptyState";
import { ExportDialog } from "../components/ExportDialog";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  EXERCISES,
  EXERCISE_CATEGORIES,
  type Exercise,
  type ExerciseCategory,
} from "../data/exercises";
import {
  todayISO,
  useAddWorkout,
  useClearScheduleDay,
  useDeleteWorkout,
  useExportFitnessCSV,
  usePersonalRecord,
  usePersonalRecords,
  useUpdateScheduleEntry,
  useUpdateWorkout,
  useWeeklySchedule,
  useWorkoutStreak,
  useWorkoutsForDate,
} from "../hooks/use-backend";
import type {
  DayOfWeek,
  PersonalRecord,
  WeeklyScheduleEntry,
  Workout,
} from "../types";

// ── Streak Banner ─────────────────────────────────────────────────────────────
function StreakBanner() {
  const { data: streak, isLoading } = useWorkoutStreak();

  if (isLoading || !streak) return null;
  if (streak.currentStreak === 0 && streak.longestStreak === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 }}
      className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"
      data-ocid="fitness.streak_banner"
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-xl gradient-pink-accent flex items-center justify-center shrink-0 shadow-elevated">
          <Flame className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
            Workout Streak
          </p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="font-display font-bold text-2xl text-primary leading-none">
              {streak.currentStreak}
            </span>
            <span className="text-sm text-muted-foreground">
              {streak.currentStreak === 1 ? "day" : "days"}
            </span>
          </div>
        </div>
      </div>

      <Separator
        orientation="vertical"
        className="hidden sm:block h-8 bg-border/60"
      />
      <Separator className="sm:hidden bg-border/60" />

      <div className="flex items-center gap-2 sm:pl-2">
        <Zap className="w-4 h-4 text-primary/70 shrink-0" />
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
            Personal Best
          </p>
          <p className="text-sm font-bold text-foreground">
            {streak.longestStreak}{" "}
            <span className="font-normal text-muted-foreground text-xs">
              days
            </span>
          </p>
        </div>
      </div>

      {streak.currentStreak > 0 && (
        <>
          <Separator
            orientation="vertical"
            className="hidden sm:block h-8 bg-border/60"
          />
          <div className="flex gap-1 flex-wrap sm:pl-1">
            {["d1", "d2", "d3", "d4", "d5", "d6", "d7"]
              .slice(0, Math.min(streak.currentStreak, 7))
              .map((k) => (
                <div
                  key={k}
                  className="w-5 h-5 rounded-md gradient-pink-accent flex items-center justify-center shadow-sm"
                >
                  <Flame className="w-3 h-3 text-primary-foreground" />
                </div>
              ))}
            {streak.currentStreak > 7 && (
              <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                +{streak.currentStreak - 7}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

// ── Personal Records Section ──────────────────────────────────────────────────
function formatAchievedDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PRCard({ pr, index }: { pr: PersonalRecord; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl bg-background hover:bg-muted/30 transition-smooth"
      data-ocid={`fitness.pr.item.${index + 1}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Trophy className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {pr.exerciseName}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {formatAchievedDate(pr.achievedAt)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        {pr.maxWeight !== null ? (
          <Badge className="bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold px-2 py-0.5">
            {pr.maxWeight} kg
          </Badge>
        ) : (
          <Badge className="bg-muted text-muted-foreground border-0 text-[11px] font-normal px-2 py-0.5">
            bodyweight
          </Badge>
        )}
        <Badge className="bg-muted text-muted-foreground border-0 text-[11px] font-normal px-2 py-0.5">
          {pr.maxReps} reps
        </Badge>
        <Badge className="bg-muted text-muted-foreground border-0 text-[11px] font-normal px-2 py-0.5">
          {pr.maxSets} sets
        </Badge>
      </div>
    </motion.div>
  );
}

function PersonalRecordsSection() {
  const { data: records, isLoading } = usePersonalRecords();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) return null;
  if (!records || records.length === 0) return null;

  const sorted = [...records].sort((a, b) => b.achievedAt - a.achievedAt);
  const visible = expanded ? sorted : sorted.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card
        className="bg-card border border-border shadow-subtle"
        data-ocid="fitness.pr_section"
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Personal Records
            </CardTitle>
            <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-semibold tabular-nums">
              {records.length} exercise{records.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground pt-0.5">
            Your all-time bests — automatically updated when you beat a record.
          </p>
        </CardHeader>
        <Separator />
        <CardContent className="pt-2">
          <div className="flex flex-col gap-0.5">
            {visible.map((pr, i) => (
              <PRCard key={pr.exerciseName} pr={pr} index={i} />
            ))}
          </div>
          {records.length > 5 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 w-full text-xs text-primary font-semibold hover:underline py-1.5 transition-smooth"
              data-ocid="fitness.pr_expand_button"
            >
              {expanded ? "Show less" : `Show all ${records.length} records`}
            </button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Inline PR Badge ───────────────────────────────────────────────────────────
function InlinePRBadge({ exerciseName }: { exerciseName: string }) {
  const { data: pr } = usePersonalRecord(exerciseName);
  if (!pr) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5 mt-1"
      data-ocid="fitness.inline_pr_badge"
    >
      <Trophy className="w-3 h-3 text-primary/70 shrink-0" />
      <span className="text-[11px] text-primary/80 font-semibold">
        PR:{" "}
        {pr.maxWeight !== null
          ? `${pr.maxWeight} kg × ${pr.maxReps} reps`
          : `${pr.maxReps} reps (bodyweight)`}
      </span>
      <span className="text-[10px] text-muted-foreground">
        · {pr.maxSets} sets
      </span>
    </motion.div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────
const DAY_LABELS: Record<DayOfWeek, string> = {
  0: "Monday",
  1: "Tuesday",
  2: "Wednesday",
  3: "Thursday",
  4: "Friday",
  5: "Saturday",
  6: "Sunday",
};

const DAY_SHORT: Record<DayOfWeek, string> = {
  0: "Mon",
  1: "Tue",
  2: "Wed",
  3: "Thu",
  4: "Fri",
  5: "Sat",
  6: "Sun",
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[];

function currentDayOfWeek(): DayOfWeek {
  const jsDay = new Date().getDay();
  return ((jsDay + 6) % 7) as DayOfWeek;
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatTimestamp(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Get the Monday of the current week */
function getWeekStart(): Date {
  const now = new Date();
  const jsDay = now.getDay(); // 0=Sun
  const offset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + offset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// ── 7-Day Calendar Strip ───────────────────────────────────────────────────────
function WeekStrip({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: string;
  onSelectDate: (d: string) => void;
}) {
  const today = todayISO();
  const weekStart = getWeekStart();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {days.map((d, i) => {
        const iso = toISO(d);
        const isSelected = iso === selectedDate;
        const isToday = iso === today;
        const dayLabel = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i];
        const dateNum = d.getDate();

        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelectDate(iso)}
            className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-2xl min-w-[3.25rem] flex-shrink-0 transition-all duration-200 border ${
              isSelected
                ? "gradient-pink-accent text-primary-foreground border-transparent shadow-elevated scale-105"
                : isToday
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:border-primary/20"
            }`}
            data-ocid={`fitness.day_strip.${i + 1}`}
            aria-label={`Select ${dayLabel} ${dateNum}`}
            aria-pressed={isSelected}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
              {dayLabel}
            </span>
            <span className="text-base font-bold leading-none">{dateNum}</span>
            {isToday && !isSelected && (
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
            {(!isToday || isSelected) && <div className="w-1.5 h-1.5" />}
          </button>
        );
      })}
    </div>
  );
}

// ── Exercise Picker ────────────────────────────────────────────────────────────
function ExercisePicker({
  selected,
  onSelect,
  onClear,
}: {
  selected: Exercise | null;
  onSelect: (ex: Exercise) => void;
  onClear: () => void;
}) {
  const [category, setCategory] = useState<ExerciseCategory>("All");
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const cat = category === "All" ? null : category;
    const q = search.toLowerCase().trim();
    return EXERCISES.filter(
      (e) =>
        (!cat || e.category === cat) &&
        (!q || e.name.toLowerCase().includes(q)),
    );
  }, [category, search]);

  if (selected) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Exercise
        </Label>
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-primary/40 bg-primary/5 w-fit max-w-full"
          data-ocid="fitness.selected_exercise"
        >
          <Dumbbell className="w-4 h-4 text-primary shrink-0" />
          <span className="font-semibold text-sm text-foreground truncate">
            {selected.name}
          </span>
          <Badge className="bg-muted text-muted-foreground border-0 text-[10px] px-1.5 py-0.5 font-normal shrink-0">
            {selected.category}
          </Badge>
          <button
            type="button"
            onClick={onClear}
            className="ml-1 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
            aria-label="Remove selected exercise"
            data-ocid="fitness.clear_exercise_button"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sm:col-span-2 flex flex-col gap-2">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Exercise
      </Label>

      <ScrollArea className="pb-1">
        <div className="flex gap-1.5 min-w-max">
          {EXERCISE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-smooth border ${
                category === cat
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
              data-ocid={`fitness.category.${cat.toLowerCase().replace(/[\s/]+/g, "_")}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          placeholder="Search exercises…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-background border-input"
          data-ocid="fitness.exercise_search"
        />
        {search && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
            onClick={() => {
              setSearch("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <ScrollArea className="h-44">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full py-8 text-sm text-muted-foreground">
              No exercises match your search.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => onSelect(ex)}
                  className="w-full text-left px-4 py-2.5 hover:bg-primary/5 transition-smooth flex items-center justify-between gap-3 group"
                  data-ocid={`fitness.exercise_option.${ex.id}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {ex.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {ex.muscleGroup}
                    </p>
                  </div>
                  <Badge className="bg-muted text-muted-foreground border-0 text-[10px] px-2 py-0.5 shrink-0 font-normal">
                    {ex.category}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Log Workout Form ───────────────────────────────────────────────────────────
interface FormState {
  sets: string;
  reps: string;
  weight: string;
  weightUnit: "kg" | "lbs";
}

function WorkoutForm({
  date,
  prefilledExercise,
  onPrefilledClear,
}: {
  date: string;
  prefilledExercise?: Exercise | null;
  onPrefilledClear?: () => void;
}) {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    prefilledExercise ?? null,
  );
  const [form, setForm] = useState<FormState>({
    sets: "",
    reps: "",
    weight: "",
    weightUnit: "kg",
  });
  const add = useAddWorkout();

  const prevPrefilled = useRef<Exercise | null | undefined>(prefilledExercise);
  if (prevPrefilled.current !== prefilledExercise) {
    prevPrefilled.current = prefilledExercise;
    if (prefilledExercise) setSelectedExercise(prefilledExercise);
  }

  function update(field: keyof Omit<FormState, "weightUnit">) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedExercise) {
      toast.error("Please select an exercise first.");
      return;
    }
    const sets = Number.parseInt(form.sets, 10);
    const reps = Number.parseInt(form.reps, 10);
    const rawWeight = form.weight ? Number.parseFloat(form.weight) : 0;
    const weightKg =
      form.weightUnit === "lbs" ? rawWeight * 0.453592 : rawWeight;
    if (Number.isNaN(sets) || sets < 1 || Number.isNaN(reps) || reps < 1) {
      toast.error("Please fill in sets and reps.");
      return;
    }
    const now = new Date().toISOString();
    await add.mutateAsync({
      date,
      name: selectedExercise.name,
      sets,
      reps,
      weightKg: Math.round(weightKg * 100) / 100,
      durationMin: 0,
      caloriesBurned: 0,
      notes: "",
      lastEditedSets: now,
      lastEditedReps: now,
      lastEditedWeight: rawWeight > 0 ? now : undefined,
    });
    setSelectedExercise(null);
    onPrefilledClear?.();
    setForm({ sets: "", reps: "", weight: "", weightUnit: form.weightUnit });
    toast.success(`${selectedExercise.name} logged!`);
  }

  return (
    <Card className="bg-card border border-border shadow-subtle">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          Log Exercise
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <ExercisePicker
            selected={selectedExercise}
            onSelect={setSelectedExercise}
            onClear={() => {
              setSelectedExercise(null);
              onPrefilledClear?.();
            }}
          />

          {/* Inline PR badge — shown when an exercise is selected */}
          {selectedExercise && (
            <div className="sm:col-span-2 -mt-2">
              <InlinePRBadge exerciseName={selectedExercise.name} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="ex-sets"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Sets
            </Label>
            <Input
              id="ex-sets"
              type="number"
              min={1}
              placeholder="3"
              value={form.sets}
              onChange={update("sets")}
              className="bg-background border-input"
              data-ocid="fitness.sets_input"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="ex-reps"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Reps
            </Label>
            <Input
              id="ex-reps"
              type="number"
              min={1}
              placeholder="10"
              value={form.reps}
              onChange={update("reps")}
              className="bg-background border-input"
              data-ocid="fitness.reps_input"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="ex-weight"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Weight{" "}
              <span className="normal-case font-normal opacity-70">
                — optional
              </span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="ex-weight"
                type="number"
                min={0}
                step={0.5}
                placeholder="60"
                value={form.weight}
                onChange={update("weight")}
                className="bg-background border-input flex-1"
                data-ocid="fitness.weight_input"
              />
              <button
                type="button"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    weightUnit: p.weightUnit === "kg" ? "lbs" : "kg",
                  }))
                }
                className={`px-3 rounded-lg text-xs font-bold border transition-smooth shrink-0 ${
                  form.weightUnit === "kg"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
                data-ocid="fitness.weight_unit_toggle"
              >
                {form.weightUnit.toUpperCase()}
              </button>
            </div>
          </div>

          <div className="sm:col-span-2 pt-1">
            <Button
              type="submit"
              disabled={add.isPending || !selectedExercise}
              className="w-full sm:w-auto gradient-pink-accent text-primary-foreground font-semibold shadow-elevated hover:opacity-90 transition-smooth"
              data-ocid="fitness.submit_button"
            >
              {add.isPending ? "Logging…" : "Log Exercise"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Workout Edit Row ──────────────────────────────────────────────────────────
function WorkoutEditRow({
  workout: w,
  onUpdate,
  onDelete,
  deleting,
  index,
}: {
  workout: Workout;
  onUpdate: (updated: Workout) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
  index: number;
}) {
  const [editing, setEditing] = useState(false);
  const [sets, setSets] = useState(String(w.sets));
  const [reps, setReps] = useState(String(w.reps));
  const [weight, setWeight] = useState(
    String(w.weightKg > 0 ? w.weightKg : ""),
  );

  function handleSave() {
    const now = new Date().toISOString();
    const newSets = Number.parseInt(sets, 10);
    const newReps = Number.parseInt(reps, 10);
    const newWeight = weight ? Number.parseFloat(weight) : 0;
    if (
      Number.isNaN(newSets) ||
      newSets < 1 ||
      Number.isNaN(newReps) ||
      newReps < 1
    ) {
      toast.error("Sets and reps must be positive numbers.");
      return;
    }
    onUpdate({
      ...w,
      sets: newSets,
      reps: newReps,
      weightKg: newWeight,
      lastEditedSets: sets !== String(w.sets) ? now : w.lastEditedSets,
      lastEditedReps: reps !== String(w.reps) ? now : w.lastEditedReps,
      lastEditedWeight:
        weight !== String(w.weightKg > 0 ? w.weightKg : "")
          ? now
          : w.lastEditedWeight,
    });
    setEditing(false);
    toast.success("Workout updated.");
  }

  if (editing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-3 px-4 rounded-xl border border-primary/30 bg-primary/5"
        data-ocid={`fitness.item.${index + 1}`}
      >
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="w-4 h-4 text-primary shrink-0" />
          <p className="font-semibold text-sm text-foreground">{w.name}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(
            [
              {
                label: "Sets",
                val: sets,
                set: setSets,
                ocid: `fitness.edit_sets.${index + 1}`,
                ts: w.lastEditedSets,
              },
              {
                label: "Reps",
                val: reps,
                set: setReps,
                ocid: `fitness.edit_reps.${index + 1}`,
                ts: w.lastEditedReps,
              },
              {
                label: "Weight (kg)",
                val: weight,
                set: setWeight,
                ocid: `fitness.edit_weight.${index + 1}`,
                ts: w.lastEditedWeight,
              },
            ] as const
          ).map(({ label, val, set, ocid, ts }) => (
            <div key={label} className="flex flex-col gap-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {label}
              </Label>
              <Input
                type="number"
                min={0}
                value={val}
                onChange={(e) => set(e.target.value)}
                className="h-8 text-sm bg-background border-input"
                data-ocid={ocid}
              />
              {ts && (
                <p className="text-[10px] text-muted-foreground">
                  Last: {formatTimestamp(ts)}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            className="gradient-pink-accent text-primary-foreground font-semibold text-xs h-7"
            data-ocid={`fitness.save_edit_button.${index + 1}`}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            className="text-xs h-7"
            data-ocid={`fitness.cancel_edit_button.${index + 1}`}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(w.id)}
            disabled={deleting}
            className="text-xs h-7 text-muted-foreground hover:text-destructive ml-auto"
            data-ocid={`fitness.delete_button.${index + 1}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="contents"
    >
      <button
        type="button"
        className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl bg-background hover:bg-muted/40 transition-smooth group w-full text-left"
        onClick={() => setEditing(true)}
        aria-label={`Edit ${w.name}`}
        data-ocid={`fitness.item.${index + 1}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Dumbbell className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">
              {w.name}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              <span className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">{w.sets}</span>{" "}
                sets
              </span>
              <span className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">{w.reps}</span>{" "}
                reps
              </span>
              {w.weightKg > 0 && (
                <span className="text-xs text-primary font-medium">
                  @ {w.weightKg} kg
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 transition-smooth">
          tap to edit
        </span>
      </button>
    </motion.div>
  );
}

// ── Daily Log Panel ────────────────────────────────────────────────────────────
function DailyLogPanel({
  date,
  scheduleEntries,
}: {
  date: string;
  scheduleEntries: WeeklyScheduleEntry[];
}) {
  const { data: workouts, isLoading } = useWorkoutsForDate(date);
  const del = useDeleteWorkout();
  const update = useUpdateWorkout();
  const addWorkout = useAddWorkout();
  const list = workouts ?? [];
  const [prefilledExercise, setPrefilledExercise] = useState<Exercise | null>(
    null,
  );

  const loggedNames = new Set(list.map((w) => w.name));
  const plannedExercises = scheduleEntries.filter(
    (e) => !loggedNames.has(e.exerciseName),
  );

  async function handleLogPlanned(entry: WeeklyScheduleEntry) {
    const now = new Date().toISOString();
    await addWorkout.mutateAsync({
      date,
      name: entry.exerciseName,
      sets: entry.sets,
      reps: entry.reps,
      weightKg: entry.weightKg,
      durationMin: 0,
      caloriesBurned: 0,
      notes: "",
      lastEditedSets: now,
      lastEditedReps: now,
      lastEditedWeight: entry.weightKg > 0 ? now : undefined,
    });
    toast.success(`${entry.exerciseName} logged from schedule!`);
  }

  const dayLabel = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Planned exercises from schedule */}
      {plannedExercises.length > 0 && (
        <Card className="bg-card border border-primary/20 shadow-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm flex items-center gap-2 text-primary">
              <CalendarDays className="w-4 h-4" />
              Planned for Today ({plannedExercises.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-2">
              {plannedExercises.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-dashed border-primary/30 bg-primary/5"
                  data-ocid={`fitness.planned.${entry.id}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Dumbbell className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {entry.exerciseName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.sets} sets · {entry.reps} reps
                        {entry.weightKg > 0 && ` · ${entry.weightKg} kg`}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const ex = EXERCISES.find(
                        (e) => e.name === entry.exerciseName,
                      ) ?? {
                        id: `custom-${entry.id}`,
                        name: entry.exerciseName,
                        category: "Full Body" as const,
                        muscleGroup: "",
                      };
                      setPrefilledExercise(ex);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-xs border-primary/30 text-primary hover:bg-primary/5 shrink-0 h-7"
                    data-ocid={`fitness.log_planned_button.${entry.id}`}
                  >
                    Log
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleLogPlanned(entry)}
                    disabled={addWorkout.isPending}
                    className="text-xs gradient-pink-accent text-primary-foreground h-7 shrink-0"
                    data-ocid={`fitness.quick_log_button.${entry.id}`}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Quick Log
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add workout form */}
      <WorkoutForm
        date={date}
        prefilledExercise={prefilledExercise}
        onPrefilledClear={() => setPrefilledExercise(null)}
      />

      {/* Logged workouts */}
      <Card className="bg-card border border-border shadow-subtle">
        <CardHeader className="pb-2 flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="font-display text-base">{dayLabel}</CardTitle>
          <Badge
            className="bg-primary/10 text-primary border border-primary/20 font-semibold tabular-nums"
            data-ocid="fitness.count_badge"
          >
            {list.length} logged
          </Badge>
        </CardHeader>
        <Separator />
        <CardContent className="pt-2">
          {isLoading ? (
            <LoadingSpinner />
          ) : list.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title="No workouts logged yet"
              description="Add your first exercise using the form above, or quick-log from your schedule."
              data-ocid="fitness.empty_state"
            />
          ) : (
            <div className="flex flex-col gap-1">
              <AnimatePresence initial={false}>
                {list.map((w, i) => (
                  <WorkoutEditRow
                    key={w.id}
                    workout={w}
                    index={i}
                    onUpdate={(updated) => {
                      update.mutate({
                        oldId: updated.id,
                        date,
                        updates: {
                          sets: updated.sets,
                          reps: updated.reps,
                          weightKg: updated.weightKg,
                          lastEditedSets: updated.lastEditedSets,
                          lastEditedReps: updated.lastEditedReps,
                          lastEditedWeight: updated.lastEditedWeight,
                        },
                      });
                    }}
                    onDelete={(id) => del.mutate({ date, id })}
                    deleting={del.isPending}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Schedule Exercise Card ─────────────────────────────────────────────────────
function ScheduleEntryRow({
  entry,
  dayIndex,
  onDelete,
}: {
  entry: WeeklyScheduleEntry;
  dayIndex: number;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [sets, setSets] = useState(String(entry.sets));
  const [reps, setReps] = useState(String(entry.reps));
  const [weight, setWeight] = useState(
    String(entry.weightKg > 0 ? entry.weightKg : ""),
  );
  const updateEntry = useUpdateScheduleEntry();

  function handleSave() {
    const s = Number.parseInt(sets, 10);
    const r = Number.parseInt(reps, 10);
    const w = weight ? Number.parseFloat(weight) : 0;
    if (Number.isNaN(s) || s < 1 || Number.isNaN(r) || r < 1) {
      toast.error("Sets and reps must be positive numbers.");
      return;
    }
    updateEntry.mutate(
      {
        ...entry,
        sets: s,
        reps: r,
        weightKg: w,
        lastEditedTimestamp: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("Schedule updated.");
          setEditing(false);
        },
      },
    );
  }

  if (editing) {
    return (
      <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex flex-col gap-2.5">
        <p className="text-xs font-semibold text-foreground truncate">
          {entry.exerciseName}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { label: "Sets", val: sets, set: setSets },
              { label: "Reps", val: reps, set: setReps },
              { label: "kg", val: weight, set: setWeight },
            ] as const
          ).map(({ label, val, set }) => (
            <div key={label}>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {label}
              </Label>
              <Input
                type="number"
                min={0}
                value={val}
                onChange={(e) => set(e.target.value)}
                className="h-7 text-xs bg-background border-input mt-0.5"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateEntry.isPending}
            className="h-7 text-xs gradient-pink-accent text-primary-foreground font-semibold flex-1"
            data-ocid={`schedule.save_button.${dayIndex + 1}`}
          >
            <Check className="w-3 h-3 mr-1" /> Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            className="h-7 text-xs"
            data-ocid={`schedule.cancel_button.${dayIndex + 1}`}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-background hover:bg-muted/40 transition-smooth group">
      <Dumbbell className="w-3.5 h-3.5 text-primary shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground truncate">
          {entry.exerciseName}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {entry.sets}×{entry.reps}
          {entry.weightKg > 0 ? ` · ${entry.weightKg} kg` : ""}
        </p>
        {entry.lastEditedTimestamp && (
          <p className="text-[9px] text-muted-foreground/50 mt-0.5">
            {formatTimestamp(entry.lastEditedTimestamp)}
          </p>
        )}
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-smooth">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/5 transition-smooth text-[10px] font-medium"
          aria-label="Edit exercise"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-smooth"
          aria-label="Remove exercise"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Schedule Day Card ──────────────────────────────────────────────────────────
function ScheduleDayCard({
  day,
  entries,
  isToday,
}: {
  day: DayOfWeek;
  entries: WeeklyScheduleEntry[];
  isToday: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [selectedEx, setSelectedEx] = useState<Exercise | null>(null);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("");
  const updateEntry = useUpdateScheduleEntry();
  const clearDay = useClearScheduleDay();

  function handleAdd() {
    if (!selectedEx) {
      toast.error("Select an exercise first.");
      return;
    }
    const s = Number.parseInt(sets, 10);
    const r = Number.parseInt(reps, 10);
    const w = weight ? Number.parseFloat(weight) : 0;
    if (Number.isNaN(s) || s < 1 || Number.isNaN(r) || r < 1) {
      toast.error("Sets and reps must be positive numbers.");
      return;
    }
    updateEntry.mutate(
      {
        id: uid(),
        dayOfWeek: day,
        exerciseName: selectedEx.name,
        sets: s,
        reps: r,
        weightKg: w,
        lastEditedTimestamp: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast.success(`${selectedEx.name} added to ${DAY_LABELS[day]}.`);
          setAdding(false);
          setSelectedEx(null);
          setSets("3");
          setReps("10");
          setWeight("");
        },
      },
    );
  }

  function handleClear() {
    clearDay.mutate(day, {
      onSuccess: () => toast.success(`${DAY_LABELS[day]} cleared.`),
    });
  }

  function handleDeleteEntry(entry: WeeklyScheduleEntry) {
    // Clear the whole day, then re-add all other entries for this day
    const othersForDay = entries.filter((e) => e.id !== entry.id);
    clearDay.mutate(day, {
      onSuccess: () => {
        for (const e of othersForDay) {
          updateEntry.mutate(e);
        }
        toast.success(`${entry.exerciseName} removed.`);
      },
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: day * 0.04 }}
      className={`rounded-2xl border p-4 flex flex-col gap-3 transition-smooth ${
        isToday
          ? "border-primary/50 bg-primary/5 shadow-elevated"
          : "border-border bg-card"
      }`}
      data-ocid={`schedule.day.${day + 1}`}
    >
      {/* Day header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-sm text-foreground">
            {DAY_SHORT[day]}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {DAY_LABELS[day]}
          </span>
          {isToday && (
            <Badge className="bg-primary text-primary-foreground border-0 text-[10px] px-1.5 py-0 font-semibold">
              Today
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground mr-1">
            {entries.length > 0
              ? `${entries.length} exercise${entries.length !== 1 ? "s" : ""}`
              : "rest"}
          </span>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-smooth px-1 py-0.5 rounded hover:bg-destructive/5"
              aria-label={`Clear ${DAY_LABELS[day]}`}
              data-ocid={`schedule.clear_button.${day + 1}`}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Existing entries */}
      {entries.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {entries.map((entry, i) => (
            <ScheduleEntryRow
              key={entry.id}
              entry={entry}
              dayIndex={i}
              onDelete={() => handleDeleteEntry(entry)}
            />
          ))}
        </div>
      )}

      {/* Empty rest day */}
      {entries.length === 0 && !adding && (
        <p className="text-[11px] text-muted-foreground/60 text-center py-1.5 italic">
          Rest day
        </p>
      )}

      {/* Add form */}
      {adding && (
        <div className="flex flex-col gap-2 pt-0.5 border-t border-border/50">
          <ExercisePicker
            selected={selectedEx}
            onSelect={setSelectedEx}
            onClear={() => setSelectedEx(null)}
          />
          {selectedEx && (
            <>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    {
                      label: "Sets",
                      val: sets,
                      set: setSets,
                      ocid: `schedule.new_sets_input.${day + 1}`,
                    },
                    {
                      label: "Reps",
                      val: reps,
                      set: setReps,
                      ocid: `schedule.new_reps_input.${day + 1}`,
                    },
                    {
                      label: "kg",
                      val: weight,
                      set: setWeight,
                      ocid: `schedule.new_weight_input.${day + 1}`,
                    },
                  ] as const
                ).map(({ label, val, set, ocid }) => (
                  <div key={label}>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {label}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      className="h-7 text-xs bg-background border-input mt-0.5"
                      data-ocid={ocid}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={updateEntry.isPending}
                  className="h-7 text-xs gradient-pink-accent text-primary-foreground font-semibold flex-1"
                  data-ocid={`schedule.confirm_add_button.${day + 1}`}
                >
                  <Check className="w-3 h-3 mr-1" /> Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAdding(false);
                    setSelectedEx(null);
                  }}
                  className="h-7 text-xs"
                  data-ocid={`schedule.cancel_add_button.${day + 1}`}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
          {!selectedEx && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAdding(false)}
              className="h-7 text-xs w-full"
              data-ocid={`schedule.cancel_add_button.${day + 1}`}
            >
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* Add exercise button */}
      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-smooth py-1.5 border border-dashed border-border rounded-xl justify-center hover:border-primary/50 hover:bg-primary/5 mt-auto"
          data-ocid={`schedule.add_button.${day + 1}`}
        >
          <Plus className="w-3.5 h-3.5" />
          Add exercise
        </button>
      )}
    </motion.div>
  );
}

// ── Weekly Schedule Panel ──────────────────────────────────────────────────────
function WeeklySchedulePanel() {
  const { data: schedule, isLoading } = useWeeklySchedule();
  const today = currentDayOfWeek();

  const entriesByDay = useMemo(() => {
    const map: Partial<Record<DayOfWeek, WeeklyScheduleEntry[]>> = {};
    for (const day of ALL_DAYS) map[day] = [];
    for (const e of schedule ?? []) {
      if (!map[e.dayOfWeek]) map[e.dayOfWeek] = [];
      map[e.dayOfWeek]!.push(e);
    }
    return map;
  }, [schedule]);

  const totalExercises = (schedule ?? []).length;

  return (
    <Card className="bg-card border border-border shadow-subtle">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Weekly Exercise Schedule
          </CardTitle>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              {totalExercises} exercise{totalExercises !== 1 ? "s" : ""} planned
            </p>
            <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
              Mon – Sun
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground pt-1">
          Add multiple exercises per day. Weights are editable anytime —
          last-saved values persist.
        </p>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {ALL_DAYS.map((day) => (
              <ScheduleDayCard
                key={day}
                day={day}
                entries={entriesByDay[day] ?? []}
                isToday={day === today}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function FitnessPage() {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [activeTab, setActiveTab] = useState<"daily" | "schedule">("daily");
  const [showExport, setShowExport] = useState(false);
  const exportCsv = useExportFitnessCSV();
  const { data: schedule } = useWeeklySchedule();

  // Get schedule entries for selected date's day-of-week
  const selectedDayOfWeek = useMemo((): DayOfWeek => {
    const jsDay = new Date(`${selectedDate}T12:00:00`).getDay();
    return ((jsDay + 6) % 7) as DayOfWeek;
  }, [selectedDate]);

  const scheduleForDay = useMemo(
    () => (schedule ?? []).filter((e) => e.dayOfWeek === selectedDayOfWeek),
    [schedule, selectedDayOfWeek],
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5" data-ocid="fitness.page">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground">
            Fitness Log
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track workouts and plan your weekly schedule.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowExport(true)}
            aria-label="Export CSV"
            className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-full px-3 py-1.5 hover:bg-primary/5 transition-smooth"
            data-ocid="fitness.export_button"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "daily" | "schedule")}
            data-ocid="fitness.view_tabs"
          >
            <TabsList className="bg-muted">
              <TabsTrigger value="daily" data-ocid="fitness.daily_tab">
                Daily Log
              </TabsTrigger>
              <TabsTrigger value="schedule" data-ocid="fitness.schedule_tab">
                Weekly Schedule
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </motion.div>

      {/* Workout streak banner */}
      <StreakBanner />

      {/* Calendar strip — always visible in daily tab */}
      {activeTab === "daily" && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="bg-card border border-border shadow-subtle p-4">
            <WeekStrip
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </Card>
        </motion.div>
      )}

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "daily" && (
          <motion.div
            key="daily"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ delay: 0.08 }}
            className="flex flex-col gap-5"
          >
            <DailyLogPanel
              date={selectedDate}
              scheduleEntries={scheduleForDay}
            />
            <PersonalRecordsSection />
          </motion.div>
        )}

        {activeTab === "schedule" && (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ delay: 0.08 }}
            className="flex flex-col gap-5"
          >
            <WeeklySchedulePanel />
            <PersonalRecordsSection />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export CSV panel */}
      {showExport && (
        <ExportDialog
          filePrefix="nlocki-fitness"
          onExport={(start, end) =>
            exportCsv.mutateAsync({ startDate: start, endDate: end })
          }
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}

// Re-export removed — useExportFitnessCSV is imported directly in this file
