const { createClient } = require("redis");

const redisClient = createClient({
  url: "redis://127.0.0.1:6379",
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
});

redisClient.on("connect", () => {
  console.log("✅ Redis connected");
});

redisClient.on("ready", () => {
  console.log("🟢 Redis ready");
});

redisClient.on("error", (err) => {
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

async function safeSet(key, value, modeOrOpts, ttl) {
  await connectRedis();

  const val = typeof value === "string" ? value : JSON.stringify(value);

  if (modeOrOpts === "EX" && typeof ttl === "number") {
    return redisClient.set(key, val, { EX: ttl });
  }

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

/* ================================================================
   NEW: Socket module ke liye zaroori safe wrappers
   Pehle ye missing the — socket raw redisClient use karta tha
   bina connection check ke. Redis temporarily down hone pe crash.
================================================================ */

async function safeSAdd(key, member) {
  await connectRedis();
  return redisClient.sAdd(key, member);
}

async function safeSRem(key, member) {
  await connectRedis();
  return redisClient.sRem(key, member);
}

async function safeSCard(key) {
  await connectRedis();
  return redisClient.sCard(key);
}

async function safeExists(key) {
  await connectRedis();
  return redisClient.exists(key);
}

module.exports = {
  redisClient,
  connectRedis,
  get: safeGet,
  set: safeSet,
  del: safeDel,
  ttl: safeTTL,
  mGet: safeMGet,
  sAdd: safeSAdd,
  sRem: safeSRem,
  sCard: safeSCard,
  exists: safeExists,
};
