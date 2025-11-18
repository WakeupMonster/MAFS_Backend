// const express = require("express");
// const router = express.Router();

// // health check updated

// router.get("/health", (req, res) => {
//   res.status(200).json({
//     status: "ok",
//     timestamp: new Date()
//   });
// });
// module.exports = router;

const express = require('express');
const router = express.Router();
const { isConnected } = require('../../config/database');

router.get('/', (req, res) => {
  const dbOk = isConnected();
  const body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: dbOk ? 'ok' : 'down',
  };
  res.status(dbOk ? 200 : 500).json(body);
});
module.exports = router;