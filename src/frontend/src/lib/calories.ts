/** MET estimate of energy during the logged exercise, including its resting energy. */
export function estimateExerciseCalories(
  minutes: number,
  bodyWeightKg: number,
  met: number,
): number {
  if (
    !Number.isFinite(minutes) ||
    minutes <= 0 ||
    minutes > 600 ||
    !Number.isFinite(bodyWeightKg) ||
    bodyWeightKg < 20 ||
    bodyWeightKg > 400 ||
    !Number.isFinite(met) ||
    met < 1 ||
    met > 20
  )
    throw new Error(
      "Enter 1–600 minutes, a body weight of 20–400 kg, and a valid activity intensity.",
    );
  return Math.round((met * 3.5 * bodyWeightKg * minutes) / 200);
}
export const EXERCISE_INTENSITIES = [
  { met: 3.5, label: "Strength training · moderate" },
  { met: 6, label: "Strength training · vigorous" },
  { met: 4.3, label: "Brisk walking" },
  { met: 7, label: "Jogging" },
  { met: 6.8, label: "Cycling · moderate" },
];
