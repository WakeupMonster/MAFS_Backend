// require("dotenv").config();
// const app = require("./app");

// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });


// src/server.js
require('dotenv').config();
const app = require('./app');
const { connectWithRetry, registerGracefulShutdown } = require('./config/database');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

(async () => {
  try {
    await connectWithRetry(MONGODB_URI);
    registerGracefulShutdown();

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start app due to DB error:', err);
    process.exit(1);
  }
})();


// AI check (best AI tool for backend)
// work on profile completed Step 
// otp API for testing 
// relationship goal 
// Id verification (URL)
// third parties required 





// missing:
// visibility
// error handling -- structure rmeove array.
// hasSelfie -- isSelfieVerified




// Kyc

// kyc has enums : [pending,approve,rejected]
// kyc hasa object : selfie {
//   url
//   Status
//   msg 
// }

// // block and deactivate


// in photos user can change the order




// 1) add superlike in get feed API
// 2) social auth -- google, facebook
// 3) Get matches API
// 4) Discovery preference