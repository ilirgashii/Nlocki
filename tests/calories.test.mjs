import assert from "node:assert/strict";
import { estimateExerciseCalories } from "../src/frontend/src/lib/calories.ts";
assert.equal(estimateExerciseCalories(10, 70, 3.5), 43);
assert.equal(estimateExerciseCalories(20, 70, 3.5), 86);
assert.equal(estimateExerciseCalories(30, 80, 6), 252);
assert.equal(estimateExerciseCalories(7.5, 65, 3.5), 30);
for (const values of [
  [0, 70, 3.5],
  [601, 70, 3.5],
  [10, 0, 3.5],
  [10, Infinity, 3.5],
  [10, 70, NaN],
])
  assert.throws(() => estimateExerciseCalories(...values));
console.log(
  "PASS: MET estimates, time/weight/effort changes, decimal duration and invalid inputs",
);
