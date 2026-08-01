/**
 * Single source of truth for Australia (AEST/AEDT) time across the app.
 * MAFS is Australia-only — every calendar-boundary calculation (day/week/month
 * resets, "today"/"yesterday" filters, age gating, display timestamps) must
 * go through this file instead of raw `new Date()`/server-local time.
 */
const { DateTime } = require("luxon");

const APP_TZ = (process.env.APP_TIMEZONE || "Australia/Sydney").replace(/^"|"$/g, "");

/** Current time as a Luxon DateTime in the app timezone. */
function nowInAppTz() {
  return DateTime.now().setZone(APP_TZ);
}

/** Given a JS Date (or now, if omitted), the start of that calendar day in
 * the app timezone, returned as a JS Date (UTC instant) for Mongo queries. */
function startOfDay(date) {
  const dt = date ? DateTime.fromJSDate(new Date(date)).setZone(APP_TZ) : nowInAppTz();
  return dt.startOf("day").toJSDate();
}

/** End of that calendar day in the app timezone, as a JS Date. */
function endOfDay(date) {
  const dt = date ? DateTime.fromJSDate(new Date(date)).setZone(APP_TZ) : nowInAppTz();
  return dt.endOf("day").toJSDate();
}

function startOfYesterday() {
  return nowInAppTz().minus({ days: 1 }).startOf("day").toJSDate();
}

function endOfYesterday() {
  return nowInAppTz().minus({ days: 1 }).endOf("day").toJSDate();
}

/** "YYYY-MM-DD" calendar-day key in the app timezone (for daily usage/quota buckets). */
function dateKey(date) {
  const dt = date ? DateTime.fromJSDate(new Date(date)).setZone(APP_TZ) : nowInAppTz();
  return dt.toFormat("yyyy-LL-dd");
}

/** True if two JS Dates fall on the same calendar day in the app timezone. */
function isSameAppDay(dateA, dateB) {
  if (!dateA || !dateB) return false;
  const a = DateTime.fromJSDate(new Date(dateA)).setZone(APP_TZ);
  const b = DateTime.fromJSDate(new Date(dateB)).setZone(APP_TZ);
  return a.toFormat("yyyy-LL-dd") === b.toFormat("yyyy-LL-dd");
}

/** Human-readable timestamp in the app timezone (replaces ad-hoc en-IN/Kolkata formatting). */
function formatForDisplay(date, fmt = "dd LLL yyyy, hh:mm a") {
  if (!date) return "";
  return DateTime.fromJSDate(new Date(date)).setZone(APP_TZ).toFormat(fmt);
}

/** Calendar-accurate age (years) as of "today" in the app timezone. */
function calculateAge(dob) {
  if (!dob) return null;
  const birth = DateTime.fromJSDate(new Date(dob));
  if (!birth.isValid) return null;
  const today = nowInAppTz();
  let age = today.year - birth.year;
  const hadBirthdayThisYear =
    today.month > birth.month || (today.month === birth.month && today.day >= birth.day);
  if (!hadBirthdayThisYear) age--;
  return age;
}

module.exports = {
  APP_TZ,
  nowInAppTz,
  startOfDay,
  endOfDay,
  startOfYesterday,
  endOfYesterday,
  dateKey,
  isSameAppDay,
  formatForDisplay,
  calculateAge,
};
