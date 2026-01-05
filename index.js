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

// <<<<<<< HEAD

// require('dotenv').config();
// const http = require('http');
// const { Server } = require('socket.io');
// const app = require('./app');
// const { connectWithRetry, registerGracefulShutdown } = require('./config/database');
// =======
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

require('./workers/notification.worker');

// Socket.io Setup with Auth Middleware
const io = new Server(http, {
  cors: { origin: "*" },
  pingTimeout: 60000,
});

// Middleware: Taaki socket mein user._id mil sake
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) return next(new Error("Authentication error: No token provided"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;
     if (!userId) {
      return next(new Error("Authentication error: Invalid token payload"));
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    // const user = await User.findById(decoded.id).lean();
    
    if (!user) return next(new Error("Authentication error: User not found"));
    
    socket.user = user; // Ab har socket event mein socket.user._id milega
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

(async () => {
  try {
    // 1) Connect Database
    await connectWithRetry(MONGODB_URI);
    registerGracefulShutdown();

    // 2) Create Socket.IO instance
    const io = new Server(http, {
      cors: {
        origin: "*", // ⚠️ Replace with frontend domain in production
      },
    });

    require("./jobs/giveaway/giveaway.cron");

    // 3) Create Redis pub/sub clients
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await pubClient.connect();
    await subClient.connect();

    // 4) Assign global redis variable for middleware use
    // redisClient = pubClient;

    // 5) Attach Redis adapter
    io.adapter(createAdapter(pubClient, subClient));

    // 6) Socket Authentication Middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        // console.log("token server: ", token);

        if (!token)
          return next(new Error("Authentication error: No token provided"));

        const user = await verifyTokenAndGetUser(token);

        if (!user) return next(new Error("Authentication error: Invalid user"));

        socket.user = user;

        const userKey = `sockets:${user._id}`;

        // store this socketId for direct emit
        // Add to Redis
        await pubClient
          .sAdd(userKey, socket.id)
          .then(() => console.log("Redis socket working."))
          .catch((e) => console.error("Redis socket tracking failed", e));

        next();
      } catch (err) {
        console.error("Socket auth error:", err);
        next(new Error("unauthorized"));
      }
    });

    // 7) Load socket handlers
    require("./sockets/socket-server")(io, pubClient);
    require("./sockets/redis-subscriber")(io, subClient);

    // 8) Start server
    http.listen(PORT, () => {
      console.log(`🚀 API + Socket Server running on port ${PORT}`);
      console.log(`🔌 Socket.IO running on ws://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start app:", err);
    process.exit(1);
  }
})();






// get profile

// kyc -- key -- boolean
// photos 
// profile all data
// attributes




// implement all validations
// show responses in location,photo,kyc and other
// inspect discovery filter and get feed, have to dlt redis key after applying filters for fresh feed
// enhance get user profile response
// add names in blockContact
// messgae pub/sub or working for push notification
// notification apis
// check visibility apis
// check account and safety apis
// social login
//6 cards show info
// register phone hashing
// check dlt redis key from deacitvate/delete account, swipin action, location update,Block report,
// superkeen -- boost -- limit


// today
// add null instead of empty string
// setting ke andar block/blcok use
// subscription model
//  "full_address": ""  -- add field in model 
// remaining likes/superlikes in action API.
// how will I do give rejection when there will no superlikes
// I have to make sure the response must be same in every API
// Get user profile response align with auth response -- make user profile response same as auth response

// events
// top message seen events

// photo dlt api

// discovery filter response in each