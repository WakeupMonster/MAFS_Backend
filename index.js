// require("dotenv").config();
// const app = require("./app");

// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// src/server.js
// require('dotenv').config();
// const app = require('./app');
// const { connectWithRetry, registerGracefulShutdown } = require('./config/database');

// const PORT = process.env.PORT || 3000;
// const MONGODB_URI = process.env.MONGODB_URI;

// (async () => {
//   try {
//     await connectWithRetry(MONGODB_URI);
//     registerGracefulShutdown();

//     app.listen(PORT, () => {
//       console.log(`Server listening on port ${PORT}`);
//     });
//   } catch (err) {
//     console.error('Failed to start app due to DB error:', err);
//     process.exit(1);
//   }
// })();

require("dotenv").config();
const app = require("./app");
const http = require("http").createServer(app);
const { Server } = require("socket.io");

// Mongo connection
const {
  connectWithRetry,
  registerGracefulShutdown,
} = require("./config/database");

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Require redis adapter from package
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
const verifyTokenAndGetUser = require("./modules/auth/verifyTokenAndGetUser");

// GLOBAL assign redis client
let redisClient;

(async () => {
  try {
    // 1) Connect Database
    await connectWithRetry(MONGODB_URI);
    registerGracefulShutdown();

    // 2) Create Socket.IO instance // when backend deploy then update cors origin & url
    const io = new Server(http, {
      cors: { origin: "*" },
    });

    // 3) Create Redis pub/sub clients
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await pubClient.connect();
    await subClient.connect();

    // 4) Assign global redis variable for middleware use
    redisClient = pubClient;

    // 5) Attach redis pub/sub adapter to the io server
    io.adapter(createAdapter(pubClient, subClient));

    // 6) Authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        // const auth = require("../auth/auth.middleware");
        // router.use(auth);

        const user = await verifyTokenAndGetUser(token);
        if (!user) return next(new Error("unauthorized"));

        socket.user = user;

        // store this socketId for direct emit
        await redisClient.sAdd(`sockets:${user._id}`, socket.id);

        next();
      } catch (err) {
        next(err);
      }
    });

    // 7) Load socket handlers
    require("./sockets/socket-server")(io, redisClient);

    // 8) Start server or listen
    http.listen(PORT, () => {
      console.log(`API + Socket Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start app due to DB error:", err);
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
