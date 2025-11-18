// require("dotenv").config();
// const app = require("./app");

// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });


// src/server.js
require('dotenv').config();
const app = require('./app');
// const { connectWithRetry, registerGracefulShutdown } = require('./config/database');

const PORT = process.env.PORT || 3000;
// const MONGODB_URI = process.env.MONGODB_URI;

(async () => {
  try {
    // await connectWithRetry(MONGODB_URI);
    // registerGracefulShutdown();

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start app due to DB error:', err);
    process.exit(1);
  }
})();