/* eslint-disable no-unused-vars */
// // // // require("dotenv").config();
// // // // const app = require("./app");

// // // // const PORT = process.env.PORT || 3000;

// // // // app.listen(PORT, () => {
// // // //   console.log(`Server running on port ${PORT}`);
// // // // });

// // // // src/server.js
// // // // require('dotenv').config();
// // // // const app = require('./app');
// // // // const { connectWithRetry, registerGracefulShutdown } = require('./config/database');

// // // // const PORT = process.env.PORT || 3000;
// // // // const MONGODB_URI = process.env.MONGODB_URI;

// // // // (async () => {
// // // //   try {
// // // //     await connectWithRetry(MONGODB_URI);
// // // //     registerGracefulShutdown();

// // // //     app.listen(PORT, () => {
// // // //       console.log(`Server listening on port ${PORT}`);
// // // //     });
// // // //   } catch (err) {
// // // //     console.error('Failed to start app due to DB error:', err);
// // // //     process.exit(1);
// // // //   }
// // // // })();

// // // // <<<<<<< HEAD


// // // // require('dotenv').config();
// // // // const http = require('http');
// // // // const { Server } = require('socket.io');
// // // // const app = require('./app');
// // // // const { connectWithRetry, registerGracefulShutdown } = require('./config/database');
// // // // =======
// // // require("dotenv").config();
// // // const app = require("./app");
// // // const http = require("http").createServer(app);
// // // const { Server } = require("socket.io");

// // // // Mongo connection
// // // const {
// // //   connectWithRetry,
// // //   registerGracefulShutdown,
// // // } = require("./config/database");

// // // const PORT = process.env.PORT || 3000;
// // // const MONGODB_URI = process.env.MONGODB_URI;
// // // // const { createAdapter } = require("@socket.io/redis-adapter");
// // // // const { createClient } = require("redis");
// // // const verifyTokenAndGetUser = require("./modules/auth/verifyTokenAndGetUser");
// // // const redis = require("./config/cache");

// // // // GLOBAL assign redis client
// // // let redisClient;


// // // (async () => {
// // //   try {
// // //     // 1) Connect Database
// // //     await connectWithRetry(MONGODB_URI);
// // //     registerGracefulShutdown();

// // //     // 2) Create Socket.IO instance
// // //     const io = new Server(http, {
// // //       cors: {
// // //         origin: "*", // ⚠️ Replace with frontend domain in production
// // //       },
// // //     });

// // //     require("./jobs/giveaway/giveaway.cron");

    

// // //     // // 3) Create Redis pub/sub clients
// // //     // const pubClient = createClient({ url: process.env.REDIS_URL });
// // //     // const subClient = pubClient.duplicate();

// // //     // await pubClient.connect();
// // //     // await subClient.connect();

// // //     // // 4) Assign global redis variable
// // //     // redisClient = pubClient;

// // //     // // 5) Attach Redis adapter
// // //     // io.adapter(createAdapter(pubClient, subClient));

// // //     // 6) Socket Authentication Middleware
// // //     io.use(async (socket, next) => {
// // //       try {
// // //         let token = null;

// // //         // 1️⃣ socket.io client auth
// // //         if (socket.handshake.auth?.token) {
// // //           token = socket.handshake.auth.token;
// // //         }

// // //         // 2️⃣ query param (Postman)
// // //         if (!token && socket.handshake.query?.token) {
// // //           token = socket.handshake.query.token;
// // //         }

// // //         // 3️⃣ Authorization header
// // //         if (!token && socket.handshake.headers?.authorization) {
// // //           const authHeader = socket.handshake.headers.authorization;
// // //           if (authHeader.startsWith("Bearer ")) {
// // //             token = authHeader.split(" ")[1];
// // //           }
// // //         }

// // //         if (!token) {
// // //           return next(new Error("unauthorized: token missing"));
// // //         }

