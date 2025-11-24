// const express = require("express");
// const healthRouter = require("./routes/public/health.routes");

// const app = express();
// app.use(express.json());;

// app.use("/", healthRouter);

// module.exports = app;



const express = require("express");
const app = express();

app.use(express.json());

// Load versioned API routes
app.use("/api/v1", require("./routes/v1"));

module.exports = app;