// const express = require("express");
// const app = express();
// const cors = require("cors");
// const errorHandling = require("./common/middlewares/error.middleware")

// require("./jobs/giveaway/giveaway.cron"); // <-- cron auto starts
// require("./jobs/unsuspendUsers.job")
// require("./jobs/adminNotification/premiumExpiryReminder.cron")
// require("./workers/emailnotification.worker")

// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ extended: true }));

// app.use(cors({
//   origin: "*",  // Ya specific frontend URL
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
// }));

// const v1Routes = require("./routes/v1");

// app.use("/api/v1", v1Routes);

// app.get("/", (req, res) => res.json({ message: "API running" }));

// const iapConfig = require("./modules/subscription/config/iap.config");
// app.get("/api/iap/health", (req, res) => {
//   res.json({
//     status: "OK",
//     mockMode: iapConfig.isMockMode(),
//     apple: {
//       configured: iapConfig.apple.isConfigured(),
//       environment: iapConfig.apple.environment,
//     },
//     google: {
//       configured: iapConfig.google.isConfigured(),
//       environment: iapConfig.google.environment,
//     },
//   });
// });

// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: "API endpoint not found"
//   });
// });

// app.use(errorHandling);

// module.exports = app;




const express = require("express");
const app = express();
const cors = require("cors");
const helmet = require("helmet");
const errorHandling = require("./common/middlewares/error.middleware");
const logger = require("./modules/subscription/utils/logger");

// ─── Existing Cron Jobs & Workers ───
require("./jobs/giveaway/giveaway.cron");
require("./jobs/unsuspendUsers.job");
require("./jobs/adminNotification/premiumExpiryReminder.cron");
require("./workers/emailnotification.worker");
require("./jobs/deletion.job")

// ─── IAP Cron Jobs ───
const { initCronJobs } = require("./modules/subscription/cron/subscriptionCron");
initCronJobs();

// ─── Security ───
app.use(helmet());

// ─── Body Parser ───
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── CORS ───
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

// ─── Request Logging (Development Only) ───
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    logger.debug(req.method + " " + req.url);
    next();
  });
}


// ─── Existing V1 Routes ───

const v1Routes = require("./routes/v1");
app.use("/api/v1", v1Routes);

// ─── IAP Routes ───
const webhookRoutes = require("./modules/subscription/routes/webhook.routes");
const subscriptionRoutes = require("./modules/subscription/routes/subscription.routes");
const healthRoutes = require("./modules/subscription/routes/health.routes");

app.use("/webhook", webhookRoutes);
app.use("/api/v1/subscription", subscriptionRoutes);
app.use("/api/v1/iap/health", healthRoutes);

// ─── Root Route ───
app.get("/", (req, res) => res.json({ message: "API running" }));

// ─── 404 Handler ───
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// ─── Error Handler (MUST BE LAST) ───
app.use(errorHandling);

module.exports = app;