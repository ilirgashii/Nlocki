import assert from "node:assert/strict";
import { chromium } from "playwright-core";
const base = process.env.NLOCKI_BASE_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext(),
  page = await context.newPage();
page.setDefaultTimeout(30000);
let key;
page.on("request", (r) => {
  if (r.url().endsWith("/api/rpc"))
    try {
      key ??= r.postDataJSON().key;
    } catch {}
});
try {
  await page.goto(base);
  await page
    .getByRole("button", { name: "New here? Create an account" })
    .waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const manifest = await (
    await context.request.get(base + "/manifest.webmanifest")
  ).json();
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons) {
    const r = await context.request.get(base + icon.src);
    assert.equal(r.status(), 200);
    assert.match(r.headers()["content-type"], /image\/png/);
    assert.ok((await r.body()).length > 100);
  }
  await page.evaluate(() => {
    window.testInstallCalls = 0;
    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.prompt = async () => {
      window.testInstallCalls++;
    };
    event.userChoice = Promise.resolve({ outcome: "dismissed" });
    window.dispatchEvent(event);
  });
  const stamp = Date.now().toString(36);
  await page
    .getByRole("button", { name: "New here? Create an account" })
    .click();
  await page
    .getByLabel("Email", { exact: true })
    .fill(`pwa-${stamp}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Private-pwa-test-password!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Username", { exact: true }).fill("pwa_" + stamp);
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.locator('[data-ocid="dashboard.page"]').waitFor();
  await page
    .getByRole("link", { name: "Daily Planner", exact: true })
    .first()
    .click();
  await page
    .locator('[data-ocid="planner.task.input"]')
    .fill("PRIVATE_PWA_RECORD_" + stamp);
  await page.locator('[data-ocid="planner.task.input"]').press("Enter");
  await page
    .getByText("PRIVATE_PWA_RECORD_" + stamp, { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Install Nlocki app" }).click();
  await page
    .getByRole("heading", { name: "Install Nlocki", exact: true })
    .waitFor();
  await page.getByText("iPhone / iPad:", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Install app", exact: true }).click();
  assert.equal(await page.evaluate(() => window.testInstallCalls), 1);
  await page.keyboard.press("Escape");
  const entries = await page.evaluate(async () => {
    const result = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys())
        result.push({
          url: request.url,
          text: (await cache.match(request)).headers
            .get("content-type")
            ?.includes("text/")
            ? await (await cache.match(request)).text()
            : "",
        });
    }
    return result;
  });
  assert.ok(entries.some((e) => e.url.endsWith("/offline.html")));
  assert.ok(entries.every((e) => !new URL(e.url).pathname.startsWith("/api/")));
  assert.ok(
    entries.every(
      (e) =>
        !e.text.includes("PRIVATE_PWA_RECORD_") && !e.url.endsWith("/planner"),
    ),
  );
  await context.setOffline(true);
  await page.goto(base + "/planner");
  await page
    .getByRole("heading", { name: "You’re offline", exact: true })
    .waitFor();
  assert.ok(
    !(await page.locator("body").innerText()).includes("PRIVATE_PWA_RECORD_"),
  );
  await page.getByRole("link", { name: "Try again", exact: true }).waitFor();
  await context.setOffline(false);
  await page.getByRole("link", { name: "Try again", exact: true }).click();
  await page.locator('[data-ocid="dashboard.page"]').waitFor();
  await page.goto(base + "/planner");
  await page
    .getByText("PRIVATE_PWA_RECORD_" + stamp, { exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Install Nlocki app" }).click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  console.log(
    "PASS: manifest/icons, controlled service worker, Android/iOS install guidance, exclusion of account APIs and signed-in records from cache, generic offline fallback and recovery of server data.",
  );
} finally {
  await context.setOffline(false);
  if (key)
    await context.request
      .post(base + "/api/account/delete", {
        headers: { Origin: base },
        data: {
          method: "accountDelete",
          args: ["Private-pwa-test-password!"],
          key,
        },
      })
      .catch(() => {});
  await browser.close();
}
