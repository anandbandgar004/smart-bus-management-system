const mongoose = require('mongoose');
const StopSchema = new mongoose.Schema({
    stopId: { type: String }, name: { type: String },
    location: { lat: { type: Number }, lng: { type: Number } }
});
const RouteSchema = new mongoose.Schema({
    routeId: { type: String, required: true, unique: true, index: true },
    routeName: { type: String, required: true },
    stops: [StopSchema],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model('Route', RouteSchema);