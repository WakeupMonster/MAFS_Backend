const EventEmitter = require('events');

class ChatEventEmitter extends EventEmitter {}

const chatEvents = new ChatEventEmitter();

module.exports = chatEvents;
