const express = require("express");
const healthRouter = require("./routes/public/health.routes");

const app = express();
app.use(express.json());

app.use("/", healthRouter);

module.exports = app;