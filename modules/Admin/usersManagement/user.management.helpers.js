/**
 * user.management.helpers.js
 * ──────────────────────────
 * Reusable helpers for the User Management controller.
 * Extracted to eliminate code duplication and fix critical bugs:
 *   1. Safe age calculation (prevents MongoDB crash on invalid DOB)
 *   2. Centralized date-preset resolution
 *   3. Null-safe nested profile update mapping
 */

/**
 * Returns MongoDB aggregation $addFields stage that safely calculates
 * a user's age from `profile.dob` without crashing on malformed strings.
 *
 * Uses `$convert` with `onError`/`onNull` fallbacks so that a bad DOB
 * value (e.g. "not-a-date") produces `null` instead of killing the
 * plan executor.
 *
 * @returns {Object} A single `{ $addFields: { ... } }` stage object
 */
function getSafeAgePipeline() {
  return {
    $addFields: {
      "profile.calculatedAge": {
        $let: {
          vars: {
            parsedDate: {
              $convert: {
                input: "$profile.dob",
                to: "date",
                onError: null,
                onNull: null,
              },
            },
          },
          in: {
            $cond: {
              if: { $eq: ["$$parsedDate", null] },
              then: null,
              else: {
                $dateDiff: {
                  startDate: "$$parsedDate",
                  endDate: "$$NOW",
                  unit: "year",
                },
              },
            },
          },
        },
      },
    },
  };
}

/**
 * Resolves a date-range preset string (or custom from/to pair) into
 * a `{ startDate, endDate }` object.  Returns `{}` when no range
 * applies, which lets the caller skip the filter.
 *
 * @param {string} [preset]  - "today" | "yesterday" | "last7" | "last30" | "last90" | "custom"
 * @param {string} [from]    - ISO date string for custom range start
 * @param {string} [to]      - ISO date string for custom range end
 * @returns {{ startDate?: Date, endDate?: Date }}
 */
function resolveDatePreset(preset, from, to) {
  const now = new Date();

  if (from && to) {
    const startDate = new Date(from);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  if (!preset) return {};

  switch (preset) {
    case "today": {
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startDate, endDate };
    }
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const startDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      const endDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      return { startDate, endDate };
    }
    case "last7": {
      const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate, endDate: now };
    }
    case "last30": {
      const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate, endDate: now };
    }
    case "last90": {
      const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { startDate, endDate: now };
    }
    case "custom": {
      // Custom with only `from` — open-ended range
      if (from) {
        const startDate = new Date(from);
        startDate.setHours(0, 0, 0, 0);
        return { startDate };
      }
      return {};
    }
    default:
      return {};
  }
}

/**
 * Maps a nested profile update payload into flat dot-notation keys
 * suitable for a Mongoose `$set` operation.
 *
 * Null-safe: guards against `typeof null === 'object'` crashing
 * `Object.keys(null)`.
 *
 * @param {Object} profile  - The profile portion of the request body
 * @returns {Object}        - Flat dot-notation update object
 */
function mapNestedProfileUpdates(profile) {
  const profileUpdate = {};

  const flatFields = [
    "nickname", "gender", "age", "height",
    "about", "jobTitle", "company", "school", "livingIn",
  ];

  flatFields.forEach((field) => {
    if (profile[field] !== undefined) profileUpdate[field] = profile[field];
  });

  ["attributes", "location", "settings"].forEach((parentKey) => {
    // Guard: skip null / undefined / non-object values
    if (
      profile[parentKey] &&
      typeof profile[parentKey] === "object" &&
      !Array.isArray(profile[parentKey])
    ) {
      Object.keys(profile[parentKey]).forEach((childKey) => {
        const childValue = profile[parentKey][childKey];
        // Double-nested objects (e.g. settings.notifications.push)
        if (
          childValue &&
          typeof childValue === "object" &&
          !Array.isArray(childValue)
        ) {
          Object.keys(childValue).forEach((grandChildKey) => {
            profileUpdate[`${parentKey}.${childKey}.${grandChildKey}`] =
              childValue[grandChildKey];
          });
        } else {
          profileUpdate[`${parentKey}.${childKey}`] = childValue;
        }
      });
    }
  });

  return profileUpdate;
}

module.exports = {
  getSafeAgePipeline,
  resolveDatePreset,
  mapNestedProfileUpdates,
};
