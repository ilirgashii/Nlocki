import assert from "node:assert/strict";
import { chromium } from "playwright-core";
const base = process.env.NLOCKI_BASE_URL || "http://127.0.0.1:5181";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
page.setDefaultTimeout(45_000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const suffix = Date.now().toString(36);
try {
  await page.goto(base);
  await page
    .getByRole("button", { name: "New here? Create an account" })
    .click();
  await page
    .getByLabel("Email", { exact: true })
    .fill(`nutrition-${suffix}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("nutrition-test-password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Username", { exact: true }).fill(`nutri_${suffix}`);
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.locator('[data-ocid="dashboard.page"]').waitFor();
  await page.goto(`${base}/nutrition`);
  await page
    .getByText(
      "No foods logged yet. Search All Foods below to add your first meal.",
    )
    .waitFor();
  await page.locator('[data-ocid="nutrition.food_search_toggle"]').click();
  await page
    .locator('[data-ocid="nutrition.preset_search_input"]')
    .fill("Apple");
  await page.locator('[data-ocid="nutrition.preset_meal_type.snack"]').click();
  await page
    .getByRole("spinbutton", { name: "Apple (raw) portion in grams" })
    .fill("200");
  await page
    .locator('[data-ocid="nutrition.preset_item.1"]')
    .getByText("104 kcal", { exact: true })
    .waitFor();
  await page.locator('[data-ocid="nutrition.preset_add_button.1"]').click();
  await page
    .locator('[data-ocid="calories.eaten"]')
    .getByText("104 kcal", { exact: true })
    .waitFor();
  await page.getByLabel("Recent food meal type").selectOption("snack");
  await page
    .getByRole("button", { name: "Add Apple (raw) (200g) again" })
    .click();
  await page
    .locator('[data-ocid="calories.eaten"]')
    .getByText("208 kcal", { exact: true })
    .waitFor();
  await page.reload();
  await page
    .locator('[data-ocid="calories.eaten"]')
    .getByText("208 kcal", { exact: true })
    .waitFor();
  assert.equal(
    await page.locator('[data-ocid="nutrition.recent_foods"] li').count(),
    1,
  );
  await page.goto(`${base}/fitness`);
  await page
    .locator('[data-ocid="fitness.exercise_search"]')
    .fill("Bench Press");
  await page.locator('[data-ocid="fitness.exercise_option.chest-01"]').click();
  await page.locator('[data-ocid="fitness.sets_input"]').fill("3");
  await page.locator('[data-ocid="fitness.reps_input"]').fill("10");
  await page.locator('[data-ocid="fitness.weight_input"]').fill("60");
  await page.getByLabel("Exercise duration (minutes)").fill("10");
  await page.getByLabel("Your body weight (kg)").fill("70");
  await page.getByText("Estimated burn: 43 kcal", { exact: true }).waitFor();
  await page.locator('[data-ocid="fitness.submit_button"]').click();
  await page
    .locator('[data-ocid="calories.burned"]')
    .getByText("43 kcal", { exact: true })
    .waitFor();
  await page
    .locator('[data-ocid="calories.net"]')
    .getByText("165 kcal", { exact: true })
    .waitFor();
  await page.reload();
  await page
    .locator('[data-ocid="calories.net"]')
    .getByText("165 kcal", { exact: true })
    .waitFor();
  await page.getByRole("button", {name:"Edit Bench Press", exact:true}).click();
  await page
    .getByRole("spinbutton", { name: "Edit exercise duration" })
    .fill("20");
  await page.locator('[data-ocid="fitness.save_edit_button.1"]').click();
  await page
    .locator('[data-ocid="calories.burned"]')
    .getByText("86 kcal", { exact: true })
    .waitFor();
  await page.goto(`${base}/nutrition`);
  await page
    .locator('[data-ocid="calories.net"]')
    .getByText("122 kcal", { exact: true })
    .waitFor();
  await page.goto(base);
  await page
    .locator('[data-ocid="calories.net"]')
    .getByText("122 kcal", { exact: true })
    .waitFor();
  await page.locator('[data-ocid="header.user_menu_button"]').click();
  await page.locator('[data-ocid="header.profile_link"]').click();
  await page.locator('[data-ocid="profile.security"]').waitFor();
  assert.equal(await page.getByText(/^ID:/).count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: apple/snack portion calories, recent foods repeat/deduplication, persistent MET estimate and edits, shared food-minus-exercise totals, and profile ID hidden",
  );
} finally {
  await browser.close();
}
