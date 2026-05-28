# COMPLETE ADMIN API PERFORMANCE AUDIT


## Module: admin.auth.routes.js
### API: `POST /login`
1. **Controller/Service Path**: `modules\Admin\auth\admin.auth.controller.js`
2. **Current Bottlenecks**: Unable to scan.
### API: `POST /register`
1. **Controller/Service Path**: `modules\Admin\auth\auth.admin.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `POST /request-otp`
1. **Controller/Service Path**: `modules\Admin\auth\admin.auth.controller.js`
2. **Current Bottlenecks**: Unable to scan.
### API: `POST /verify-otp`
1. **Controller/Service Path**: `modules\Admin\auth\admin.auth.controller.js`
2. **Current Bottlenecks**: Unable to scan.
### API: `PATCH /forgot-password`
1. **Controller/Service Path**: `modules\Admin\auth\admin.auth.controller.js`
2. **Current Bottlenecks**: Unable to scan.
### API: `POST /reset-password`
1. **Controller/Service Path**: `modules\Admin\auth\auth.admin.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true

## Module: account.routes.js
### API: `GET /`
1. **Controller/Service Path**: `modules\Admin\account\account.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): false

## Module: user.management.route.js
### API: `GET /`
1. **Controller/Service Path**: `modules\Admin\usersManagement\user.management.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: false
   - lean(): true
### API: `GET /ghosting/list`
1. **Controller/Service Path**: `modules\Admin\usersManagement\user.management.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: false
   - lean(): true
### API: `GET /export/stream`
1. **Controller/Service Path**: `modules\Admin\usersManagement\user.management.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: false
   - lean(): true
### API: `GET /:userId`
1. **Controller/Service Path**: `modules\Admin\usersManagement\user.management.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: false
   - lean(): true
### API: `PATCH /:userId`
1. **Controller/Service Path**: `modules\Admin\usersManagement\user.management.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: false
   - lean(): true
### API: `DELETE /:userId/photos/delete`
1. **Controller/Service Path**: `modules\Admin\usersManagement\user.management.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: false
   - lean(): true
### API: `PATCH /:userId/status`
1. **Controller/Service Path**: `modules\Admin\usersManagement\user.management.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: false
   - lean(): true

## Module: content.routes.js
### API: `POST /faq`
1. **Controller/Service Path**: `modules\Admin\cms\content.admin.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `PATCH /faq/:id`
1. **Controller/Service Path**: `modules\Admin\cms\content.admin.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `DELETE /faq/:id`
1. **Controller/Service Path**: `modules\Admin\cms\content.admin.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `POST /privacy-policy`
1. **Controller/Service Path**: `modules\Admin\cms\content.admin.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `POST /add-privacy-policy`
1. **Controller/Service Path**: `modules\Admin\cms\content.admin.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `PATCH /update-privacy-policy`
1. **Controller/Service Path**: `modules\Admin\cms\content.admin.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `DELETE /delete-privacy-policy`
1. **Controller/Service Path**: `modules\Admin\cms\content.admin.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `POST /terms-conditions`
1. **Controller/Service Path**: `modules\Admin\cms\content.admin.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true

## Module: dashboard.stats.routes.js
### API: `GET /stats/kpi`
1. **Controller/Service Path**: `modules\Admin\dashboard\dashboard.stats.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): false

## Module: moderation.routes.js
### API: `GET /pending-verifications`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `GET /blocks`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `POST /users/:userId/verify`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `POST /users/:id/ban`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `POST /users/:id/unban`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `POST /users/:id/suspend`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `POST /users/:id/unsuspend`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `POST /reports/:reportId/status`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `POST /reports/:reportId/reply`
1. **Controller/Service Path**: `modules\Admin\moderation\moderation.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true

