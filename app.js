const express = require("express");
const app = express();
const cors = require("cors");
const errorHandling = require("./common/middlewares/error.middleware")

require("./jobs/giveaway/giveaway.cron"); // <-- cron auto starts
require("./jobs/unsuspendUsers.job")
require("./jobs/adminNotification/premiumExpiryReminder.cron")
require("./workers/emailnotification.worker")

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: "*",  // Ya specific frontend URL
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
}));

const v1Routes = require("./routes/v1");

app.use("/api/v1", v1Routes);

app.get("/", (req, res) => res.json({ message: "API running" }));

// ─── IAP Routes ───
// app.use("/webhook", require("./modules/subscription/routes/webhook.routes"));
// app.use("/api/subscription", require("./modules/subscription/routes/subscription.routes"));

// ─── Health check ───
const iapConfig = require("./modules/subscription/config/iap.config");
app.get("/api/iap/health", (req, res) => {
  res.json({
    status: "OK",
    mockMode: iapConfig.isMockMode(),
    apple: {
      configured: iapConfig.apple.isConfigured(),
      environment: iapConfig.apple.environment,
    },
    google: {
      configured: iapConfig.google.isConfigured(),
      environment: iapConfig.google.environment,
    },
  });
});

// ─── Start Cron Jobs ───
const { initCronJobs } = require("./modules/subscription/cron/subscriptionCron");
initCronJobs();

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found"
  });
});

app.use(errorHandling);

module.exports = app;