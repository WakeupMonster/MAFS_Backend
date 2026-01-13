const { createClient } = require("redis");

const pub = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});

const sub = pub.duplicate();

(async () => {
  await pub.connect();
  await sub.connect();
  console.log("✅ Redis Pub/Sub connected");
})();

module.exports = { pub, sub };
