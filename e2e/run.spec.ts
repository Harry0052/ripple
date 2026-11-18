import { expect, test } from "@playwright/test";

test("a consented bill run persists and stays private", async ({ page, browser }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/w/split-a-bill/run");
  await expect(page.getByText("Nothing has started.")).toBeVisible();
  await page.getByLabel("Bill total").fill("80");
  await page.getByLabel("Tip percent").fill("20");
  await page.getByLabel("People").fill("0");
  await page.getByRole("button", { name: "Run Split a bill fairly" }).click();
  await expect(page.getByRole("alert").first()).toContainText(/at least 1|Allow every step/);
  await page.screenshot({ path: "docs/screenshots/03-run-preview-390.png" });

  await page.getByLabel("People").fill("4");
  for (const box of await page.getByRole("checkbox").all()) {
    await box.check();
  }
  await page.getByRole("button", { name: "Run Split a bill fairly" }).click();
  await expect(page.getByText("Each person pays $24.00.")).toBeVisible();
  const runUrl = page.url();
  await page.reload();
  await expect(page.getByText("Each person pays $24.00.")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "docs/screenshots/03-run-console-1440.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/runs");
  await expect(page.getByRole("heading", { name: "Split a bill fairly" })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/03-my-runs-390.png" });

  const other = await browser.newContext();
  const outsider = await other.newPage();
  await outsider.goto(runUrl);
  await expect(outsider.getByRole("heading", { name: "That page is not in Ripple" })).toBeVisible();
  await other.close();
  expect(errors).toEqual([]);
});

test("a checklist can be stopped before it is saved", async ({ page }) => {
  await page.goto("/w/pack-a-list/run");
  await page.getByRole("textbox", { name: "Items" }).fill("passport, charger");
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await page.getByRole("button", { name: "Run Pack a list" }).click();
  await expect(page.getByText("needs approval").first()).toBeVisible();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByText("cancelled").first()).toBeVisible();
  await expect(page.getByText("submissionId")).toHaveCount(0);
});
