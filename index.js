const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const app = require("./app");
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./modules/auth/auth.model"); // Path check kar lena

// Redis Client
const redis = require("./config/cache");
const {
  connectWithRetry,
  registerGracefulShutdown,
} = require("./config/database");

// Chat Socket Logic
const chatSocket = require("./sockets/chat.socket");

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

require("./workers/notification.worker");

const io = new Server(http, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Ya specific: ["http://localhost:5173", "http://localhost:3000"]
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["polling", "websocket"], // ⚠️ YE ORDER IMPORTANT HAI
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true, // Old socket.io clients ke liye
});

// Socket.io Setup with Auth Middleware
// const io = new Server(http, {
//   cors: { origin: "*" },
//   pingTimeout: 60000,
// });

// Middleware: Taaki socket mein user._id mil sake

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token)
      return next(new Error("Authentication error: No token provided"));

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
    // eslint-disable-next-line no-unused-vars
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

console.log("REDIS_URL =", process.env.REDIS_URL);
