const mongoose = require('mongoose');

const BusHistorySchema = new mongoose.Schema({
  busId: { type: String, index: true },
  routeId: { type: String, index: true },
  lat: Number,
  lng: Number,
  speed: Number,
  delay: Number,
  ts: { type: Date, index: true }
}, { timestamps: false });

BusHistorySchema.index({ ts: 1 });

module.exports = mongoose.model('BusHistory', BusHistorySchema);
