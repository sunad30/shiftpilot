import { test, expect } from "@playwright/test";
test("inspect, approve, persist, filter and reset a recommendation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Coverage, with confidence." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Generate recommendation" }).click();
  await expect(
    page.getByRole("heading", { name: "Jordan Ellis" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Candidate checks" }).click();
  await expect(page.getByText("Overlapping assignment")).toBeVisible();
  await page.getByRole("tab", { name: "Run trace" }).click();
  await expect(
    page.getByText("validate_proposal", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Recommendation", exact: true }).click();
  await page.getByRole("button", { name: "Approve assignment" }).click();
  await expect(
    page.getByText("Assignment approved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Assignment approved", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Assigned", exact: true }).click();
  await expect(page.locator(".request")).toHaveCount(1);
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.getByRole("button", { name: "All requests" }).click();
  await expect(page.locator(".request")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("escalate impossible request and reject eligible proposal", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /SP-1044/ }).click();
  await page.getByRole("button", { name: "Generate recommendation" }).click();
  await expect(
    page.getByRole("heading", { name: "No eligible match. Nothing assigned." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve assignment" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /SP-1043/ }).click();
  await page.getByRole("button", { name: "Generate recommendation" }).click();
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(
    page.getByText("Proposal rejected", { exact: true }),
  ).toBeVisible();
});
