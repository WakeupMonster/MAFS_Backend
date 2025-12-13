// const express = require("express");
// const healthRouter = require("./routes/public/health.routes");

// const app = express();
// app.use(express.json());;

// app.use("/", healthRouter);

// module.exports = app;



// const express = require("express");
// const app = express();

// app.use(express.json());

// // Load versioned API routes
// app.use("/api/v1", require("./routes/v1"));

// module.exports = app;

const express = require("express");
const app = express();

// Middleware
app.use(express.json());

// Import routes
const v1Routes = require("./routes/v1");

// Use routes with proper middleware pattern
app.use("/api/v1", v1Routes);

// Error handling middleware
app.use((err, req, res) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;