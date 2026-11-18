import { expect, test } from "@playwright/test";

test("a visitor can search and inspect a stored demo recipe", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Split a bill fairly" })).toBeVisible();
  await expect(page.getByText("Does not send them to another service").first()).toBeVisible();
  await expect(page.getByText("Not verified by a run yet").first()).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/02-explore-390.png" });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "docs/screenshots/02-explore-1440.png" });

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();

  await page.getByLabel("Search recipes").fill("zzzz-no-such-recipe");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("heading", { name: "Nothing matches" })).toBeVisible();
  await expect(page.getByText(/Clear the filters/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "docs/screenshots/02-explore-no-results-390.png" });

  await page.goto("/?category=text-tools");
  await expect(page.getByRole("heading", { name: "Pack a list" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Split a bill fairly" })).toHaveCount(0);

  await page.goto("/w/split-a-bill");
  await expect(page.getByRole("heading", { level: 1, name: "Split a bill fairly" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Permissions" })).toBeVisible();
  await expect(page.getByText("bill * tipPercent / 100")).toBeVisible();
  await expect(page.getByText("After a separate approval")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Preview and run" })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "docs/screenshots/02-detail-bill-390.png" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "docs/screenshots/02-detail-bill-1440.png" });

  await page.goto("/w/not-a-recipe");
  await expect(page.getByRole("heading", { name: "That page is not in Ripple" })).toBeVisible();
  expect(errors).toEqual([]);
});
