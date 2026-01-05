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

app.use(express.json());

app.use(cors({
  origin: "*",  // Ya specific frontend URL
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
}));

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

module.exports = app;