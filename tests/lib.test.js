const test = require("node:test");
const assert = require("node:assert");
const L = require("../lib.js");

test("formats naira with separators", () => {
  assert.strictEqual(L.formatNaira(150000), "₦150,000");
  assert.strictEqual(L.formatNaira(0), "₦0");
});
test("filters by month and sums", () => {
  const list = [{ date: "2026-10-01", amount: 100, category: "Food" }, { date: "2026-09-30", amount: 50, category: "Food" }, { date: "2026-10-09", amount: 25, category: "Transport" }];
  const oct = L.inMonth(list, "2026-10");
  assert.strictEqual(oct.length, 2);
  assert.strictEqual(L.sum(oct), 125);
  assert.deepStrictEqual(L.ranked(oct).map((x) => x.name), ["Food", "Transport"]);
});
test("daily allowance and days left", () => {
  assert.strictEqual(L.daysLeft("2026-10", new Date(2026, 9, 2)), 30);
  assert.strictEqual(L.daysLeft("2026-09", new Date(2026, 9, 2)), null);
  assert.strictEqual(L.dailyAllowance(3000, 30), 100);
  assert.strictEqual(L.dailyAllowance(-5, 30), 0);
});
test("CSV escapes commas and quotes", () => {
  const csv = L.toCSV([{ date: "2026-10-01", category: "Food", note: 'Rice, "big" bag', amount: 9000 }]);
  assert.strictEqual(csv.split("\n")[1], '2026-10-01,Food,"Rice, ""big"" bag",9000');
});
