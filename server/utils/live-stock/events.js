const EventEmitter = require('events');

class LiveStockEvents extends EventEmitter {}

// Create a singleton instance
const liveStockEvents = new LiveStockEvents();

module.exports = liveStockEvents;