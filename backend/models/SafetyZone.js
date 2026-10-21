const mongoose = require('mongoose');
const { isMemoryMode, getMemoryStore } = require('../config/db');

const SafetyZoneSchema = new mongoose.Schema({
  zoneId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  safetyScore: { type: Number, default: 75.0 }, // 0 to 100
  riskLevel: { type: String, enum: ['LOW', 'MODERATE', 'HIGH'], default: 'LOW' },
  alertCount: { type: Number, default: 0 },
  categoryCounts: { type: Map, of: Number, default: {} },
  lastUpdated: { type: Date, default: Date.now }
});

const MongooseZone = mongoose.models.SafetyZone || mongoose.model('SafetyZone', SafetyZoneSchema);

class SafetyZoneRepository {
  static async findAll() {
    if (!isMemoryMode()) {
      return MongooseZone.find();
    }
    return Array.from(getMemoryStore().zones.values());
  }

  static async findById(id) {
    if (!isMemoryMode()) {
      return MongooseZone.findById(id);
    }
    return getMemoryStore().zones.get(String(id)) || null;
  }

  static async updateScore(zoneId, deltaAlertCount, category) {
    if (!isMemoryMode()) {
      // Find and update
      const zone = await MongooseZone.findOne({ zoneId });
      if (zone) {
        zone.alertCount += deltaAlertCount;
        const currentCount = zone.categoryCounts.get(category) || 0;
        zone.categoryCounts.set(category, currentCount + 1);
        zone.safetyScore = Math.max(10, Math.min(100, zone.safetyScore - 3.5));
        zone.riskLevel = zone.safetyScore < 50 ? 'HIGH' : zone.safetyScore < 75 ? 'MODERATE' : 'LOW';
        zone.lastUpdated = new Date();
        return zone.save();
      }
      return null;
    }
    const zones = Array.from(getMemoryStore().zones.values());
    const zone = zones.find(z => z.zoneId === zoneId || z._id === zoneId);
    if (zone) {
      zone.alertCount = (zone.alertCount || 0) + deltaAlertCount;
      zone.categoryCounts = zone.categoryCounts || {};
      zone.categoryCounts[category] = (zone.categoryCounts[category] || 0) + 1;
      zone.safetyScore = Math.max(10, Math.min(100, (zone.safetyScore || 75) - 3.5));
      zone.riskLevel = zone.safetyScore < 50 ? 'HIGH' : zone.safetyScore < 75 ? 'MODERATE' : 'LOW';
      zone.lastUpdated = new Date();
      getMemoryStore().zones.set(zone._id, zone);
      return zone;
    }
    return null;
  }
}

module.exports = SafetyZoneRepository;
