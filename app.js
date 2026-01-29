const express = require("express");
const app = express();
const cors = require("cors");
const errorHandling = require("./common/middlewares/error.middleware");

require("./jobs/giveaway/giveaway.cron"); // <-- cron auto starts
require("./jobs/adminNotification/premiumExpiryReminder.cron");
require("./workers/emailnotification.worker");

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// app.use(cors({
//   origin: "*",  // Ya specific frontend URL
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
// }));

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Ya specific frontend URL
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

const v1Routes = require("./routes/v1");

app.use("/api/v1", v1Routes);

app.get("/", (req, res) => res.json({ message: "API running" }));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

app.use(errorHandling);

module.exports = app;
