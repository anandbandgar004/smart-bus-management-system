const mongoose = require('mongoose');
const BusSchema = new mongoose.Schema({
    busId: { type: String, required: true, unique: true, index: true },
    routeId: { type: String, required: true, index: true },
    currentLocation: { lat: { type: Number }, lng: { type: Number }, timestamp: { type: Date } },
    status: { type: String, enum: ['active', 'maintenance', 'out_of_service'], default: 'active' },
    speed: { type: Number, default: 0 },
    delay: { type: Number, default: 0 },
}, { timestamps: true });
module.exports = mongoose.model('Bus', BusSchema);
