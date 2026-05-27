/**
 * Pure helper functions for the Admin Advanced Dashboard Metrics.
 */

/**
 * Parses the date range based on preset parameters or custom dates.
 * @param {Object} query The request query object.
 * @param {Date} now The current Date instance.
 * @returns {Object} Calculated dates and labels.
 */
function parseDateRange(query, now) {
  const presetParam = query.preset;
  const fromQuery = query.from || query.startDate;
  const toQuery = query.to || query.endDate;

  let startDate, endDate;

  if (presetParam === "today") {
    startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now);
  } else if (presetParam === "yesterday") {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
  } else if (presetParam === "last7") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    endDate = new Date(now);
  } else if (presetParam === "last30") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    endDate = new Date(now);
  } else {
    startDate = fromQuery
      ? new Date(fromQuery)
      : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    endDate = toQuery ? new Date(toQuery) : now;
  }
  const durationMs = endDate.getTime() - startDate.getTime();

  // For comparison (vs yesterday or vs last period)
  const prevStartDate = new Date(startDate.getTime() - durationMs);
  const prevEndDate = startDate;

  // Meta Labels & Context
  let periodLabel = "Custom Range";
  let contextLabel = "vs previous period";
  let preset = presetParam || "custom";

  if (preset === "today") {
    periodLabel = "Today";
    contextLabel = "vs yesterday";
  } else if (preset === "yesterday") {
    periodLabel = "Yesterday";
    contextLabel = "vs day before";
  } else if (preset === "last7") {
    periodLabel = "Last 7 Days";
    contextLabel = "vs previous 7 days";
  } else if (preset === "last30") {
    periodLabel = "Last 30 Days";
    contextLabel = "vs previous 30 days";
  } else {
    const hours = durationMs / (1000 * 60 * 60);
    if (hours <= 25) {
      periodLabel = "Today";
      contextLabel = "vs yesterday";
      preset = "today";
    } else if (hours <= 170) {
      periodLabel = "Last 7 Days";
      contextLabel = "vs previous 7 days";
      preset = "last7";
    }
  }

  return {
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
    preset,
    periodLabel,
    contextLabel,
    durationMs,
  };
}

/**
 * Builds the chart date array formatted as YYYY-MM-DD.
 * @param {Date} startDate Starting date.
 * @param {Date} endDate Ending date.
 * @param {string} preset Preset range identifier.
 * @returns {string[]} Array of date strings.
 */
function buildChartDates(startDate, endDate, preset) {
  const chartDates = [];
  const daysDiff = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const maxPoints = Math.min(daysDiff, preset === "last90" ? 90 : 30);
  for (let i = maxPoints; i >= 0; i--) {
    const d = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
    chartDates.push(d.toISOString().split("T")[0]);
  }
  return chartDates;
}

/**
 * Processes revenue raw aggregation records into subcategories.
 * @param {Array} agg Raw revenue aggregate results.
 * @param {string[]} boostKeys Keys matching consumable Boosts.
 * @param {string[]} superkeenKeys Keys matching consumable Superkeens.
 * @returns {Object} Revenue statistics categorized.
 */
function processRevenue(agg, boostKeys, superkeenKeys) {
  let total = 0;
  let boost = 0;
  let superkeen = 0;
  let subscription = 0;
  (agg || []).forEach((x) => {
    total += x.totalAmount;
    if (boostKeys.includes(x._id)) {
      boost += x.totalAmount;
    } else if (superkeenKeys.includes(x._id)) {
      superkeen += x.totalAmount;
    } else {
      subscription += x.totalAmount;
    }
  });
  return { total, boost, superkeen, subscription };
}

/**
 * Formats a monetary value for display.
 * @param {number} val Number representing the amount.
 * @returns {string} Formatted string.
 */
function formatAmount(val) {
  const num = val || 0;
  if (num >= 100000) return `$${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}k`;
  return `$${num.toFixed(2)}`;
}

/**
 * Processes the raw heatmap aggregation.
 * @param {Array} rawAgg Raw query aggregate result.
 * @returns {Array} List of heatmap data objects.
 */
function buildHeatmapData(rawAgg) {
  return (rawAgg || []).map((item) => ({
    date: item._id.date,
    slot: item._id.slot,
    count: item.count,
    intensity:
      item.count > 100 ? 3 : item.count > 50 ? 2 : item.count > 10 ? 1 : 0,
  }));
}

module.exports = {
  parseDateRange,
  buildChartDates,
  processRevenue,
  formatAmount,
  buildHeatmapData,
};
