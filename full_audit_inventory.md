# COMPLETE ADMIN API PERFORMANCE AUDIT


## Module: admin.auth.routes.js
### API: `POST /login`
1. **Controller/Service Path**: `modules\Admin\auth\admin.auth.controller.js`
### API: `POST /register`
1. **Controller/Service Path**: `modules\Admin\auth\auth.admin.controller.js`
### API: `POST /register`
**Controller:** `modules\Admin\auth\auth.admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /request-otp`
1. **Controller/Service Path**: `modules\Admin\auth\admin.auth.controller.js`
### API: `POST /verify-otp`
1. **Controller/Service Path**: `modules\Admin\auth\admin.auth.controller.js`
### API: `PATCH /forgot-password`
1. **Controller/Service Path**: `modules\Admin\auth\admin.auth.controller.js`
### API: `POST /reset-password`
1. **Controller/Service Path**: `modules\Admin\auth\auth.admin.controller.js`
### API: `POST /reset-password`
**Controller:** `modules\Admin\auth\auth.admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk

## Module: account.routes.js
### API: `GET /`
1. **Controller/Service Path**: `modules\Admin\account\account.controller.js`
### API: `GET /`
**Controller:** `modules\Admin\account\account.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): false
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** Yes, Mongoose hydration overhead
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Bloated
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk

## Module: user.management.route.js
### API: `GET /`
1. **Controller/Service Path**: `modules\Admin\usersManagement\user.management.controller.js`
### API: `GET /`
**Controller:** `modules\Admin\usersManagement\user.management.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Medium)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `GET /ghosting/list`
1. **Controller/Service Path**: `modules\Admin\usersManagement\user.management.controller.js`
### API: `GET /ghosting/list`
**Controller:** `modules\Admin\usersManagement\user.management.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Medium)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `GET /export/stream`
1. **Controller/Service Path**: `modules\Admin\usersManagement\user.management.controller.js`
### API: `GET /export/stream`
**Controller:** `modules\Admin\usersManagement\user.management.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Medium)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `GET /:userId`
1. **Controller/Service Path**: `modules\Admin\usersManagement\user.management.controller.js`
### API: `GET /:userId`
**Controller:** `modules\Admin\usersManagement\user.management.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Medium)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `PATCH /:userId`
1. **Controller/Service Path**: `modules\Admin\usersManagement\user.management.controller.js`
### API: `PATCH /:userId`
**Controller:** `modules\Admin\usersManagement\user.management.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Medium)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `DELETE /:userId/photos/delete`
1. **Controller/Service Path**: `modules\Admin\usersManagement\user.management.controller.js`
### API: `DELETE /:userId/photos/delete`
**Controller:** `modules\Admin\usersManagement\user.management.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Medium)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `PATCH /:userId/status`
1. **Controller/Service Path**: `modules\Admin\usersManagement\user.management.controller.js`
### API: `PATCH /:userId/status`
**Controller:** `modules\Admin\usersManagement\user.management.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Medium)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk

## Module: content.routes.js
### API: `POST /faq`
1. **Controller/Service Path**: `modules\Admin\cms\content.admin.controller.js`
### API: `POST /faq`
**Controller:** `modules\Admin\cms\content.admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `PATCH /faq/:id`
1. **Controller/Service Path**: `modules\Admin\cms\content.admin.controller.js`
### API: `PATCH /faq/:id`
**Controller:** `modules\Admin\cms\content.admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `DELETE /faq/:id`
1. **Controller/Service Path**: `modules\Admin\cms\content.admin.controller.js`
### API: `DELETE /faq/:id`
**Controller:** `modules\Admin\cms\content.admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /privacy-policy`
1. **Controller/Service Path**: `modules\Admin\cms\content.admin.controller.js`
### API: `POST /privacy-policy`
**Controller:** `modules\Admin\cms\content.admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /add-privacy-policy`
1. **Controller/Service Path**: `modules\Admin\cms\content.admin.controller.js`
### API: `POST /add-privacy-policy`
**Controller:** `modules\Admin\cms\content.admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `PATCH /update-privacy-policy`
1. **Controller/Service Path**: `modules\Admin\cms\content.admin.controller.js`
### API: `PATCH /update-privacy-policy`
**Controller:** `modules\Admin\cms\content.admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `DELETE /delete-privacy-policy`
1. **Controller/Service Path**: `modules\Admin\cms\content.admin.controller.js`
### API: `DELETE /delete-privacy-policy`
**Controller:** `modules\Admin\cms\content.admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /terms-conditions`
1. **Controller/Service Path**: `modules\Admin\cms\content.admin.controller.js`
### API: `POST /terms-conditions`
**Controller:** `modules\Admin\cms\content.admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk

