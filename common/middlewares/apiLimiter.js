// File: common/middlewares/apiLimiter.js
const { rateLimit } = require("./rateLimit");

const apiLimiter = (actionName, limit, windowSeconds) => {
    return async (req, res, next) => {
        try {
            // User ki ID se track karenge (agar login nahi hai toh IP Address se)
            const identifier = req.user ? req.user._id.toString() : (req.ip || "unknown");
            const key = `${actionName}:${identifier}`;

            // Aapke purane redis function ko call kiya
            const isLimited = await rateLimit(key, limit, windowSeconds);

            if (isLimited) {
                return res.status(429).json({
                    success: false,
                    message: "You are doing this too fast. Please wait a moment.",
                });
            }

            next(); // Sab theek hai toh aage badho
        } catch (err) {
            // Agar galti se Redis server down ho jaye toh app crash na ho
            console.error(`Rate Limiter Error (${actionName}):`, err.message);
            next();
        }
    };
};

module.exports = { apiLimiter };
