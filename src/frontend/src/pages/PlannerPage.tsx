import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
  Star,
  Trash2,
  Trophy,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  todayISO,
  useAddTask,
  useDeleteTask,
  useTasksForDate,
  useToggleTask,
} from "../hooks/use-backend";

/** Get Monday of the week containing the given ISO date string */
function getWeekMonday(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const day = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function offsetDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getDayLabel(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
  });
}

function getDayNumber(isoDate: string): number {
  return new Date(`${isoDate}T12:00:00`).getDate();
}

function getMonthLabel(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
  });
}

function formatDisplayDate(isoDate: string): string {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = offsetDate(todayStr, -1);
  const tomorrow = offsetDate(todayStr, 1);

  if (isoDate === todayStr) return "Today";
  if (isoDate === yesterday) return "Yesterday";
  if (isoDate === tomorrow) return "Tomorrow";

  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function formatShortDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PlannerPage() {
  const todayStr = todayISO();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  // Track which week's Monday we're showing
  const [weekMonday, setWeekMonday] = useState(() => getWeekMonday(todayStr));
  const [newTask, setNewTask] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: tasks = [], isLoading } = useTasksForDate(selectedDate);
  const addTask = useAddTask();
  const toggleTask = useToggleTask();
  const deleteTask = useDeleteTask();

  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;

  const handleAdd = () => {
    const trimmed = newTask.trim();
    if (!trimmed) return;
    addTask.mutate({ date: selectedDate, title: trimmed });
    setNewTask("");
    inputRef.current?.focus();
  };

  const handleSelectDate = (d: string) => {
    setSelectedDate(d);
    // If selected date is outside current week strip, shift the strip
    const newMonday = getWeekMonday(d);
    if (newMonday !== weekMonday) setWeekMonday(newMonday);
  };

  const handlePrevWeek = () => setWeekMonday((m) => offsetDate(m, -7));
  const handleNextWeek = () => setWeekMonday((m) => offsetDate(m, 7));

  const handlePrevDay = () => {
    const prev = offsetDate(selectedDate, -1);
    handleSelectDate(prev);
  };

  const handleNextDay = () => {
    const next = offsetDate(selectedDate, 1);
    handleSelectDate(next);
  };

  // Build Mon-Sun strip for current week
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    offsetDate(weekMonday, i),
  );

  // Week label
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const weekLabel =
    getMonthLabel(weekStart) === getMonthLabel(weekEnd)
      ? `${getMonthLabel(weekStart)} ${getDayNumber(weekStart)}–${getDayNumber(weekEnd)}`
      : `${getMonthLabel(weekStart)} ${getDayNumber(weekStart)} – ${getMonthLabel(weekEnd)} ${getDayNumber(weekEnd)}`;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-8" data-ocid="planner.page">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground leading-tight">
            Daily Planner
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organize your day, one task at a time
          </p>
        </div>

        {/* Jump to today button */}
        {selectedDate !== todayStr && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSelectDate(todayStr)}
            className="text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/50 font-medium"
            data-ocid="planner.jump_today.button"
          >
            <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
            Jump to Today
          </Button>
        )}
      </div>

      {/* ── 7-Day Week Strip ── */}
      <Card
        className="bg-card border-border overflow-hidden"
        data-ocid="planner.week_strip.card"
      >
        <CardContent className="p-3">
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-3 gap-2">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1.5 rounded-lg bg-muted/60 border border-border hover:border-primary/40 text-muted-foreground hover:text-primary transition-smooth"
              aria-label="Previous week"
              data-ocid="planner.week.prev"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-muted-foreground tracking-wide">
              {weekLabel}
            </span>
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1.5 rounded-lg bg-muted/60 border border-border hover:border-primary/40 text-muted-foreground hover:text-primary transition-smooth"
              aria-label="Next week"
              data-ocid="planner.week.next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1.5" aria-label="Week calendar">
            {weekDays.map((d) => {
              const isSelected = d === selectedDate;
              const isToday = d === todayStr;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleSelectDate(d)}
                  data-ocid={`planner.day.${d}`}
                  aria-pressed={isSelected}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-smooth border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-elevated pink-glow"
                      : isToday
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-muted/30 text-foreground border-border hover:border-primary/40 hover:bg-muted/60"
                  }`}
                >
                  <span className="text-[9px] font-semibold uppercase tracking-wider opacity-80">
                    {getDayLabel(d)}
                  </span>
                  <span
                    className={`text-sm font-bold leading-none ${isSelected ? "" : isToday ? "text-primary" : ""}`}
                  >
                    {getDayNumber(d)}
                  </span>
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Selected Date Navigation ── */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handlePrevDay}
          className="p-2 rounded-lg bg-card border border-border hover:border-primary/40 text-muted-foreground hover:text-primary transition-smooth"
          aria-label="Previous day"
          data-ocid="planner.nav.prev"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 text-center">
          <p className="font-display font-semibold text-lg text-foreground">
            {formatDisplayDate(selectedDate)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatShortDate(selectedDate)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleNextDay}
          className="p-2 rounded-lg bg-card border border-border hover:border-primary/40 text-muted-foreground hover:text-primary transition-smooth"
          aria-label="Next day"
          data-ocid="planner.nav.next"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Achievement Badge ── */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -8 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            data-ocid="planner.achievement.badge"
          >
            <Card className="border-primary/40 bg-primary/5 overflow-hidden">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-elevated pink-glow shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-foreground text-sm">
                    All tasks complete! 🎉
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Congratulations — you crushed it today. Keep the momentum
                    going!
                  </p>
                </div>
                <div className="flex gap-0.5 shrink-0 ml-auto">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ rotate: 0 }}
                      animate={{ rotate: [0, 20, -20, 0] }}
                      transition={{ delay: i * 0.15, duration: 0.5 }}
                    >
                      <Star className="w-4 h-4 fill-primary text-primary" />
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Progress Card ── */}
      {total > 0 && (
        <Card
          className="bg-card border-border overflow-hidden"
          data-ocid="planner.progress.card"
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3 gap-3">
              <div className="flex items-center gap-2">
                {pct === 100 ? (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                ) : (
                  <ClipboardList className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm font-semibold text-foreground">
                  {pct === 100 ? "All done! Great job 🎉" : "Progress"}
                </span>
              </div>
              <Badge
                className={
                  pct === 100
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-muted text-muted-foreground font-medium"
                }
                data-ocid="planner.progress.badge"
              >
                {completed}/{total} tasks · {pct}%
              </Badge>
            </div>

            {/* Progress bar */}
            <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                data-ocid="planner.progress.bar"
              />
              {pct > 0 && pct < 100 && (
                <div
                  className="absolute inset-y-0 rounded-full bg-primary/20 blur-sm"
                  style={{ width: `${pct}%` }}
                />
              )}
            </div>

            {/* Task dots */}
            {total > 1 && (
              <div className="flex gap-1 mt-2.5 flex-wrap">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className={`h-1.5 flex-1 min-w-[8px] max-w-[20px] rounded-full transition-smooth ${
                      t.completed ? "bg-primary" : "bg-border"
                    }`}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Add Task Form ── */}
      <Card className="bg-card border-border" data-ocid="planner.add_task.card">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                placeholder="Add a new task…"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="pl-9 bg-background border-input focus-visible:ring-primary"
                data-ocid="planner.task.input"
              />
            </div>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!newTask.trim() || addTask.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 shrink-0"
              data-ocid="planner.task.add_button"
            >
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 ml-1">
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded-md bg-muted text-xs font-mono border border-border">
              Enter
            </kbd>{" "}
            to add quickly
          </p>
        </CardContent>
      </Card>

      {/* ── Task List ── */}
      <Card className="bg-card border-border" data-ocid="planner.tasks.card">
        <CardHeader className="px-5 pt-5 pb-3 flex flex-row items-center justify-between gap-2">
          <span className="font-display font-semibold text-sm text-foreground">
            Tasks for {formatShortDate(selectedDate)}
          </span>
          {total > 0 && (
            <span className="text-xs text-muted-foreground">
              {completed} of {total} completed
            </span>
          )}
        </CardHeader>

        <CardContent className="px-5 pb-5">
          {isLoading && <LoadingSpinner className="py-8" />}

          {!isLoading && total === 0 && (
            <EmptyState
              icon={CalendarDays}
              title="No tasks for today"
              description="Add your first task above to start planning your day!"
              data-ocid="planner.tasks.empty_state"
            />
          )}

          {!isLoading && total > 0 && (
            <ul className="space-y-1" data-ocid="planner.tasks.list">
              <AnimatePresence initial={false}>
                {tasks.map((task, i) => (
                  <motion.li
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 group transition-smooth border border-transparent hover:border-border/50"
                    data-ocid={`planner.tasks.item.${i + 1}`}
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() =>
                        toggleTask.mutate({ date: selectedDate, id: task.id })
                      }
                      className="shrink-0 w-[18px] h-[18px] rounded-[5px] border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      data-ocid={`planner.tasks.checkbox.${i + 1}`}
                    />

                    <span
                      className={`flex-1 min-w-0 text-sm leading-snug transition-smooth ${
                        task.completed
                          ? "line-through text-muted-foreground/60"
                          : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </span>

                    {task.completed && (
                      <span className="text-[10px] font-medium text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                        Done
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        deleteTask.mutate({ date: selectedDate, id: task.id })
                      }
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-smooth shrink-0"
                      aria-label={`Delete task: ${task.title}`}
                      data-ocid={`planner.tasks.delete_button.${i + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