## Module: dashboard.stats.routes.js
### API: `GET /stats/kpi`
1. **Controller/Service Path**: `modules\Admin\dashboard\dashboard.stats.controller.js`
### API: `GET /stats/kpi`
**Controller:** `modules\Admin\dashboard\dashboard.stats.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): false
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** Yes, Mongoose hydration overhead
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Bloated
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk

## Module: moderation.routes.js
### API: `GET /pending-verifications`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
### API: `GET /pending-verifications`
**Controller:** `modules\Admin\moderation\moderation.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `GET /blocks`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
### API: `GET /blocks`
**Controller:** `modules\Admin\moderation\moderation.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `POST /users/:userId/verify`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
### API: `POST /users/:userId/verify`
**Controller:** `modules\Admin\moderation\moderation.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `POST /users/:id/ban`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
### API: `POST /users/:id/ban`
**Controller:** `modules\Admin\moderation\moderation.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `POST /users/:id/unban`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
### API: `POST /users/:id/unban`
**Controller:** `modules\Admin\moderation\moderation.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `POST /users/:id/suspend`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
### API: `POST /users/:id/suspend`
**Controller:** `modules\Admin\moderation\moderation.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `POST /users/:id/unsuspend`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
### API: `POST /users/:id/unsuspend`
**Controller:** `modules\Admin\moderation\moderation.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `POST /reports/:reportId/status`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
### API: `POST /reports/:reportId/status`
**Controller:** `modules\Admin\moderation\moderation.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `POST /reports/:reportId/reply`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
### API: `POST /reports/:reportId/reply`
**Controller:** `modules\Admin\moderation\moderation.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck

## Module: giveaways.routes.js
### API: `GET /prizes`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `GET /prizes`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `POST /prizes`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `POST /prizes`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `PATCH /prizes/:id`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `PATCH /prizes/:id`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `DELETE /prizes/:id`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `DELETE /prizes/:id`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `GET /campaigns`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `GET /campaigns`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `POST /campaigns`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `POST /campaigns`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `PATCH /campaigns/:id`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `PATCH /campaigns/:id`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `DELETE /campaigns/:id`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `DELETE /campaigns/:id`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `POST /campaigns/bulk`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `POST /campaigns/bulk`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `PATCH /campaigns/:id/disable`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `PATCH /campaigns/:id/disable`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `PATCH /campaigns/:id/pause`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `PATCH /campaigns/:id/pause`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `GET /campaigns/winner`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `GET /campaigns/winner`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `GET /campaigns/winner`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `GET /campaigns/winner`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `GET /campaigns/winner`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `GET /campaigns/winner`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `POST /campaigns/:id/resend-prize`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `POST /campaigns/:id/resend-prize`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `GET /claims`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `GET /claims`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `GET /deliveries/pending`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `GET /deliveries/pending`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `GET /deliveries/completed`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `GET /deliveries/completed`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `POST /mark-as-deliver`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `POST /mark-as-deliver`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `GET /audit`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `GET /audit`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `GET /campaigns/:campaignId/participants`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
### API: `GET /campaigns/:campaignId/participants`
**Controller:** `modules\Admin\giveaways\giveaways.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck

## Module: profileReview.routes.js
### API: `GET /reported`
1. **Controller/Service Path**: `modules\Admin\profileReview\profileReview.controller.js`
### API: `GET /reported`
**Controller:** `modules\Admin\profileReview\profileReview.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `GET /:userId`
1. **Controller/Service Path**: `modules\Admin\profileReview\profileReview.controller.js`
### API: `GET /:userId`
**Controller:** `modules\Admin\profileReview\profileReview.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck
### API: `PUT /:userId/status`
1. **Controller/Service Path**: `modules\Admin\profileReview\profileReview.controller.js`
### API: `PUT /:userId/status`
**Controller:** `modules\Admin\profileReview\profileReview.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Heavy)
3. **Unnecessary Duplication?** Yes, multiple count branches in $facet
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex search: true
   - populates: true
   - lean(): true
