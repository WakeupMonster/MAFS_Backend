# Swipe Feed Empty on Refill — Fix Documentation

## 🐛 Issue Summary
The swipe feed endpoint (`GET /api/v1/swipe/feed`) returns empty results on same-session refill (Call 2), even though fresh candidates exist on the server. Works fine after app restart (Call 3).

## 🔴 Root Cause Analysis

### The Problem Flow:
1. **Call 1 (Initial Load):**
   - CACHE_KEY (60s TTL): MISS → Fetch from DB, cache 20 profiles
   - SEEN_KEY (24h TTL): Add all 20 to Redis set
   - Return: 20 profiles ✓

2. **Call 2 (Same Session, Refill ~90s later):**
   - CACHE_KEY: MISS (60s expired)
   - SEEN_KEY: HIT (still has 20 from Call 1)
   - Exclusion list: `baseExcludeSet + seenProfiles = (swipes/matches/blocks) + 20 seen`
   - Query: `SELECT * WHERE userId NOT IN [all 20 + past swipes]`
   - If total eligible candidates ≤ 20: **Returns 0 profiles** ❌
   - Pool exhaustion logic *should* retry BUT conditions too restrictive
   - Result: Empty array returned

3. **Call 3 (App Restart → Fresh Session):**
   - Same token, but client has reset
   - Server eventually returns fresh profiles after time passes
   - Result: 20 new profiles ✓

### Why Original Retry Logic Failed:
Line 339 (before fix):
```javascript
if (additionalProfiles.length === 0 && seenProfiles.length > 0 && page === 1)
```
- **additionalProfiles** = results from regular profile query (excluding superlikers/boosted)
- If ANY superlikers/boosted profiles exist, condition is FALSE even though pool is exhausted
- Retry never triggers → Empty response sent to user

## ✅ Fix Implementation

### Changes Made:

#### 1. **swipe.validation.js** — Add `refresh` query parameter
```javascript
refresh: Joi.boolean().optional() // force clear seen profiles & fetch fresh batch
```

#### 2. **swipe.controller.js** — Parse and pass refresh flag
```javascript
const isRefresh = req.query.refresh === 'true' || req.query.refresh === true;
const feedResult = await service.getFeedService(userId, limit, page, isRefresh);
```

#### 3. **swipe.service.js** — Three critical changes:

**A. Clear caches on explicit refresh (lines 6-16):**
```javascript
if (isRefresh && redis && page === 1) {
  await redis.del(SEEN_KEY);    // Clear 24h seen accumulation
  await redis.del(CACHE_KEY);   // Force fresh fetch
}
```

**B. Skip seen profiles when refresh requested (lines 38-44):**
```javascript
let seenProfiles = [];
if (redis && !isRefresh) {  // ← NEW: skip if refresh=true
  seenProfiles = await redis.sMembers(SEEN_KEY);
}
```

**C. More aggressive retry logic (lines 337-368):**
```javascript
const isPoolExhausted = additionalProfiles.length === 0 && seenProfiles.length > 0;
const isBelowLimit = profiles.length < limit;

if (isPoolExhausted && isBelowLimit && page === 1) {
  // Retry even if we have some superlikers/boosted (not meeting limit)
  // This fixes the case where superlikers exist but pool is still exhausted
}
```

## 🎯 How Frontend Should Use This

### For Initial Load (App Open):
```javascript
GET /api/v1/swipe/feed
// No refresh param → Uses cache & seen profiles
```

### For Deck Refill (User Wants Fresh Profiles):
```javascript
GET /api/v1/swipe/feed?refresh=true
// Clears SEEN_KEY & CACHE_KEY → Gets fresh 20 profiles
```

### For Pagination (Load More):
```javascript
GET /api/v1/swipe/feed?page=2
// No refresh → Fetches page 2 without clearing seen profiles
```

## 🧪 Test Scenarios

### Scenario 1: Initial Load + Quick Refill
1. Call: `GET /api/v1/swipe/feed` → Should return ~20 profiles (cached or fresh)
2. Wait 2 seconds (within cache TTL)
3. Call: `GET /api/v1/swipe/feed` → Should return cached 20 profiles (same as #1)
4. Call: `GET /api/v1/swipe/feed?refresh=true` → Should return 20 NEW profiles ✓

### Scenario 2: Pool Exhaustion with Superlikers
1. Call: `GET /api/v1/swipe/feed` → Returns 3 superlikers + 17 regular = 20 profiles
2. User swipes all 20
3. Call: `GET /api/v1/swipe/feed` → Should retry and return 20 fresh (not empty) ✓

### Scenario 3: After Cache Expiry
1. Call: `GET /api/v1/swipe/feed` → 20 profiles, caches for 60s
2. Wait 65 seconds
3. Call: `GET /api/v1/swipe/feed` → Cache expired, re-fetches with seenProfiles exclusion
   - If pool has 25 total: Returns 5 new profiles ✓
   - If pool has 20 total: Triggers retry, clears seen, returns 20 fresh ✓

### Scenario 4: Backward Compatibility
1. Old frontend (no refresh param) makes requests → Works fine (default false) ✓
2. Admin/crawler calling endpoint → Works fine (isRefresh defaults to false) ✓

## 📊 Performance Impact

### ✅ Positive:
- Explicit refresh is O(1) Redis deletions → Negligible cost
- Retry logic only triggers when needed → No overhead for happy path
- More robust for small candidate pools

### ⚠️ Neutral:
- One additional parameter validation
- Redis deletions are non-blocking

## 🔄 Cache Key Summary

| Key | TTL | Use | Effect |
|-----|-----|-----|--------|
| `feed:{userId}` | 60s | Page 1 results cache | Cleared on refresh=true |
| `feed:seen:{userId}` | 24h | Seen profile IDs | Cleared on refresh=true OR pool exhaustion |
| `feed:exclude:{userId}` | 5min | Exclude list (swipes/matches/blocks) | NOT cleared on refresh (intentional) |

## 🚀 Rollout Notes

1. **Backward Compatible:** No breaking changes. Old clients continue to work.
2. **Server-Safe:** Optional parameter, defaults to false.
3. **Graceful Degradation:** If Redis unavailable, falls back to DB queries (slower but works).
4. **Logging:** Added console logs for `[FEED]` and `[FEED EXHAUST]` to debug in production.

## 📝 Frontend Implementation Checklist

- [ ] Update `fetchSwipeFeed()` to send `?refresh=true` on end-of-deck refill
- [ ] Test Call 1 (initial) → Call 2 (refill) flow
- [ ] Test with small candidate pool (<50 profiles)
- [ ] Verify superlikers still appear after refill
- [ ] Monitor server logs for `[FEED EXHAUST]` messages
- [ ] A/B test user satisfaction after fix

## 🔧 Debugging Commands

```bash
# Check Redis cache keys
redis-cli KEYS "feed:*"

# Monitor seen profiles for a user
redis-cli SMEMBERS "feed:seen:{userId}"

# Check if cache is hit
redis-cli TTL "feed:{userId}"

# Manual refresh for user (admin)
redis-cli DEL "feed:seen:{userId}" "feed:{userId}" "feed:exclude:{userId}"
```

## 📞 Questions?

If pool exhaustion still occurs after this fix:
1. Check if total eligible candidates in DB > 20 (for that user's filters)
2. Verify SEEN_KEY is actually being cleared on refresh
3. Check Redis connection health
4. Review logs for `[FEED EXHAUST]` messages — if not appearing, retry logic isn't triggering
