import { expect, test } from "@playwright/test";

test("explore reads an empty library and a search miss", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Run the recipe. See every step." }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "The library is empty" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Saved notes" })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/01-explore-empty-390.png" });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "docs/screenshots/01-explore-empty-1440.png" });

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();

  await page.getByLabel("Search recipes").fill("zzzz-no-such-recipe");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("heading", { name: "Nothing matches" })).toBeVisible();
  await expect(page.getByText(/no published recipes yet/i)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "docs/screenshots/01-explore-no-results-390.png" });

  await page.getByRole("link", { name: "Everyday math" }).click();
  await expect(page).toHaveURL(/category=everyday-math/);
  await page.goto("/not-a-page");
  await expect(page.getByRole("heading", { name: "That page is not in Ripple" })).toBeVisible();
  expect(errors).toEqual([]);
});
