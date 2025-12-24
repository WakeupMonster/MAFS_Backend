const EventEmitter = require("events");

/**
 * Ye central event system hai
 * Giveaway se related saare events yahin se emit honge
 * Aur notification / email / logs yahin se listen karenge
 */
class GiveawayEventEmitter extends EventEmitter {}

module.exports = new GiveawayEventEmitter();