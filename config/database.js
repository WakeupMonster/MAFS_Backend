/* eslint-disable no-unused-vars */
// src/database/connection.js
const mongoose = require('mongoose');
const logger = console; // replace with your logger (winston) if available

const DEFAULT_URI = process.env.MONGODB_URI;

const options = {
  // recommended options
  // pool & timeouts tuned for production:
  maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE, 10) || 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let connected = false;

async function connectWithRetry(uri = DEFAULT_URI, attempt = 0) {
  const maxAttempts = 5;
  const delay = Math.min(1000 * 2 ** attempt, 30000); // exponential backoff

  try {
    await mongoose.connect(uri, options);
    connected = true;
    logger.info('MongoDB connected');
  } catch (err) {
    connected = false;
    logger.error(`MongoDB connection attempt ${attempt + 1} failed: ${err.message}`);
    if (attempt < maxAttempts - 1) {
      logger.info(`Retrying MongoDB connection in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      return connectWithRetry(uri, attempt + 1);
    }
    throw err;
  }
}

// helper to return connection status for health checks
function isConnected() {
  // mongoose.connection.readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  return mongoose.connection.readyState === 1;
}

function registerGracefulShutdown() {
  const shutdown = (signal) => {
    return async () => {
      try {
        logger.info(`Received ${signal}. Closing MongoDB connection...`);
        await mongoose.disconnect();
        logger.info('MongoDB disconnected. Exiting process.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during MongoDB disconnect', err);
        process.exit(1);
      }
    };
  };

  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));
  process.on('uncaughtException', async (err) => {
    logger.error('Uncaught exception', err);
    await mongoose.disconnect();
    process.exit(1);
  });
}

module.exports = {
  connectWithRetry,
  isConnected,
  registerGracefulShutdown,
  mongoose, // export for direct use if needed
};