// Browser smoke test: loads the app, adds an expense, deletes + undoes it.
require("./harness").run("expense-tracker smoke", async (page, base, ok) => {
  await page.goto(base + "/");
  ok((await page.title()).includes("Expense Tracker"), "page loads");
  const before = await page.locator(".receipt").count();
  ok(before > 0, "demo receipts are seeded on first visit");
  await page.fill("#amount", "1234");
  await page.click('.cat-chip[data-cat="Transport"]');
  await page.fill("#note", "Smoke test bus fare");
  await page.click("#submit-expense");
  ok((await page.locator(".receipt").count()) === before + 1, "adding an expense adds a receipt");
  ok((await page.textContent("#expense-tbody")).includes("Smoke test bus fare"), "new receipt shows its note");
  await page.locator(".receipt", { hasText: "Smoke test bus fare" }).locator("[data-delete]").click();
  ok((await page.locator(".receipt").count()) === before, "delete removes it");
  await page.click("#toast-action");
  ok((await page.locator(".receipt").count()) === before + 1, "undo brings it back");
  await page.reload();
  ok((await page.locator(".receipt").count()) === before + 1, "data persists across reloads");
});
