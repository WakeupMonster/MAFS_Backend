const { createClient } = require("redis");
const client = createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379" });
client.on("error", (e) => console.error("Redis error", e));
client.connect().catch(() => {});

module.exports = {
  get: async (k) => {
    const v = await client.get(k);
    return v;
  },
  set: async (k, v, opts = {}) => {
    const val = typeof v === "string" ? v : JSON.stringify(v);
    if (opts.EX) return client.set(k, val, { EX: opts.EX });
    return client.set(k, val);
  },
  del: async (k) => client.del(k),
  client
};