// // //         const user = await verifyTokenAndGetUser(token);
// // //         if (!user) {
// // //           return next(new Error("unauthorized: invalid token"));
// // //         }

// // //         socket.user = user;

// // //         // Mark user online
// // //         // await redisClient.set(`user:online:${user._id}`, "1");

// // //         // Store socket mapping
// // //         await redisClient.sAdd(`sockets:${user._id}`, socket.id);

// // //         console.log("✅ Socket authenticated:", user._id.toString());
// // //         next();
// // //       } catch (err) {
// // //         console.error("Socket auth error:", err);
// // //         next(new Error("unauthorized"));
// // //       }
// // //     });

// // //     // 7) Load socket handlers
// // //     // require("./sockets/chat.socket")(io, redisClient);
// // //     //  const pubClient = redis.redisClient;
// // //     // const subClient = pubClient.duplicate();
// // //     // await subClient.connect();

// // //     // io.adapter(createAdapter(pubClient, subClient));

// // //      require("./sockets/chat.socket")(io, redis.redisClient);

// // //     // 8) Start server
// // //     http.listen(PORT, () => {
// // //       console.log(`🚀 API + Socket Server running on port ${PORT}`);
// // //       console.log(`🔌 Socket.IO running on ws://localhost:${PORT}`);
// // //     });

// // //   } catch (err) {
// // //     console.error("❌ Failed to start app:", err);
// // //     process.exit(1);
// // //   }
// // // })();




// // // // block wala dekhna hain.



// // require("dotenv").config();

// // const app = require("./app");
// // const http = require("http").createServer(app);
// // const { Server } = require("socket.io");

// // const {
// //   connectWithRetry,
// //   registerGracefulShutdown,
// // } = require("./config/database");

// // const redis = require("./config/cache"); // 🔥 SINGLE REDIS SOURCE
// // const { createAdapter } = require("@socket.io/redis-adapter");

// // const verifyTokenAndGetUser = require("./modules/auth/verifyTokenAndGetUser");

// // const PORT = process.env.PORT || 3001;
// // const MONGODB_URI = process.env.MONGODB_URI;

// // (async () => {
// //   try {
// //     // ================================
// //     // 1️⃣ MongoDB Connect
// //     // ================================
// //     await connectWithRetry(MONGODB_URI);
// //     registerGracefulShutdown();

// //     // ================================
// //     // 2️⃣ Redis Connect (ONCE)
// //     // ================================
// //     await redis.connectRedis();

// //     // ================================
// //     // 3️⃣ HTTP + Socket.IO Setup
// //     // ================================
// //     const io = new Server(http, {
// //       cors: {
// //         origin: "*", // ⚠️ prod me frontend domain
// //       },
// //     });

// //     // ================================
// //     // 4️⃣ Redis Adapter for Socket.IO
// //     // ================================
// //     const pubClient = redis.redisClient;
// //     const subClient = pubClient.duplicate();
// //     await subClient.connect();

// //     io.adapter(createAdapter(pubClient, subClient));

// //     // ================================
// //     // 5️⃣ Socket Auth Middleware
// //     // ================================
// //     io.use(async (socket, next) => {
// //       try {
// //         let token = null;

// //         // 1️⃣ auth payload
// //         if (socket.handshake.auth?.token) {
// //           token = socket.handshake.auth.token;
// //         }

// //         // 2️⃣ query param (Postman)
// //         if (!token && socket.handshake.query?.token) {
// //           token = socket.handshake.query.token;
// //         }

// //         // 3️⃣ Authorization header
// //         if (!token && socket.handshake.headers?.authorization) {
// //           const authHeader = socket.handshake.headers.authorization;
// //           if (authHeader.startsWith("Bearer ")) {
// //             token = authHeader.split(" ")[1];
// //           }
// //         }

// //         if (!token) {
// //           return next(new Error("unauthorized: token missing"));
// //         }