## Module: giveaways.routes.js
### API: `GET /prizes`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `POST /prizes`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `PATCH /prizes/:id`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `DELETE /prizes/:id`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `GET /campaigns`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `POST /campaigns`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `PATCH /campaigns/:id`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `DELETE /campaigns/:id`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `POST /campaigns/bulk`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `PATCH /campaigns/:id/disable`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `PATCH /campaigns/:id/pause`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `GET /campaigns/winner`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `GET /campaigns/winner`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `GET /campaigns/winner`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `POST /campaigns/:id/resend-prize`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `GET /claims`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `GET /deliveries/pending`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `GET /deliveries/completed`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `POST /mark-as-deliver`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `GET /audit`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `GET /campaigns/:campaignId/participants`
1. **Controller/Service Path**: `modules\Admin\giveaways\giveaways.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true

## Module: profileReview.routes.js
### API: `GET /reported`
1. **Controller/Service Path**: `modules\Admin\profileReview\profileReview.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `GET /:userId`
1. **Controller/Service Path**: `modules\Admin\profileReview\profileReview.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true
### API: `PUT /:userId/status`
1. **Controller/Service Path**: `modules\Admin\profileReview\profileReview.controller.js`
2. **Current Bottlenecks**: Pagination/KPIs after $lookup using $facet
3. **DB Load Risk**: **Critical Bottleneck**
4. **Features Used**: 
   - $facet: true
   - $lookup: true
   - $expr: false
   - regex: true
   - populate: true
   - lean(): true

## Module: adminChat.routes.js
### API: `GET /reported`
1. **Controller/Service Path**: `modules\Admin\chat\adminChat.controller.js`
2. **Current Bottlenecks**: In-memory Node.js sorting or full collection loads
3. **DB Load Risk**: **High DB Load**
4. **Features Used**: 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `GET /:matchId/messages`
1. **Controller/Service Path**: `modules\Admin\chat\adminChat.controller.js`
2. **Current Bottlenecks**: In-memory Node.js sorting or full collection loads
3. **DB Load Risk**: **High DB Load**
4. **Features Used**: 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `POST /:matchId/action`
1. **Controller/Service Path**: `modules\Admin\chat\adminChat.controller.js`
2. **Current Bottlenecks**: In-memory Node.js sorting or full collection loads
3. **DB Load Risk**: **High DB Load**
4. **Features Used**: 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `GET /:matchId/history`
1. **Controller/Service Path**: `modules\Admin\chat\adminChat.controller.js`
2. **Current Bottlenecks**: In-memory Node.js sorting or full collection loads
3. **DB Load Risk**: **High DB Load**
4. **Features Used**: 
   - $facet: false
   - $lookup: true
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true

## Module: adminNotification.routes.js
### API: `GET /email-campaign/:campaignId/logs`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `POST /broadcast`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `POST /broadcastemail`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `POST /premium/send`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `POST /individual`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `POST /premium-expiry/send`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `POST /premium-expiry/:campaignId/trigger`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `GET /notifications/history`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `PATCH /update/:userId`
1. **Controller/Service Path**: `modules\Admin\adminNotificationCampaigns\adminNotification.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true

## Module: fakeProfile.routes.js
### API: `POST /bulk-create`
1. **Controller/Service Path**: `modules\Admin\fakeProfiles\fakeProfile.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): false
### API: `GET /`
1. **Controller/Service Path**: `modules\Admin\fakeProfiles\fakeProfile.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): false
### API: `PATCH /:id/toggle`
1. **Controller/Service Path**: `modules\Admin\fakeProfiles\fakeProfile.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): false
### API: `DELETE /:id`
1. **Controller/Service Path**: `modules\Admin\fakeProfiles\fakeProfile.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): false

## Module: admin.routes.js
### API: `GET /config`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `PATCH /config`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `PUT /config`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `GET /products`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `POST /products`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `PATCH /products/:productKey`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `PUT /products/:productKey`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `GET /subscribers`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `GET /users/:userId`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `POST /users/:userId/grant`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `POST /users/:userId/grant-consumable`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `POST /users/:userId/extend`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `POST /users/:userId/revoke`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `GET /stats`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `GET /dashboard`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `GET /features`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.feature.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): false
### API: `POST /features`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.feature.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): false
### API: `PATCH /features/:key/toggle`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.feature.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): false
### API: `DELETE /features/:key`
1. **Controller/Service Path**: `modules\subscription\controllers\admin.feature.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): false

## Module: transaction.routes.js
### API: `GET /`
1. **Controller/Service Path**: `modules\subscription\controllers\transaction.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `GET /summary`
1. **Controller/Service Path**: `modules\subscription\controllers\transaction.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true
### API: `GET /export`
1. **Controller/Service Path**: `modules\subscription\controllers\transaction.controller.js`
2. **Current Bottlenecks**: Mongoose population chain
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: true
   - lean(): true

## Module: settings.routes.js
### API: `GET /`
1. **Controller/Service Path**: `modules\Admin\settings\settings.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `PUT /`
1. **Controller/Service Path**: `modules\Admin\settings\settings.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `POST /test-smtp`
1. **Controller/Service Path**: `modules\Admin\settings\settings.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `POST /ads`
1. **Controller/Service Path**: `modules\Admin\settings\settings.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
### API: `GET /ads`
1. **Controller/Service Path**: `modules\Admin\settings\settings.controller.js`
2. **Current Bottlenecks**: Standard Query
3. **DB Load Risk**: **Moderate Risk**
4. **Features Used**: 
   - $facet: false
   - $lookup: false
   - $expr: false
   - regex: false
   - populate: false
   - lean(): true