6. **Pagination Placement:** AFTER joins (Inefficient)
7. **Lookup on full collection?** Yes (Critical)
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Bypassed by $facet
12. **Explain plan risks:** COLLSCAN likely on large collections
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** FAIL
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** Yes

**CLASSIFICATION:** Critical Bottleneck

## Module: adminChat.routes.js
### API: `GET /reported`
1. **Controller/Service Path**: `modules\Admin\chat\adminChat.controller.js`
### API: `GET /reported`
**Controller:** `modules\Admin\chat\adminChat.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Medium)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** High DB Load
### API: `GET /:matchId/messages`
1. **Controller/Service Path**: `modules\Admin\chat\adminChat.controller.js`
### API: `GET /:matchId/messages`
**Controller:** `modules\Admin\chat\adminChat.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Medium)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** High DB Load
### API: `POST /:matchId/action`
1. **Controller/Service Path**: `modules\Admin\chat\adminChat.controller.js`
### API: `POST /:matchId/action`
**Controller:** `modules\Admin\chat\adminChat.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Medium)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** High DB Load
### API: `GET /:matchId/history`
1. **Controller/Service Path**: `modules\Admin\chat\adminChat.controller.js`
### API: `GET /:matchId/history`
**Controller:** `modules\Admin\chat\adminChat.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Medium)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** High
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** Likely
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** High DB Load

## Module: adminNotification.routes.js
### API: `GET /email-campaign/:campaignId/logs`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
### API: `GET /email-campaign/:campaignId/logs`
**Controller:** `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /broadcast`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
### API: `POST /broadcast`
**Controller:** `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /broadcastemail`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
### API: `POST /broadcastemail`
**Controller:** `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /premium/send`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
### API: `POST /premium/send`
**Controller:** `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /individual`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
### API: `POST /individual`
**Controller:** `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /premium-expiry/send`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
### API: `POST /premium-expiry/send`
**Controller:** `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /premium-expiry/:campaignId/trigger`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
### API: `POST /premium-expiry/:campaignId/trigger`
**Controller:** `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `GET /notifications/history`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
### API: `GET /notifications/history`
**Controller:** `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `PATCH /update/:userId`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
### API: `PATCH /update/:userId`
**Controller:** `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk

## Module: fakeProfile.routes.js
### API: `POST /bulk-create`
1. **Controller/Service Path**: `modules\Admin\fakeProfiles\fakeProfile.controller.js`
### API: `POST /bulk-create`
**Controller:** `modules\Admin\fakeProfiles\fakeProfile.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): false
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** Yes, Mongoose hydration overhead
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Bloated
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `GET /`
1. **Controller/Service Path**: `modules\Admin\fakeProfiles\fakeProfile.controller.js`
### API: `GET /`
**Controller:** `modules\Admin\fakeProfiles\fakeProfile.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): false
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** Yes, Mongoose hydration overhead
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Bloated
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `PATCH /:id/toggle`
1. **Controller/Service Path**: `modules\Admin\fakeProfiles\fakeProfile.controller.js`
### API: `PATCH /:id/toggle`
**Controller:** `modules\Admin\fakeProfiles\fakeProfile.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): false
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** Yes, Mongoose hydration overhead
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Bloated
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `DELETE /:id`
1. **Controller/Service Path**: `modules\Admin\fakeProfiles\fakeProfile.controller.js`
### API: `DELETE /:id`
**Controller:** `modules\Admin\fakeProfiles\fakeProfile.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): false
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** Yes, Mongoose hydration overhead
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Bloated
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk

## Module: admin.routes.js
### API: `GET /config`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
### API: `GET /config`
**Controller:** `modules\subscription\controllers\admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `PATCH /config`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
### API: `PATCH /config`
**Controller:** `modules\subscription\controllers\admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `PUT /config`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
### API: `PUT /config`
**Controller:** `modules\subscription\controllers\admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `GET /products`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
### API: `GET /products`
**Controller:** `modules\subscription\controllers\admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /products`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
### API: `POST /products`
**Controller:** `modules\subscription\controllers\admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `PATCH /products/:productKey`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
### API: `PATCH /products/:productKey`
**Controller:** `modules\subscription\controllers\admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `PUT /products/:productKey`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
### API: `PUT /products/:productKey`
**Controller:** `modules\subscription\controllers\admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `GET /subscribers`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
### API: `GET /subscribers`
**Controller:** `modules\subscription\controllers\admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `GET /users/:userId`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
### API: `GET /users/:userId`
**Controller:** `modules\subscription\controllers\admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /users/:userId/grant`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
### API: `POST /users/:userId/grant`
**Controller:** `modules\subscription\controllers\admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /users/:userId/grant-consumable`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
### API: `POST /users/:userId/grant-consumable`
**Controller:** `modules\subscription\controllers\admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /users/:userId/extend`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
### API: `POST /users/:userId/extend`
**Controller:** `modules\subscription\controllers\admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /users/:userId/revoke`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
### API: `POST /users/:userId/revoke`
**Controller:** `modules\subscription\controllers\admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `GET /stats`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
### API: `GET /stats`
**Controller:** `modules\subscription\controllers\admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `GET /dashboard`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
### API: `GET /dashboard`
**Controller:** `modules\subscription\controllers\admin.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `GET /features`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.feature.controller.js`
### API: `GET /features`
**Controller:** `modules\subscription\controllers\admin.feature.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): false
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** Yes, Mongoose hydration overhead
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Bloated
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /features`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.feature.controller.js`
### API: `POST /features`
**Controller:** `modules\subscription\controllers\admin.feature.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): false
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** Yes, Mongoose hydration overhead
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Bloated
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `PATCH /features/:key/toggle`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.feature.controller.js`
### API: `PATCH /features/:key/toggle`
**Controller:** `modules\subscription\controllers\admin.feature.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): false
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** Yes, Mongoose hydration overhead
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Bloated
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `DELETE /features/:key`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.feature.controller.js`
### API: `DELETE /features/:key`
**Controller:** `modules\subscription\controllers\admin.feature.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): false
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** Yes, Mongoose hydration overhead
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Bloated
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk

