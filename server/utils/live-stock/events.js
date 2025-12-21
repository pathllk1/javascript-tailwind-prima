const EventEmitter = require('events');

class LiveStockEvents extends EventEmitter {}

// Create a singleton instance
const liveStockEvents = new LiveStockEvents();

liveStockEvents._liveUpdatesPauseState = {
  paused: false,
  reason: null,
  pausedAt: null,
};

liveStockEvents.setLiveUpdatesPaused = function setLiveUpdatesPaused(paused, reason) {
  const next = Boolean(paused);
  const current = this._liveUpdatesPauseState?.paused === true;
  if (next === current) return this._liveUpdatesPauseState;

  this._liveUpdatesPauseState = {
    paused: next,
    reason: next ? (reason ? String(reason) : 'unknown') : null,
    pausedAt: next ? new Date().toISOString() : null,
  };

  this.emit('liveUpdatesPauseChanged', this._liveUpdatesPauseState);
  return this._liveUpdatesPauseState;
};

liveStockEvents.getLiveUpdatesPauseState = function getLiveUpdatesPauseState() {
  return this._liveUpdatesPauseState || { paused: false, reason: null, pausedAt: null };
};

liveStockEvents.isLiveUpdatesPaused = function isLiveUpdatesPaused() {
  return this.getLiveUpdatesPauseState().paused === true;
};

module.exports = liveStockEvents;
