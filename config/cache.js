// // const { createClient } = require("redis");
// // const client = createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379" });
// // client.on("error", (e) => console.error("Redis error", e));
// // client.connect().catch(() => {});

// // module.exports = {
// //   get: async (k) => {
// //     const v = await client.get(k);
// //     return v;
// //   },
// //   set: async (k, v, opts = {}) => {
// //     const val = typeof v === "string" ? v : JSON.stringify(v);
// //     if (opts.EX) return client.set(k, val, { EX: opts.EX });
// //     return client.set(k, val);
// //   },
// //   del: async (k) => client.del(k),
// //   client
// // };



// // // const { createClient } = require("redis");

// // // const client = createClient({
// // //   url: process.env.REDIS_URL || "redis://127.0.0.1:6379"
// // // });

// // // client.on("connect", () => {
// // //   console.log("Redis connecting...");
// // // });

// // // client.on("ready", () => {
// // //   console.log("Redis ready");
// // // });

// // // client.on("error", (err) => {
// // //   console.error("Redis error", err);
// // // });

// // // (async () => {
// // //   try {
// // //     await client.connect();
// // //   } catch (e) {
// // //     console.error("Redis connect failed", e);
// // //   }
// // // })();

// // // module.exports = {
// // //   /** GET */
// // //   get: async (key) => {
// // //     return client.get(key);
// // //   },

// // //   /** SET with TTL (SAFE) */
// // //   set: async (key, value, ttlSeconds) => {
// // //     const val =
// // //       typeof value === "string" ? value : JSON.stringify(value);

// // //     if (ttlSeconds) {
// // //       // ✅ Redis v4 reliable method
// // //       return client.setEx(key, ttlSeconds, val);
// // //     }

// // //     return client.set(key, val);
// // //   },

// // //   /** DELETE */
// // //   del: async (key) => {
// // //     return client.del(key);
// // //   },

// // //   client
// // // };


// // // const { createClient } = require("redis");

// // // const client = createClient({
// // //   url: process.env.REDIS_URL || "redis://127.0.0.1:6379"
// // // });

// // // client.on("connect", () => console.log("Redis connecting..."));
// // // client.on("ready", () => console.log("Redis ready"));
// // // client.on("error", (err) => console.error("Redis error", err));

// // // (async () => {
// // //   try {
// // //     await client.connect();
// // //   } catch (e) {
// // //     console.error("Redis connect failed", e);
// // //   }
// // // })();

// // // const redis = {
// // //   async get(key) {
// // //     return client.get(key);
// // //   },

// // //   async set(key, value, ttlSeconds) {
// // //     const val = typeof value === "string" ? value : JSON.stringify(value);
// // //     if (ttlSeconds) {
// // //       return client.setEx(key, ttlSeconds, val);
// // //     }
// // //     return client.set(key, val);
// // //   },

// // //   async del(key) {
// // //     return client.del(key);
// // //   }
// // // };

// // // module.exports = redis;



// const { createClient } = require("redis");

// const redisClient = createClient({
//   url: process.env.REDIS_URL || "redis://127.0.0.1:6379"
// });

// // if (!process.env.REDIS_URL) {
// //   throw new Error("❌ REDIS_URL is missing in environment variables");
// // }

// // const redisClient = createClient({
// //   url: process.env.REDIS_URL
// // });


// redisClient.on("connect", () => {
//   console.log("✅ Redis connected");
// });

// redisClient.on("error", err => {
//   console.error("❌ Redis error", err);
// });

// async function connectRedis() {
//   if (!redisClient.isOpen) {
//     await redisClient.connect();
//   }
// }

// module.exports = {
//   redisClient,
//   connectRedis,

//   get: (key) => redisClient.get(key),
//   set: (key, value, opts = {}) => {
//     const val = typeof value === "string" ? value : JSON.stringify(value);
//     return opts.EX
//       ? redisClient.set(key, val, { EX: opts.EX })
//       : redisClient.set(key, val);
//   },
//   del: (key) => redisClient.del(key)
// };


const { createClient } = require("redis");

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  socket: {
    reconnectStrategy: retries => Math.min(retries * 100, 3000)
  }
});

redisClient.on("connect", () => {
  console.log("✅ Redis connected");
});

redisClient.on("ready", () => {
  console.log("🟢 Redis ready");
});

redisClient.on("error", err => {
  console.error("❌ Redis error", err);
});

async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}
async function safeMGet(keys) {
  if (!keys || keys.length === 0) return [];
  await connectRedis();
  return redisClient.mGet(keys);
}

async function safeGet(key) {
  await connectRedis();
  return redisClient.get(key);
}

/**
 * ✅ Supports BOTH styles:
 * set(key, value, { EX: 300 })
 * set(key, value, 'EX', 300)   <-- legacy safe
 */
async function safeSet(key, value, modeOrOpts, ttl) {
  await connectRedis();

  const val = typeof value === "string" ? value : JSON.stringify(value);

  // OLD STYLE SUPPORT
  if (modeOrOpts === "EX" && typeof ttl === "number") {
    return redisClient.set(key, val, { EX: ttl });
  }

  // NEW STYLE
  if (modeOrOpts && modeOrOpts.EX) {
    return redisClient.set(key, val, { EX: modeOrOpts.EX });
  }

  return redisClient.set(key, val);
}

async function safeDel(key) {
  await connectRedis();
  return redisClient.del(key);
}

async function safeTTL(key) {
  await connectRedis();
  return redisClient.ttl(key);
}

module.exports = {
  redisClient,
  connectRedis,
  get: safeGet,
  set: safeSet,
  del: safeDel,
  ttl: safeTTL,
  mGet: safeMGet
};