// //         const user = await verifyTokenAndGetUser(token);
// //         if (!user) {
// //           return next(new Error("unauthorized: invalid token"));
// //         }

// //         socket.user = user;

// //         // ================================
// //         // 🔥 Online Presence (Redis)
// //         // ================================
// //         await redis.set(`user:online:${user._id}`, "1");
// //         await redis.redisClient.sAdd(
// //           `sockets:${user._id}`,
// //           socket.id
// //         );

// //         console.log("✅ Socket authenticated:", user._id.toString());
// //         next();
// //       } catch (err) {
// //         console.error("❌ Socket auth error:", err);
// //         next(new Error("unauthorized"));
// //       }
// //     });

// //     // ================================
// //     // 6️⃣ Load Socket Handlers
// //     // ================================
// //     require("./sockets/chat.socket")(io, redis.redisClient);

// //     // ================================
// //     // 7️⃣ Start Cron Jobs
// //     // ================================
// //     require("./jobs/giveaway/giveaway.cron");

// //     // ================================
// //     // 8️⃣ Start Server
// //     // ================================
// //     http.listen(PORT, () => {
// //       console.log(`🚀 API + Socket Server running on port ${PORT}`);
// //       console.log(`🔌 Socket.IO running on ws://localhost:${PORT}`);
// //     });

// //   } catch (err) {
// //     console.error("❌ Failed to start app:", err);
// //     process.exit(1);
// //   }
// // })();




// require("dotenv").config();

// const app = require("./app");
// const http = require("http").createServer(app);

// const {
//   connectWithRetry,
//   registerGracefulShutdown,
// } = require("./config/database");

// const redis = require("./config/cache"); 

// const PORT = process.env.PORT || 3001;
// const MONGODB_URI = process.env.MONGODB_URI;

// const { Server } = require("socket.io");

// const io = new Server(http, {
//   cors: { origin: "*" }
// });

// // Socket Logic
// io.on("connection", (socket) => {
//   console.log("A user connected:", socket.id);

//   socket.on("join_chat", (matchId) => {
//     socket.join(matchId); // User ko match room mein daalo
//   });

//   socket.on("send_message", (data) => {
//     // data mein matchId, text, senderId hoga
//     io.to(data.matchId).emit("receive_message", data);
//   });
// });

// (async () => {
//   try {
//     // ================================
//     // 1️⃣ MongoDB Connect
//     // ================================
//     await connectWithRetry(MONGODB_URI);
//     registerGracefulShutdown();

//     // ================================
//     // 2️⃣ Redis Connect (ONCE)
//     // ================================
//     await redis.connectRedis();

//     // ================================
//     // 3️⃣ Start Cron Jobs (if any)
//     // ================================
//     require("./jobs/giveaway/giveaway.cron");

//     // ================================
//     // 4️⃣ Start HTTP Server
//     // ================================
//     http.listen(PORT, () => {
//       console.log(`🚀 API Server running on port ${PORT}`);
//     });

//   } catch (err) {
//     console.error("❌ Failed to start app:", err);
//     process.exit(1);
//   }
// })();


require("dotenv").config();
const app = require("./app");
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./modules/auth/auth.model"); // Path check kar lena

// Redis Client
const redis = require("./config/cache"); 
const { connectWithRetry, registerGracefulShutdown } = require("./config/database");

// Chat Socket Logic
const chatSocket = require("./sockets/chat.socket");

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

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
    const user = await User.findById(decoded.id).lean();
    
    if (!user) return next(new Error("Authentication error: User not found"));
    
    socket.user = user; // Ab har socket event mein socket.user._id milega
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

(async () => {
  try {
    await connectWithRetry(MONGODB_URI);
    registerGracefulShutdown();
    await redis.connectRedis();

    // Initialize Chat Socket
    chatSocket(io, redis.redisClient);

    require("./jobs/giveaway/giveaway.cron");

    http.listen(PORT, () => {
      console.log(`🚀 API & Socket Server running on port ${PORT}`);
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