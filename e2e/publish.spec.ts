import { expect, test } from "@playwright/test";

test("a creator publishes v1, and v2 does not change the earlier run", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`author-${Date.now()}@ripple.local`);
  await page.getByLabel("Password").fill("correct-horse");
  await page.getByLabel("Handle").fill(`author${Date.now().toString().slice(-6)}`);
  await page.getByLabel("Display name").fill("Author");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Create" })).toBeVisible();

  await page.getByRole("button", { name: "New recipe" }).click();
  await expect(page.getByRole("heading", { name: "Double a number" })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/04-studio-390.png" });
  await page.getByLabel("Visibility").selectOption("public");
  await page.getByRole("button", { name: "Dry-run sample" }).click();
  await expect(page.getByText("Dry run succeeded: Double is 8.")).toBeVisible();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published version 1")).toBeVisible();

  const recipeHref = await page.getByRole("link", { name: "Open recipe" }).getAttribute("href");
  const studioUrl = page.url();
  await page.goto(`${recipeHref}/run`);
  await page.getByLabel("Value").fill("4");
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await page.getByRole("button", { name: "Run Double a number" }).click();
  await expect(page.getByText("Double is 8.")).toBeVisible();
  const firstRun = page.url();

  await page.goto(studioUrl);
  await page.getByRole("button", { name: "Start next version" }).click();
  await expect(page.getByLabel("Template")).toBeVisible();
  await page.getByLabel("Template").fill("Twice is {{doubled}}.");
  await page.getByRole("button", { name: "Dry-run sample" }).click();
  await expect(page.getByText("Dry run succeeded: Twice is 8.")).toBeVisible();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published version 2")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "docs/screenshots/04-published-1440.png" });

  await page.goto(firstRun);
  await expect(page.getByText("Double is 8.")).toBeVisible();
  await expect(page.getByText("Twice is 8.")).toHaveCount(0);
  expect(errors).toEqual([]);
});
