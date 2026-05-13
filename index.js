// 🚀 PROCESS SAFETY NET: Catch and log unexpected crashes before they kill the process
process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION! Shutting down...");
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("🔥 UNHANDLED REJECTION! Shutting down...");
  console.error(err);
  process.exit(1);
});

// PERFORMANCE FIX: Boost Libuv thread pool for high-concurrency bcrypt hashing
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || 128;

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const app = require("./app");
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./modules/auth/auth.model");

// Redis Client

const redis = require("./config/cache");
const {
  connectWithRetry,
  registerGracefulShutdown,
} = require("./config/database");

// Chat Socket Logic
const chatSocket = require("./sockets/chat.socket");

const PORT = process.env.PORT || 3001;
// Timezone check to prevent crash on slim Docker images
try {
  Intl.DateTimeFormat(undefined, { timeZone: 'Australia/Sydney' });
} catch (e) {
  console.warn("⚠️ Warning: 'Australia/Sydney' timezone not supported by this environment. Falling back to system time.");
}

require("./workers/notification.worker");
require("./workers/adminPush.worker");

const io = new Server(http, {
  cors: {
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(",").map((s) => s.trim())
      : "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["polling", "websocket"], // YE ORDER IMPORTANT HAI
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

    // v3: Auto-seed Product catalog & SubscriptionConfig on startup
    try {
      const Product = require("./modules/subscription/models_v3/Product");
      const SubscriptionConfig = require("./modules/subscription/models_v3/SubscriptionConfig");

      const productCount = await Product.countDocuments();
      if (productCount === 0) {
        const initialProducts = [
          {
            productKey: "premium_1month",
            type: "SUBSCRIPTION",
            planType: "1_MONTH",
            durationDays: 30,
            displayName: "1 Month Premium",
            displayPrice: "$9.95",
            currency: "AUD",
            appleProductId: "com.keenasmustard.premium.1month",
            googleProductId: "com.keenasmustard.premium.1month",
            sortOrder: 1,
            isActive: true,
          },
          {
            productKey: "premium_3month",
            type: "SUBSCRIPTION",
            planType: "3_MONTH",
            durationDays: 90,
            displayName: "3 Months Premium",
            displayPrice: "$24.00",
            currency: "AUD",
            appleProductId: "com.keenasmustard.premium.3month",
            googleProductId: "com.keenasmustard.premium.3month",
            sortOrder: 2,
            isActive: true,
          },
          {
            productKey: "superkeen_1",
            type: "CONSUMABLE",
            consumableType: "SUPER_KEEN",
            quantity: 1,
            displayName: "1 Super Keen",
            displayPrice: "$1.00",
            currency: "AUD",
            appleProductId: "com.keenasmustard.superkeen.1",
            googleProductId: "com.keenasmustard.superkeen.1",
            sortOrder: 3,
            isActive: true,
          },
          {
            productKey: "superkeen_5",
            type: "CONSUMABLE",
            consumableType: "SUPER_KEEN",
            quantity: 5,
            displayName: "5 Super Keens",
            displayPrice: "$3.50",
            currency: "AUD",
            appleProductId: "com.keenasmustard.superkeen.5",
            googleProductId: "com.keenasmustard.superkeen.5",
            sortOrder: 4,
            isActive: true,
          },
          {
            productKey: "superkeen_10",
            type: "CONSUMABLE",
            consumableType: "SUPER_KEEN",
            quantity: 10,
            displayName: "10 Super Keens",
            displayPrice: "$6.00",
            currency: "AUD",
            appleProductId: "com.keenasmustard.superkeen.10",
            googleProductId: "com.keenasmustard.superkeen.10",
            sortOrder: 5,
            isActive: true,
          },
          {
            productKey: "boost_1",
            type: "CONSUMABLE",
            consumableType: "BOOST",
            quantity: 1,
            displayName: "1 Boost",
            displayPrice: "$3.00",
            currency: "AUD",
            appleProductId: "com.keenasmustard.boost.1",
            googleProductId: "com.keenasmustard.boost.1",
            sortOrder: 6,
            isActive: true,
          },
          {
            productKey: "boost_5",
            type: "CONSUMABLE",
            consumableType: "BOOST",
            quantity: 5,
            displayName: "5 Boosts",
            displayPrice: "$12.50",
            currency: "AUD",
            appleProductId: "com.keenasmustard.boost.5",
            googleProductId: "com.keenasmustard.boost.5",
            sortOrder: 7,
            isActive: true,
          },
          {
            productKey: "boost_10",
            type: "CONSUMABLE",
            consumableType: "BOOST",
            quantity: 10,
            displayName: "10 Boosts",
            displayPrice: "$20.00",
            currency: "AUD",
            appleProductId: "com.keenasmustard.boost.10",
            googleProductId: "com.keenasmustard.boost.10",
            sortOrder: 8,
            isActive: true,
          },
        ];
        await Product.insertMany(initialProducts);
        console.log(
          "✅ [SEED] Product catalog seeded with",
          initialProducts.length,
          "items",
        );
      }

      // Ensure SubscriptionConfig singleton exists
      await SubscriptionConfig.getOrCreate();
      console.log("✅ [SEED] SubscriptionConfig ready");
    } catch (seedErr) {
      console.error("⚠️ [SEED] Auto-seed warning:", seedErr.message);
    }

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
// console.log("REDIS_URL =", process.env.REDIS_URL);