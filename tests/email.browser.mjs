import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const base = process.env.NLOCKI_BASE_URL || "http://127.0.0.1:5177";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
  args: ["--no-sandbox"],
});
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(45_000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const suffix = Date.now().toString(36),
  email = `local-${suffix}@example.test`,
  password = `Test-${suffix}-only!`,
  username = `email_${suffix}`;
try {
  await page.goto(base);
  await page
    .getByRole("button", { name: "New here? Create an account" })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Login with Internet Identity" })
      .count(),
    0,
  );
  assert.equal(
    await page.locator("h1").evaluate((e) => getComputedStyle(e).fontSize),
    "36px",
  );
  if (process.env.NLOCKI_SCREENSHOT_DIR) {
    mkdirSync(process.env.NLOCKI_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({
      path: `${process.env.NLOCKI_SCREENSHOT_DIR}/email-login.png`,
    });
  }
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  const config = await (
    await context.request.get(`${base}/api/auth/config`)
  ).json();
  if (config.requireVerification) {
    await page.getByRole("heading", { name: "Confirm your email" }).waitFor();
    const inbox = await (
      await context.request.get(`${base}/api/auth/dev/inbox`)
    ).text();
    const code = inbox.match(new RegExp(`${email}: <strong>([0-9]{6})`))?.[1];
    assert.ok(code);
    await page.getByLabel("Confirmation code").fill(code);
    await page
      .getByRole("button", { name: "Confirm email", exact: true })
      .click();
  }
  await page.getByRole("heading", { name: "Set up your profile" }).waitFor();
  await page.getByLabel("Display name", { exact: true }).fill("Email tester");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.getByText("Goal Progress", { exact: true }).waitFor();
  await page
    .getByRole("link", { name: "Daily Planner", exact: true })
    .first()
    .click();
  const taskInput = page.locator('[data-ocid="planner.task.input"]');
  await taskInput.fill(`Email task ${suffix}`);
  await taskInput.press("Enter");
  await page.getByText(`Email task ${suffix}`, { exact: true }).waitFor();
  await page.reload();
  await page.getByText(`Email task ${suffix}`, { exact: true }).waitFor();
  await page.locator('[data-ocid="header.user_menu_button"]').click();
  await page.locator('[data-ocid="header.logout_button"]').click();
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByText("Email or password is incorrect.", { exact: true })
    .waitFor();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText(`Email task ${suffix}`, { exact: true }).waitFor();
  await page.locator('[data-ocid="header.user_menu_button"]').click();
  await page.locator('[data-ocid="header.profile_link"]').click();
  await page
    .getByRole("button", { name: "Set up two-factor authentication" })
    .click();
  await page.getByText("Enter the key manually", { exact: true }).click();
  await page.getByAltText("Authenticator setup QR code").waitFor();
  const secret = await page
    .locator('[data-ocid="profile.security"] code')
    .innerText();
  let bits = 0,
    acc = 0;
  const bytes = [];
  for (const c of secret) {
    acc = acc * 32 + "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 255);
      acc %= 2 ** bits;
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha256", Buffer.from(bytes))
    .update(counter)
    .digest();
  const offset = digest[digest.length - 1] & 15;
  const totp = String(
    (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000,
  ).padStart(6, "0");
  await page.getByLabel("Confirm authenticator code").fill(totp);
  await page
    .getByRole("button", {
      name: "Enable two-factor authentication",
      exact: true,
    })
    .click();
  await page
    .getByRole("heading", { name: "Your account is protected" })
    .waitFor();
  const recovery = await page
    .locator("section .font-mono > div")
    .allTextContents();
  assert.equal(recovery.length, 4);
  await page
    .getByRole("button", { name: "I saved my codes — continue" })
    .click();
  await page.reload();
  await page.getByRole("heading", { name: "One more step" }).waitFor();
  await page
    .getByText("Lost your device? Use a recovery code", { exact: true })
    .click();
  await page.getByLabel("Recovery code").fill(recovery[0]);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await page.locator('[data-ocid="profile.security"]').waitFor();
  await page
    .getByRole("button", {
      name: "Disable two-factor authentication",
      exact: true,
    })
    .click();
  await page.getByLabel("Disable authenticator code").fill(recovery[1]);
  await page.getByRole("button", { name: "Disable 2FA", exact: true }).click();
  await page
    .getByText("Two-factor authentication not enabled", { exact: true })
    .waitFor();
  await page.goto(base);
  await page.getByText("Goal Progress", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("navigation", { name: "Mobile navigation" }).waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    `PASS: styled local email signup${config.requireVerification ? ", confirmation code" : ""}, real backend profile/task persistence, reload, logout, wrong password, same account login, optional TOTP/recovery and mobile layout`,
  );
} finally {
  await browser.close();
}
