# 🧪 MAFS Swipe Module — Complete Load Testing Guide

**Version:** 1.0  
**Date:** 11 May 2026  
**Author:** Backend Team  
**Target:** Finding the breaking point on Free Tier infrastructure

---

## 📌 What Is Load Testing? (Zero Knowledge Intro)

Load testing means simulating **many users using your app at the same time** to find out:
- How many users your server can handle before it slows down
- How many before it starts throwing errors
- How many before it completely crashes

**k6** is a free, open-source tool that simulates these virtual users (called **VUs** — Virtual Users). Each VU acts like a real person using your app.

---

## 🏗️ Your Infrastructure (What We're Testing Against)

| Component | Tier | Limits |
|-----------|------|--------|
| **EC2** | t2.micro | 1 vCPU, 1GB RAM, burstable CPU (30 min burst then throttle) |
| **MongoDB Atlas** | M0 (Free) | 500 connections max, shared cluster, limited IOPS |
| **Redis** | Local/ElastiCache | Depends on setup |
| **Node.js** | Single thread | 1 event loop, ~1.5GB heap max |

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `scripts/seed-load-test-users.js` | Creates 10,000 test users + profiles in MongoDB |
| `scripts/generate-load-test-tokens.js` | Generates 2,000 JWT tokens for k6 |
| `k6/scripts/swipe_load_test.js` | The main load test script (gradual ramp-up) |
| `k6/data/load_test_tokens.json` | Generated tokens (auto-created) |
| `k6/data/seeded_user_ids.json` | Seeded user IDs (auto-created) |

---

## 🚀 Step-by-Step Setup

### Step 1: Install k6

**Windows (via Chocolatey):**
```powershell
choco install k6
```

**Windows (via winget):**
```powershell
winget install k6 --source winget
```

**Mac:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Verify installation:**
```powershell
k6 version
```

### Step 2: Seed 10,000 Test Users

```powershell
cd c:\MAFS\mafswm-dating-app
node scripts/seed-load-test-users.js
```

**Expected output:**
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB
🚀 Seeding 10000 test users...
   ✅ Batch 1: Created 500 users (5.0% done)
   ✅ Batch 2: Created 500 users (10.0% done)
   ...
   ✅ Batch 20: Created 500 users (100.0% done)
✅ DONE! Created 10000 test users.
📁 User IDs saved to: k6/data/seeded_user_ids.json
```

### Step 3: Generate 2,000 JWT Tokens

```powershell
node scripts/generate-load-test-tokens.js
```

**Expected output:**
```
📋 Found 10000 seeded user IDs
🔐 Generating 2000 JWT tokens...
✅ Generated 2000 JWT tokens
📁 Saved to: k6/data/load_test_tokens.json
```

### Step 4: Run the Load Test

**Against localhost (development):**
```powershell
k6 run k6/scripts/swipe_load_test.js
```

**Against EC2 production:**
```powershell
k6 run -e API_URL=http://<your-ec2-ip>:3001/api/v1 k6/scripts/swipe_load_test.js
```

---

## 📊 Understanding the Output

When k6 finishes, it prints a summary like this. Here's what every number means:

### Key Metrics Explained

| Metric | What It Means | Good Value |
|--------|--------------|------------|
| **`http_req_duration`** | How long each request took | p95 < 500ms |
| **`p(50)`** | Median — 50% of requests were faster than this | < 200ms |
| **`p(95)`** | 95% of requests were faster than this | < 2000ms |
| **`p(99)`** | 99% of requests were faster than this | < 5000ms |
| **`http_req_failed`** | Percentage of requests that returned errors | < 1% |
| **`vus`** | How many Virtual Users were active | Your target count |
| **`iterations`** | Total number of actions completed | Higher = better |

### Custom Metrics (MAFS-Specific)

| Metric | What It Means |
|--------|--------------|
| **`server_error_rate`** | % of requests that got 5xx errors (real server failures) |
| **`timeout_rate`** | % of requests that timed out (server too slow to respond) |
| **`mongo_txn_errors`** | Count of MongoDB transaction failures (WriteConflict, etc.) |
| **`rate_limit_429`** | Count of rate limit hits (expected, not errors) |
| **`feed_response_ms`** | Response time specifically for GET /swipe/feed |
| **`swipe_response_ms`** | Response time specifically for POST /swipe/action |
| **`matches_response_ms`** | Response time specifically for GET /swipe/matches |

### Example k6 Output (Annotated)

```
          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

     execution: local
        script: k6/scripts/swipe_load_test.js
        output: -

     scenarios: (100.00%) 1 scenario, 2000 max VUs, 28m30s max duration

     ✓ Feed: status 200
     ✓ Swipe: success or expected error
     ✓ Matches: status 200

     checks.........................: 87.23%  ← 87% of checks passed
     
   ✗ http_req_duration..............: avg=342ms  p(50)=180ms  p(95)=1200ms  p(99)=3500ms
       ↑ Average 342ms                          ↑ Median      ↑ 95th %ile    ↑ 99th %ile
       
     http_req_failed................: 12.4%   ← WATCH THIS: >5% means problems
     
     server_error_rate...............: 8.2%   ← Real server errors (5xx only)
     timeout_rate....................: 4.1%   ← Requests that completely timed out
     rate_limit_429..................: 234    ← Rate limiter working correctly
     mongo_txn_errors................: 45     ← MongoDB struggling with transactions

     vus............................: 500     ← Current VU count when test ended
     vus_max........................: 2000    ← Max VU count reached

     iterations.....................: 45230   ← Total actions completed in entire test
