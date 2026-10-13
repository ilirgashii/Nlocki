import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Repeat2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  todayISO,
  useAddTask,
  useAddTaskRoutine,
  useDeleteTask,
  useDeleteTaskRoutine,
  useTaskRoutine,
  useTasksForDate,
  useToggleTask,
} from "../hooks/use-backend";
import type { Task } from "../types";
const moveDay = (date: string, offset: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-CA");
};
function TaskRow({
  task,
  index,
  date,
}: { task: Task; index: number; date: string }) {
  const toggle = useToggleTask();
  const remove = useDeleteTask();
  const [pending, setPending] = useState<boolean | null>(null);
  const checked = pending ?? task.completed;
  return (
    <li
      className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted/40"
      data-ocid={`planner.tasks.item.${index + 1}`}
    >
      <Checkbox
        aria-label={`Complete ${task.title}`}
        checked={checked}
        disabled={toggle.isPending}
        onCheckedChange={(v) => {
          setPending(v === true);
          toggle.mutate(
            { date, id: task.id },
            { onSettled: () => setPending(null) },
          );
        }}
        data-ocid={`planner.tasks.checkbox.${index + 1}`}
      />
      <span
        className={`flex-1 min-w-0 break-words text-sm ${checked ? "line-through text-muted-foreground" : ""}`}
      >
        {task.title}
      </span>
      {!task.routineId && (
        <button
          type="button"
          aria-label={`Delete ${task.title}`}
          onClick={() => remove.mutate({ date, id: task.id })}
          disabled={remove.isPending}
          className="p-2 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </li>
  );
}
export default function PlannerPage() {
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [newTask, setNewTask] = useState("");
  const [routineTitle, setRoutineTitle] = useState("");
  const { data: tasks = [], isLoading } = useTasksForDate(date);
  const { data: routine = [] } = useTaskRoutine(today);
  const add = useAddTask();

  const addRoutine = useAddTaskRoutine();
  const removeRoutine = useDeleteTaskRoutine();
  const daily = tasks.filter((t) => t.routineId);
  const extra = tasks.filter((t) => !t.routineId);
  const completed = tasks.filter((t) => t.completed).length;
  const taskRow = (task: Task, index: number) => (
    <TaskRow key={`${date}:${task.id}`} task={task} index={index} date={date} />
  );
  function addExtra() {
    if (newTask.trim())
      add.mutate(
        { date, title: newTask.trim() },
        { onSuccess: () => setNewTask("") },
      );
  }
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8" data-ocid="planner.page">
      <div>
        <h1 className="font-display font-bold text-2xl">Daily Planner</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your everyday routine, with room for anything extra.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-2xl border bg-card p-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous day"
          onClick={() => setDate(moveDay(date, -1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {date === today
              ? "Today"
              : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                })}
          </p>
          <Input
            type="date"
            aria-label="Planner date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-8 border-0 p-0 bg-transparent"
          />
        </div>
        {date !== today && (
          <Button size="sm" variant="outline" onClick={() => setDate(today)}>
            Today
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next day"
          onClick={() => setDate(moveDay(date, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      {tasks.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex justify-between text-sm mb-3">
            <span className="flex gap-2 items-center">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              {completed === tasks.length
                ? "All done for the day"
                : "Your progress"}
            </span>
            <span>
              {completed}/{tasks.length} done
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(completed / tasks.length) * 100}%` }}
            />
          </div>
        </div>
      )}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Repeat2 className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Daily routine</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Repeats every day. Each day has its own completion check.
          </p>
          {isLoading ? (
            <LoadingSpinner />
          ) : daily.length ? (
            <ul>{daily.map(taskRow)}</ul>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              No routine items for this date.
            </p>
          )}
          <details className="border-t pt-3 mt-3">
            <summary className="cursor-pointer text-sm font-medium text-primary">
              Manage daily routine
            </summary>
            <ul className="mt-3 space-y-2">
              {routine.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 break-words">{r.title}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove routine ${r.title}`}
                    disabled={removeRoutine.isPending}
                    onClick={() =>
                      removeRoutine.mutate({ id: r.id, date: today })
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
            <form
              className="flex gap-2 mt-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (routineTitle.trim())
                  addRoutine.mutate(
                    { date: today, title: routineTitle.trim() },
                    { onSuccess: () => setRoutineTitle("") },
                  );
              }}
            >
              <Input
                aria-label="New daily routine item"
                placeholder="e.g. Read for 20 minutes"
                maxLength={200}
                value={routineTitle}
                onChange={(e) => setRoutineTitle(e.target.value)}
              />
              <Button
                disabled={!routineTitle.trim() || addRoutine.isPending}
                type="submit"
              >
                Add routine
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">
              Changes apply from today. Earlier days keep their history.
            </p>
          </details>
        </CardContent>
      </Card>
      <Card data-ocid="planner.tasks.card">
        <CardContent className="p-5">
          <h2 className="font-semibold mb-3">Extra tasks</h2>
          {extra.length ? (
            <ul data-ocid="planner.tasks.list">
              {extra.map((t, i) => taskRow(t, daily.length + i))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground py-3">
              Nothing extra planned. Add a task below when you need it.
            </p>
          )}
          <form
            className="flex gap-2 mt-4 pt-4 border-t"
            onSubmit={(e) => {
              e.preventDefault();
              addExtra();
            }}
          >
            <Input
              placeholder="Add a new task…"
              aria-label="New extra task"
              value={newTask}
              maxLength={200}
              onChange={(e) => setNewTask(e.target.value)}
              data-ocid="planner.task.input"
            />
            <Button
              type="submit"
              disabled={!newTask.trim() || add.isPending}
              data-ocid="planner.task.add_button"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
