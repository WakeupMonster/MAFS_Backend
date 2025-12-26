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

// <<<<<<< HEAD
// // Create HTTP server
// const server = http.createServer(app);

// // Initialize Socket.IO
// const io = new Server(server, {
//   cors: {
//     origin: process.env.CLIENT_URL || '*',
//     methods: ['GET', 'POST']
//   }
// });

// // Socket.IO connection handler
// io.on('connection', (socket) => {
//   console.log('A user connected:', socket.id);

//   // Handle disconnection
//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.id);
//   });

//   // Test event
//   socket.on('ping', (data) => {
//     console.log('Ping received:', data);
//     socket.emit('pong', { message: 'Hello from server!', timestamp: new Date() });
//   });
// });

// // Make io accessible in routes
// app.set('io', io);

// // Start the server
// =======
// Require redis adapter from package
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
const verifyTokenAndGetUser = require("./modules/auth/verifyTokenAndGetUser");

// // GLOBAL assign redis client
// let redisClient;

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




// block wala dekhna hain.