```

---

## 🔍 How to Find the Breaking Point

### During the Test

While k6 is running, it shows **live stats**. Watch for these signals:

| Signal | What It Means |
|--------|--------------|
| `p(95)` jumps above 2000ms | **Slowdown starting** — note the VU count |
| `http_req_failed` goes above 5% | **Errors starting** — note the VU count |
| All requests start timing out | **Server is dying** — note the VU count |
| k6 shows "connection refused" | **Server has crashed** |

### After the Test

Look at the summary and answer these questions:

1. **"At what VU count did p95 cross 2 seconds?"**
   → This is your **performance degradation threshold**

2. **"At what VU count did error rate cross 5%?"**
   → This is your **reliability threshold**

3. **"At what VU count did the server stop responding?"**
   → This is your **crash point**

### Expected Results on Free Tier

Based on your code analysis, here's what I predict:

| Stage | VUs | Expected Result |
|-------|-----|-----------------|
| 1-3 | 10-50 | ✅ All green. p95 < 500ms |
| 4 | 100 | ⚠️ p95 starts climbing to 800ms-1s |
| 5 | 200 | 🟡 p95 hits 1.5-2s. First timeouts appear |
| 6 | 300 | 🟠 p95 > 2s. Error rate hits 5%. MongoDB connections filling up |
| 7 | 500 | 🔴 p95 > 5s. Error rate > 20%. EC2 CPU credits depleting |
| 8 | 750 | 💀 Server likely becomes unresponsive. OOM possible |
| 9-11 | 1000-2000 | ☠️ Server crash or total timeout |

### WHY Each Component Fails

**1. Auth Middleware (First Bottleneck)**
```javascript
// auth.middleware.js line 21
const user = await User.findById(decoded.userId);
```
Every single request does a full MongoDB query to load the user. At 200 VUs doing 1 req/sec = **200 DB queries/sec just for auth**.

**2. Feed Service (Heaviest Endpoint)**
```javascript
// swipe.service.js — getFeedService runs 6+ parallel queries:
// - Profile.findOne (my profile)
// - Subscription.findOne (premium check)
// - Swipe.find (all my swipes) 
// - Match.find (all my matches)
// - Block.find (blocks I created)
// - Block.find (blocks against me)
// - Report.find (my reports)
// - Swipe.find (superlikes received)
// - BlockedContact.find (contact blocks)
// - User.find (non-active users)
// THEN the main Profile.find with $near + $nin
```
That's **10+ MongoDB queries per feed request**. At 200 VUs = **2,000+ queries/sec**.

**3. Swipe Action (Transaction Lock Contention)**
```javascript
// swipe.service.js — doSwipe uses MongoDB transactions
await session.withTransaction(async () => { ... });
```
MongoDB free tier has limited transaction throughput. Concurrent writes will cause `WriteConflict` errors.

**4. EC2 CPU Credits**
t2.micro gets 30 CPU credits initially. Under sustained load, credits deplete in ~15-30 minutes, then CPU throttles to **10% baseline** — making everything 10x slower.

---

## 🖥️ Server Monitoring During Test

### Monitor EC2 CPU and RAM (Run on EC2 via SSH)

```bash
# Real-time CPU + RAM (updates every 2 seconds)
watch -n 2 'echo "=== CPU ===" && top -bn1 | head -5 && echo "" && echo "=== MEMORY ===" && free -h && echo "" && echo "=== NODE PROCESS ===" && ps aux | grep node | grep -v grep'
```

### Monitor Node.js Process Memory (Detailed)

```bash
# Shows Node.js heap usage specifically
watch -n 2 'ps -eo pid,rss,vsz,%mem,%cpu,comm | head -1 && ps -eo pid,rss,vsz,%mem,%cpu,comm | grep node'
```

**What the columns mean:**
| Column | Meaning | Warning Level |
|--------|---------|---------------|
| RSS | Actual RAM used (MB) | > 800MB on 1GB instance = danger |
| %MEM | RAM percentage | > 80% = danger zone |
| %CPU | CPU percentage | > 90% sustained = throttling |

### What to Watch in MongoDB Atlas Dashboard

1. **Go to:** Atlas → Your Cluster → Metrics tab
2. **Key graphs to watch:**

| Graph | Warning Sign |
|-------|-------------|
| **Connections** | Approaching 500 (M0 limit) |
| **Opcounters** | Read/Write spikes correlating with errors |
| **Query Targeting** | Ratio > 100:1 means queries are scanning too many docs |
| **Disk IOPS** | Hitting the ceiling on free tier |
| **Network I/O** | Bytes in/out spiking |

### Correlating Timing Between k6 and Server

1. **Before starting k6**, note the exact time: `date` on your machine
2. k6 output shows timestamps in its live output
3. MongoDB Atlas graphs are in UTC — convert your local time
4. **Look for simultaneous spikes**: When k6 shows p95 jumping, Atlas should show connection/IOPS spike at the same timestamp

---

## 🧹 Cleanup After Testing

### Remove Test Data from MongoDB

```powershell
node scripts/seed-load-test-users.js --cleanup
```

This removes:
- All users with `isTest: true` and `isFake: true`
- All profiles with bio starting with "LOAD_TEST_PROFILE"

### Clean Redis (If Applicable)

```bash
# On EC2
redis-cli FLUSHDB
```

### Clean Swipe/Match Records

If you want to clear swipe records created during testing:
```javascript
// Run in MongoDB shell or a script
db.swipes.deleteMany({ swiperId: { $in: db.users.find({ isTest: true }).map(u => u._id) } })
db.matches.deleteMany({ users: { $in: db.users.find({ isTest: true }).map(u => u._id) } })
```

---

## 📈 Scaling Recommendations

Based on the expected failure analysis, here's what you need:

### For 200 Concurrent Users (MVP Launch)

| Component | Upgrade To | Monthly Cost |
|-----------|-----------|-------------|
| EC2 | t3.small (2 vCPU, 2GB) | ~$15/mo |
| MongoDB | M10 (Dedicated, 2GB RAM) | ~$57/mo |
| Redis | ElastiCache t3.micro | ~$13/mo |
| **Total** | | **~$85/mo** |

### For 2,000 Concurrent Users

| Component | Upgrade To | Monthly Cost |
|-----------|-----------|-------------|
| EC2 | t3.medium (2 vCPU, 4GB) × 2 with ALB | ~$60/mo |
| MongoDB | M20 (4GB RAM, dedicated) | ~$140/mo |
| Redis | ElastiCache t3.small | ~$25/mo |
| **Total** | | **~$225/mo** |

### For 10,000 Concurrent Users

| Component | Upgrade To | Monthly Cost |
|-----------|-----------|-------------|
| EC2 | ECS Fargate (auto-scaling, 4 tasks) | ~$200/mo |
| MongoDB | M30 (8GB RAM) + Read Replicas | ~$400/mo |
| Redis | ElastiCache r6g.large | ~$100/mo |
| CDN | CloudFront for static/photo assets | ~$30/mo |
| **Total** | | **~$730/mo** |

### Code-Level Optimizations (Free!)

These changes would significantly improve performance without any infrastructure cost:

1. **Cache User in Auth Middleware** — Add Redis cache for `User.findById` in auth middleware (saves 1 DB query per request)
2. **Add `.lean()` to Auth Query** — `User.findById(decoded.userId).lean()` — 50% faster reads
3. **Select Only Required Fields** — `User.findById(id).select('_id accountStatus role')` in auth middleware
4. **Feed Query Optimization** — Pre-compute and cache the exclusion list (swipedIds) in Redis with TTL instead of querying 6 collections every time

---

## ❓ Glossary

| Term | Meaning |
|------|---------|
| **VU** | Virtual User — a simulated user making requests |
| **p50** | Median response time — 50% of requests were faster |
| **p95** | 95th percentile — 95% of requests were faster |
| **p99** | 99th percentile — only 1% of requests were slower |
| **Throughput** | Total requests processed per second (RPS) |
| **Error Rate** | % of requests that got error responses |
| **Ramp-up** | Gradually increasing user count over time |
| **Think Time** | Pause between actions (simulates real user behavior) |
| **Connection Pool** | Pre-opened database connections that get reused |
| **OOM** | Out Of Memory — server crashes because RAM is full |
| **IOPS** | Input/Output Operations Per Second — disk speed limit |
| **Burstable CPU** | EC2 CPU that runs fast using credits, then throttles |

---

> **Questions?** Reach out to the Backend Team for help interpreting results.