## Module: transaction.routes.js
### API: `GET /`
1. **Controller/Service Path**: `modules\subscription\controllers\transaction.controller.js`
### API: `GET /`
**Controller:** `modules\subscription\controllers\transaction.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `GET /summary`
1. **Controller/Service Path**: `modules\subscription\controllers\transaction.controller.js`
### API: `GET /summary`
**Controller:** `modules\subscription\controllers\transaction.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `GET /export`
1. **Controller/Service Path**: `modules\subscription\controllers\transaction.controller.js`
### API: `GET /export`
**Controller:** `modules\subscription\controllers\transaction.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: true
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** Yes (Node.js memory risk)
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** Yes, via Mongoose population
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** High
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk

## Module: settings.routes.js
### API: `GET /`
1. **Controller/Service Path**: `modules\Admin\settings\settings.controller.js`
### API: `GET /`
**Controller:** `modules\Admin\settings\settings.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `PUT /`
1. **Controller/Service Path**: `modules\Admin\settings\settings.controller.js`
### API: `PUT /`
**Controller:** `modules\Admin\settings\settings.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /test-smtp`
1. **Controller/Service Path**: `modules\Admin\settings\settings.controller.js`
### API: `POST /test-smtp`
**Controller:** `modules\Admin\settings\settings.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `POST /ads`
1. **Controller/Service Path**: `modules\Admin\settings\settings.controller.js`
### API: `POST /ads`
**Controller:** `modules\Admin\settings\settings.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
### API: `GET /ads`
1. **Controller/Service Path**: `modules\Admin\settings\settings.controller.js`
### API: `GET /ads`
**Controller:** `modules\Admin\settings\settings.controller.js`

1. **Direct/Indirect DB Hit?** Direct
2. **Est. DB Queries per Request:** 1 (Light)
3. **Unnecessary Duplication?** No
4. **Sequential Blocking?** Potentially, if chained awaits exist
5. **Features Used:** 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex search: false
   - populates: false
   - lean(): true
6. **Pagination Placement:** BEFORE joins (Standard)
7. **Lookup on full collection?** No
8. **Large datasets loaded into memory?** No
9. **Missing lean/projections?** No
10. **Hidden N+1 patterns?** No
11. **Index usage?** Standard
12. **Explain plan risks:** Standard
13. **Frontend sorting reliance?** Unknown
14. **Scale Safety (1M+)?** PASS
15. **MongoDB CPU Spike Risk?** Low
16. **Node.js Memory Crash Risk?** Low
17. **Connection Pool Saturation Risk?** Low
18. **Payload size?** Optimal
19. **Over-fetching?** No
20. **Business logic inside aggregation?** No

**CLASSIFICATION:** Moderate Risk
