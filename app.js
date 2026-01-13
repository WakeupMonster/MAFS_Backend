// const express = require("express");
// const healthRouter = require("./routes/public/health.routes");

// const app = express();
// app.use(express.json());;

// app.use("/", healthRouter);

// module.exports = app;

const express = require("express");
const app = express();
const cors = require("cors");

// Load cron jobs
// require("./jobs/cron/fwbCron"); // <-- cron auto starts

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: "*", // Ya specific frontend URL
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

// Import routes
const v1Routes = require("./routes/v1");

// Use routes with proper middleware pattern
app.use("/api/v1", v1Routes);

// // Error handling middleware
// app.use((err, req, res) => {
//   console.error(err.stack);
//   res.status(500).json({ error: 'Something went wrong!' });
// });

app.get("/", (req, res) => res.json({ message: "API running" }));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// =====================
// GLOBAL ERROR HANDLER
// =====================
app.use((err, req, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

module.exports = app;
