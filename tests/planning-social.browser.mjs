import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { encode } from "../server/wire.mjs";
const base = process.env.NLOCKI_BASE_URL || "http://127.0.0.1:5184";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext(),
  page = await context.newPage();
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let userId;
page.on("request", (r) => {
  if (r.url().endsWith("/api/rpc")) {
    try {
      userId ??= r.postDataJSON().key;
    } catch {}
  }
});
const stamp = Date.now().toString(36);
const today = new Date().toLocaleDateString("en-CA"),
  shift = (n) => {
    const d = new Date(today + "T12:00:00");
    d.setDate(d.getDate() + n);
    return d.toLocaleDateString("en-CA");
  };
const day = (new Date(today + "T12:00:00").getDay() + 6) % 7;
async function rpc(method, args = []) {
  const r = await context.request.post(base + "/api/rpc", {
    headers: { Origin: base },
    data: { method, args: encode(args), key: userId },
  });
  const b = await r.json();
  assert.equal(r.status(), 200, JSON.stringify(b));
  return b.result;
}
try {
  await page.goto(base);
  await page
    .getByRole("button", { name: "New here? Create an account" })
    .click();
  await page
    .getByLabel("Email", { exact: true })
    .fill(`plans-${stamp}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Test-plans-password!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Username", { exact: true }).fill("plan_" + stamp);
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.locator('[data-ocid="dashboard.page"]').waitFor();
  await page.goto(base + "/planner");
  assert.equal(
    await page.locator('[data-ocid="planner.week_strip.card"]').count(),
    0,
  );
  await page.getByText("Manage daily routine", { exact: true }).click();
  await page.getByLabel("New daily routine item").fill("Read for 20 minutes");
  await page.getByRole("button", { name: "Add routine", exact: true }).click();
  const toggled = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/rpc") &&
      r.request().postDataJSON()?.method === "toggleTask",
  );
  await page
    .getByRole("checkbox", { name: "Complete Read for 20 minutes" })
    .check();
  await toggled;
  await page.reload();
  await assert.doesNotReject(() =>
    page
      .getByRole("checkbox", { name: "Complete Read for 20 minutes" })
      .waitFor(),
  );
  assert.equal(
    await page
      .getByRole("checkbox", { name: "Complete Read for 20 minutes" })
      .isChecked(),
    true,
  );
  await page.getByRole("button", { name: "Next day", exact: true }).click();
  assert.equal(
    await page
      .getByRole("checkbox", { name: "Complete Read for 20 minutes" })
      .isChecked(),
    false,
  );
  await page
    .locator('[data-ocid="planner.task.input"]')
    .fill("One-off extra task");
  await page.locator('[data-ocid="planner.task.input"]').press("Enter");
  await page.getByText("One-off extra task", { exact: true }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Next day", exact: true }).click();
  await page.getByText("One-off extra task", { exact: true }).waitFor();
  assert.equal(
    (await rpc("getTasksForDate", [shift(1)])).filter(
      (t) => t.title === "Read for 20 minutes",
    ).length,
    1,
  );
  for (const [date, kg] of [
    [shift(-14), 90],
    [shift(-7), 60],
  ])
    await rpc("addWorkout", [
      {
        date,
        exerciseName: "Bench Press",
        sets: 3n,
        reps: 10n,
        weight: [kg],
        details: [],
      },
    ]);
  await page.goto(base + "/fitness");
  await page
    .getByRole("heading", { name: "Fitness Stats", exact: true })
    .waitFor();
  await page.locator('[data-ocid="fitness.weekly_plan_table"]').waitFor();
  assert.equal(
    await page.evaluate(
      () =>
        !!(
          document
            .querySelector('[data-ocid="fitness.today_plan"]')
            .compareDocumentPosition(
              document.querySelector('[data-ocid="fitness.weekly_plan_table"]'),
            ) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
    ),
    true,
  );
  await page
    .getByRole("button", {
      name: `Edit ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][day]} plan`,
    })
    .click();
  const dayCard = page.locator(`[data-ocid="schedule.day.${day + 1}"]`);
  await dayCard.locator(`[data-ocid="schedule.add_button.${day + 1}"]`).click();
  await dayCard
    .locator('[data-ocid="fitness.exercise_search"]')
    .fill("Bench Press");
  await dayCard
    .locator('[data-ocid="fitness.exercise_option.chest-01"]')
    .click();
  await dayCard
    .locator(`[data-ocid="schedule.confirm_add_button.${day + 1}"]`)
    .click();
  await dayCard.getByText("Bench Press", { exact: true }).waitFor();
  await page.reload();
  await page
    .locator('[data-ocid="fitness.today_plan"]')
    .getByText("60 kg", { exact: true })
    .waitFor();
  await page.getByLabel("Today weight for Bench Press").fill("75");
  await page.getByRole("button", { name: "Save planned Bench Press" }).click();
  await page
    .locator('[data-ocid="fitness.today_plan"]')
    .getByText("75 kg", { exact: true })
    .waitFor();
  await page.reload();
  await page
    .locator('[data-ocid="fitness.today_plan"]')
    .getByText("75 kg", { exact: true })
    .waitFor();
  await page.getByLabel("Fitness date", { exact: true }).fill(shift(7));
  await page
    .locator('[data-ocid="fitness.today_plan"]')
    .getByText("75 kg", { exact: true })
    .waitFor();
  assert.equal(
    await page.getByLabel("Today weight for Bench Press").inputValue(),
    "",
  );
  await page.getByLabel("Fitness date", { exact: true }).fill(shift(1));
  await page
    .getByText("Rest day · No exercises planned.", { exact: true })
    .waitFor();
  const schedule = await rpc("getWeeklySchedule");
  assert.equal(schedule.length, 1);
  await rpc("updateScheduleEntry", [
    {
      id: ["second-entry"],
      dayOfWeek: BigInt(day),
      exerciseName: "Squat",
      sets: 3n,
      reps: 10n,
      weightKg: [20],
      lastEditedTimestamp: [],
    },
  ]);
  await rpc("deleteScheduleEntry", [schedule[0].id[0]]);
  assert.equal((await rpc("getWeeklySchedule"))[0].exerciseName, "Squat");
  await page.goto(base + "/people");
  await page
    .getByLabel("Post text")
    .fill("Progress this week\n75 kg on bench!");
  await page.locator('[data-ocid="people.create_post.submit_button"]').click();
  const post = page.locator('[data-ocid="people.post.item.1"]');
  await post
    .getByText("Progress this week\n75 kg on bench!", { exact: true })
    .waitFor();
  await post.getByRole("button", { name: "Like post", exact: true }).click();
  await post
    .getByRole("button", { name: "Unlike post", exact: true })
    .waitFor();
  await post.getByRole("button", { name: "Show comments" }).click();
  await page.getByLabel("Add a comment", { exact: true }).fill("Keep going!");
  await page.getByRole("button", { name: "Send comment" }).click();
  await post.getByText("Keep going!", { exact: true }).waitFor();
  await page.reload();
  await post
    .getByRole("button", { name: "Unlike post", exact: true })
    .waitFor();
  await post.getByRole("button", { name: "Show comments" }).click();
  await post.getByText("Keep going!", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: recurring tasks/day-specific checks, extra tasks, weekly plan creation/persistence, latest previous weight (not max), next-week progression, rest days, atomic plan removal, post/like/comment persistence and mobile width",
  );
} catch (error) {
  console.log(
    "Browser state on failure:",
    (await page.locator("body").innerText()).slice(-3000),
  );
  await page.screenshot({ path: "/tmp/nlocki-plan-failure.png" });
  throw error;
} finally {
  if (userId)
    await context.request
      .post(base + "/api/account/delete", {
        headers: { Origin: base },
        data: {
          method: "accountDelete",
          args: ["Test-plans-password!"],
          key: userId,
        },
      })
      .catch(() => {});
  await browser.close();
}
