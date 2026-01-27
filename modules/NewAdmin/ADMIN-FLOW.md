# 📁 ADMIN Folder Module Structure

```
├── Admin/
│   ├── auth/
│   │    ├── auth.controllers.js
│   │    │
│   │    └── routes.js
│   │
│   ├── dashboard/
│   │    ├── dashboard.controllers.js
│   │    │
│   │    └── routes.js
│   │
│   ├── user-management/
│   │    ├── user.management.controllers.js
│   │    │
│   │    └── routes.js
│   │
│   ├── membership-billing-subcription/
│   │    ├── membership.controllers.js
│   │    ├── billing.controllers.js
│   │    ├── subscription.controllers.js
│   │    │
│   │    └── routes.js
│   │
│   ├── business-management/
│   │    ├── business.management.controllers.js
│   │    │
│   │    └── routes.js
│   │
│   ├── office-management/
│   │    ├── office.management.controllers.js
│   │    │
│   │    └── routes.js
│   │
│   ├── reports-moderation/
│   │    ├── reports.moderation.controllers.js
│   │    │
│   │    └── routes.js
│   │
│   └── content-managment/
│          ├── contentManagement.controllers.js
│          │
│          └── routes.js
│
├── admin.routes.js // unified routes
└──-----------------------------------------
```

## 📡 API Interaction Reference

| Endpoint                    | Method | Purpose                                                   |
| --------------------------- | ------ | --------------------------------------------------------- |
| `/admin/auth/login`         | POST   | Authenticate admin through email or password              |
| `/admin/auth/forgot`        | POST   | Trigger find email → create new password → save pwd in DB |
| `/admin/auth/reset-confirm` | POST   | Update password using reset token                         |
