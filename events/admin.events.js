const EventEmitter = require('events');

class AdminEventEmitter extends EventEmitter {}

// Create a single shared instance
const adminEvents = new AdminEventEmitter();

module.exports = adminEvents;
