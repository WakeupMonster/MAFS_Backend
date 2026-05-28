# Admin API Inventory & Risk Classification

This document categorizes all Admin APIs based on the deep performance audit.

| API Route | Controller | DB Load Risk | Bottlenecks |
|---|---|---|---|
| `POST /register` | `auth.admin.controller.js` | **Moderate Risk** | Standard |
| `POST /reset-password` | `auth.admin.controller.js` | **Moderate Risk** | Standard |
| `GET /` | `account.controller.js` | **Moderate Risk** | Standard |
| `GET /` | `user.management.controller.js` | **Moderate Risk** | Standard |
| `GET /ghosting/list` | `user.management.controller.js` | **Moderate Risk** | Standard |
| `GET /export/stream` | `user.management.controller.js` | **Moderate Risk** | Standard |
| `GET /:userId` | `user.management.controller.js` | **Moderate Risk** | Standard |
| `PATCH /:userId` | `user.management.controller.js` | **Moderate Risk** | Standard |
| `DELETE /:userId/photos/delete` | `user.management.controller.js` | **Moderate Risk** | Standard |
| `PATCH /:userId/status` | `user.management.controller.js` | **Moderate Risk** | Standard |
| `POST /faq` | `content.admin.controller.js` | **Moderate Risk** | Standard |
| `PATCH /faq/:id` | `content.admin.controller.js` | **Moderate Risk** | Standard |
| `DELETE /faq/:id` | `content.admin.controller.js` | **Moderate Risk** | Standard |
| `POST /privacy-policy` | `content.admin.controller.js` | **Moderate Risk** | Standard |
| `POST /add-privacy-policy` | `content.admin.controller.js` | **Moderate Risk** | Standard |
| `PATCH /update-privacy-policy` | `content.admin.controller.js` | **Moderate Risk** | Standard |
| `DELETE /delete-privacy-policy` | `content.admin.controller.js` | **Moderate Risk** | Standard |
| `POST /terms-conditions` | `content.admin.controller.js` | **Moderate Risk** | Standard |
| `GET /stats/kpi` | `dashboard.stats.controller.js` | **Moderate Risk** | Standard |
| `GET /pending-verifications` | `moderation.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `GET /blocks` | `moderation.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `POST /users/:userId/verify` | `moderation.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `POST /users/:id/ban` | `moderation.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `POST /users/:id/unban` | `moderation.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `POST /users/:id/suspend` | `moderation.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `POST /users/:id/unsuspend` | `moderation.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `POST /reports/:reportId/status` | `moderation.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `POST /reports/:reportId/reply` | `moderation.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `GET /prizes` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `POST /prizes` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `PATCH /prizes/:id` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `DELETE /prizes/:id` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `GET /campaigns` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `POST /campaigns` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `PATCH /campaigns/:id` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `DELETE /campaigns/:id` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `POST /campaigns/bulk` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `PATCH /campaigns/:id/disable` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `PATCH /campaigns/:id/pause` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `GET /campaigns/winner` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `GET /campaigns/winner` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `GET /campaigns/winner` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `POST /campaigns/:id/resend-prize` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `GET /claims` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `GET /deliveries/pending` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `GET /deliveries/completed` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `POST /mark-as-deliver` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `GET /audit` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `GET /campaigns/:campaignId/participants` | `giveaways.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `GET /reported` | `profileReview.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `GET /:userId` | `profileReview.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `PUT /:userId/status` | `profileReview.controller.js` | **Critical Bottleneck** | Pagination/KPIs after $lookup using $facet |
| `GET /reported` | `adminChat.controller.js` | **High DB Load** | Mongoose population/sorting overhead |
| `GET /:matchId/messages` | `adminChat.controller.js` | **High DB Load** | Mongoose population/sorting overhead |
| `POST /:matchId/action` | `adminChat.controller.js` | **High DB Load** | Mongoose population/sorting overhead |
| `GET /:matchId/history` | `adminChat.controller.js` | **High DB Load** | Mongoose population/sorting overhead |
| `GET /email-campaign/:campaignId/logs` | `adminNotification.controller.js` | **Moderate Risk** | Standard |
| `POST /broadcast` | `adminNotification.controller.js` | **Moderate Risk** | Standard |
| `POST /broadcastemail` | `adminNotification.controller.js` | **Moderate Risk** | Standard |
| `POST /premium/send` | `adminNotification.controller.js` | **Moderate Risk** | Standard |
| `POST /individual` | `adminNotification.controller.js` | **Moderate Risk** | Standard |
| `POST /premium-expiry/send` | `adminNotification.controller.js` | **Moderate Risk** | Standard |
| `POST /premium-expiry/:campaignId/trigger` | `adminNotification.controller.js` | **Moderate Risk** | Standard |
| `GET /notifications/history` | `adminNotification.controller.js` | **Moderate Risk** | Standard |
| `PATCH /update/:userId` | `adminNotification.controller.js` | **Moderate Risk** | Standard |
| `POST /bulk-create` | `fakeProfile.controller.js` | **Moderate Risk** | Standard |
| `GET /` | `fakeProfile.controller.js` | **Moderate Risk** | Standard |
| `PATCH /:id/toggle` | `fakeProfile.controller.js` | **Moderate Risk** | Standard |
| `DELETE /:id` | `fakeProfile.controller.js` | **Moderate Risk** | Standard |
| `GET /config` | `admin.controller.js` | **Moderate Risk** | Standard |
| `PATCH /config` | `admin.controller.js` | **Moderate Risk** | Standard |
| `PUT /config` | `admin.controller.js` | **Moderate Risk** | Standard |
| `GET /products` | `admin.controller.js` | **Moderate Risk** | Standard |
| `POST /products` | `admin.controller.js` | **Moderate Risk** | Standard |
| `PATCH /products/:productKey` | `admin.controller.js` | **Moderate Risk** | Standard |
| `PUT /products/:productKey` | `admin.controller.js` | **Moderate Risk** | Standard |
| `GET /subscribers` | `admin.controller.js` | **Moderate Risk** | Standard |
| `GET /users/:userId` | `admin.controller.js` | **Moderate Risk** | Standard |
| `POST /users/:userId/grant` | `admin.controller.js` | **Moderate Risk** | Standard |
| `POST /users/:userId/grant-consumable` | `admin.controller.js` | **Moderate Risk** | Standard |
| `POST /users/:userId/extend` | `admin.controller.js` | **Moderate Risk** | Standard |
| `POST /users/:userId/revoke` | `admin.controller.js` | **Moderate Risk** | Standard |
| `GET /stats` | `admin.controller.js` | **Moderate Risk** | Standard |
| `GET /dashboard` | `admin.controller.js` | **Moderate Risk** | Standard |
| `GET /features` | `admin.feature.controller.js` | **Moderate Risk** | Standard |
| `POST /features` | `admin.feature.controller.js` | **Moderate Risk** | Standard |
| `PATCH /features/:key/toggle` | `admin.feature.controller.js` | **Moderate Risk** | Standard |
| `DELETE /features/:key` | `admin.feature.controller.js` | **Moderate Risk** | Standard |
| `GET /` | `transaction.controller.js` | **Moderate Risk** | Standard |
| `GET /summary` | `transaction.controller.js` | **Moderate Risk** | Standard |
| `GET /export` | `transaction.controller.js` | **Moderate Risk** | Standard |
| `GET /` | `settings.controller.js` | **Moderate Risk** | Standard |
| `PUT /` | `settings.controller.js` | **Moderate Risk** | Standard |
| `POST /test-smtp` | `settings.controller.js` | **Moderate Risk** | Standard |
| `POST /ads` | `settings.controller.js` | **Moderate Risk** | Standard |
| `GET /ads` | `settings.controller.js` | **Moderate Risk** | Standard |
