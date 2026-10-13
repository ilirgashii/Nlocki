import { Actor, HttpAgent, type Identity } from "@icp-sdk/core/agent";
import type { _SERVICE } from "../declarations/backend.did";
import type * as Backend from "../declarations/backend.did";
import { idlFactory } from "../declarations/backend.did.js";
import type {
  Comment,
  Meal,
  Message,
  Post,
  SocialProfile,
  Story,
  WeeklyScheduleEntry,
  Workout,
} from "../types";

export type BackendActor = _SERVICE;
export async function connectBackend(
  canisterId: string,
  host: string,
  identity: Identity,
): Promise<BackendActor> {
  if (!canisterId || canisterId === "undefined")
    throw new Error(
      "Backend is not configured. Run scripts/dev.sh or set VITE_BACKEND_CANISTER_ID.",
    );
  const agent = new HttpAgent({ host, identity });
  const hostname = new URL(host).hostname;
  if (["localhost", "127.0.0.1", "[::1]"].includes(hostname))
    await agent.fetchRootKey();
  return Actor.createActor<_SERVICE>(idlFactory, { agent, canisterId });
}
export const opt = <T>(value: T | undefined | null): [] | [T] =>
  value == null ? [] : [value];
export const ms = (value: bigint) => Number(value / 1_000_000n);
export function nat(value: number): bigint {
  if (!Number.isFinite(value) || value < 0)
    throw new Error("Use a non-negative number.");
  return BigInt(Math.round(value));
}
function details<T>(value: [] | [string]): Partial<T> {
  try {
    return value.length ? JSON.parse(value[0]) : {};
  } catch {
    return {};
  }
}
export function workoutInput(w: Omit<Workout, "id">): Backend.WorkoutInput {
  return {
    exerciseName: w.name,
    date: w.date,
    sets: nat(w.sets),
    reps: nat(w.reps),
    weight: opt(w.weightKg),
    details: [
      JSON.stringify({
        durationMin: w.durationMin,
        bodyWeightKg: w.bodyWeightKg,
        exerciseMet: w.exerciseMet,
        caloriesBurned: w.caloriesBurned,
        notes: w.notes,
        lastEditedSets: w.lastEditedSets,
        lastEditedReps: w.lastEditedReps,
        lastEditedWeight: w.lastEditedWeight,
      }),
    ],
  };
}
export function workout(w: Backend.WorkoutView): Workout {
  return {
    durationMin: 0,
    caloriesBurned: 0,
    notes: "",
    ...details<Workout>(w.details),
    id: String(w.id),
    date: w.date,
    name: w.exerciseName,
    sets: Number(w.sets),
    reps: Number(w.reps),
    weightKg: w.weight[0] ?? 0,
  };
}
export function mealInput(m: Omit<Meal, "id">): Backend.MealInput {
  return {
    mealName: m.name,
    date: m.date,
    calories: nat(m.calories),
    protein: nat(m.proteinG),
    carbs: nat(m.carbsG),
    fat: nat(m.fatG),
    details: [
      JSON.stringify({
        mealType: m.mealType,
        notes: m.notes,
        proteinG: m.proteinG,
        carbsG: m.carbsG,
        fatG: m.fatG,
      }),
    ],
  };
}
export function meal(m: Backend.MealView): Meal {
  return {
    mealType: "snack",
    notes: "",
    proteinG: Number(m.protein),
    carbsG: Number(m.carbs),
    fatG: Number(m.fat),
    ...details<Meal>(m.details),
    id: String(m.id),
    date: m.date,
    name: m.mealName,
    calories: Number(m.calories),
  };
}
export function profile(p: Backend.UserProfile): SocialProfile {
  return {
    ...p,
    avatarUrl: p.avatarUrl[0],
    displayName: p.displayName[0],
    email: p.email[0],
    phone: p.phone[0],
    followersCount: Number(p.followersCount),
    followingCount: Number(p.followingCount),
  };
}
export function schedule(s: Backend.EntryView): WeeklyScheduleEntry {
  return {
    id: s.id[0] ?? `${s.dayOfWeek}:${s.exerciseName}`,
    dayOfWeek: Number(s.dayOfWeek) as WeeklyScheduleEntry["dayOfWeek"],
    exerciseName: s.exerciseName,
    sets: Number(s.sets),
    reps: Number(s.reps),
    weightKg: s.weightKg[0] ?? 0,
    lastEditedTimestamp: s.lastEditedTimestamp.length
      ? new Date(ms(s.lastEditedTimestamp[0])).toISOString()
      : undefined,
  };
}
export function scheduleInput(s: WeeklyScheduleEntry): Backend.EntryView {
  return {
    id: [s.id],
    dayOfWeek: nat(s.dayOfWeek),
    exerciseName: s.exerciseName,
    sets: nat(s.sets),
    reps: nat(s.reps),
    weightKg: opt(s.weightKg),
    lastEditedWeight: opt(s.weightKg),
    lastEditedTimestamp: s.lastEditedTimestamp
      ? [BigInt(Date.parse(s.lastEditedTimestamp)) * 1_000_000n]
      : [],
  };
}
export async function post(
  p: Backend.Post,
  actor: BackendActor,
): Promise<Post> {
  const [liked, author] = await Promise.all([
    actor.hasLiked(p.id),
    actor.getProfile(p.authorId),
  ]);
  return {
    ...p,
    id: String(p.id),
    timestamp: ms(p.timestamp),
    photoUrl: p.photoUrl[0],
    authorAvatarUrl: author[0]?.avatarUrl[0],
    likeCount: Number(p.likeCount),
    commentCount: Number(p.commentCount),
    isLikedByMe: liked,
  };
}
export const comment = (c: Backend.Comment): Comment => ({
  ...c,
  id: String(c.id),
  postId: String(c.postId),
  timestamp: ms(c.timestamp),
});
export const story = (s: Backend.Story): Story => ({
  ...s,
  id: String(s.id),
  text: s.text[0],
  timestamp: ms(s.timestamp),
});
export const message = (m: Backend.Message): Message => ({
  ...m,
  timestamp: ms(m.timestamp),
  reactions: m.reactions.map((r) => ({
    emoji: r.emoji,
    userId: r.userId.toText(),
    timestamp: ms(r.timestamp),
  })),
});
