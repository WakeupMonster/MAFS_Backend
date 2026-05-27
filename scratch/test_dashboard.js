const assert = require("assert");
const helpers = require("../modules/Admin/dashboard/dashboard.helpers");
const queries = require("../modules/Admin/dashboard/dashboard.queries");
const controller = require("../modules/Admin/dashboard/dashboard.advanced.controller");

console.log("=== RUNNING DASHBOARD REFACTOR SCRATCH TESTS ===");

// 1. Test parseDateRange
const now = new Date("2026-05-26T22:40:00.000Z");
const parsed = helpers.parseDateRange({ preset: "last7" }, now);
console.log("Helpers parseDateRange check:");
assert.strictEqual(parsed.preset, "last7");
assert.strictEqual(parsed.periodLabel, "Last 7 Days");
assert.strictEqual(parsed.contextLabel, "vs previous 7 days");
assert.ok(parsed.startDate instanceof Date);
assert.ok(parsed.endDate instanceof Date);
console.log("✓ Date parsing logic is correct.");

// 2. Test buildChartDates
const chartDates = helpers.buildChartDates(new Date("2026-05-19T22:40:00.000Z"), now, "last7");
console.log("Helpers buildChartDates check:");
assert.strictEqual(chartDates.length, 8); // 7 days + today
assert.strictEqual(chartDates[chartDates.length - 1], "2026-05-26");
console.log("✓ Chart dates generation is correct.");

// 3. Test processRevenue
const mockAgg = [
  { _id: "boost_p1", totalAmount: 100 },
  { _id: "superkeen_p1", totalAmount: 50 },
  { _id: "sub_weekly", totalAmount: 500 }
];
const boostKeys = ["boost_p1"];
const superkeenKeys = ["superkeen_p1"];
const rev = helpers.processRevenue(mockAgg, boostKeys, superkeenKeys);
console.log("Helpers processRevenue check:");
assert.strictEqual(rev.total, 650);
assert.strictEqual(rev.boost, 100);
assert.strictEqual(rev.superkeen, 50);
assert.strictEqual(rev.subscription, 500);
console.log("✓ Revenue aggregation helper is correct.");

// 4. Test formatAmount
console.log("Helpers formatAmount check:");
assert.strictEqual(helpers.formatAmount(650), "$650.00");
assert.strictEqual(helpers.formatAmount(1500), "$1.5k");
assert.strictEqual(helpers.formatAmount(150000), "$1.5L");
console.log("✓ Amount formatting is correct.");

// 5. Test buildHeatmapData
const mockHeatmapRaw = [
  { _id: { date: "2026-05-26", slot: 2 }, count: 120 },
  { _id: { date: "2026-05-26", slot: 3 }, count: 60 },
  { _id: { date: "2026-05-26", slot: 4 }, count: 5 }
];
const processedHeatmap = helpers.buildHeatmapData(mockHeatmapRaw);
console.log("Helpers buildHeatmapData check:");
assert.strictEqual(processedHeatmap[0].intensity, 3);
assert.strictEqual(processedHeatmap[1].intensity, 2);
assert.strictEqual(processedHeatmap[2].intensity, 0);
console.log("✓ Heatmap data parsing is correct.");

// 6. Test getProductKeys
const mockProducts = [
  { consumableType: "BOOST", productKey: "boost_p1", appleProductId: "ap_boost_1", googleProductId: "gp_boost_1" },
  { consumableType: "SUPER_KEEN", productKey: "superkeen_p1" },
  { consumableType: "SUBSCRIPTION", productKey: "sub_1" }
];
const productKeys = queries.getProductKeys(mockProducts);
console.log("Queries getProductKeys check:");
assert.ok(productKeys.boostKeys.includes("boost_p1"));
assert.ok(productKeys.boostKeys.includes("ap_boost_1"));
assert.ok(productKeys.boostKeys.includes("gp_boost_1"));
assert.ok(productKeys.superkeenKeys.includes("superkeen_p1"));
assert.strictEqual(productKeys.superkeenKeys.length, 1);
console.log("✓ Product keys categorization is correct.");

console.log("ALL UNIT TESTS PASSED SUCCESSFULLY!");
