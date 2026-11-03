import { expect, test } from "@playwright/test";

test("guest can enter the DSH-Music demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /a soundtrack for your state of mind/i })).toBeVisible();
  await page.getByRole("button", { name: /try the demo/i }).click();
  await expect(page.getByRole("heading", { name: /what does today sound like/i })).toBeVisible();
  await page.getByRole("button", { name: /create my playlist/i }).click();
  await expect(page.locator(".workspace-heading .eyebrow").filter({ hasText: /30-track demo draft/i })).toBeVisible();
  await expect(page.locator("iframe[title*='Rick Astley']")).toBeVisible();
});
