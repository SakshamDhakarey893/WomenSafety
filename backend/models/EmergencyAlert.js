const mongoose = require('mongoose');
const { isMemoryMode, getMemoryStore } = require('../config/db');

const EmergencyAlertSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  userName: { type: String, default: '' },
  userPhone: { type: String, default: '' },
  category: { 
    type: String, 
    enum: [
      'Physical Assault', 
      'Stalking/Following', 
      'Kidnapping/Detainment',
      'Harassment', 
      'Theft/Snatching',
      'Medical Emergency', 
      'Unsafe Environment',
      'False Alarm',
      'Other'
    ],
    default: 'Other'
  },
  description: { type: String, default: '' },
  priority: { 
    type: String, 
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'STANDARD', 'LOW'],
    default: 'HIGH'
  },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy: { type: Number, default: 5 },
  address: { type: String, default: 'Determining location...' },
  timestamp: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'ESCALATED', 'RESOLVED', 'CANCELLED', 'DURESS_ACTIVE'],
    default: 'ACTIVE'
  },
  escalationStatus: {
    type: String,
    enum: ['NONE', 'PENDING', 'ESCALATED_TO_POLICE', 'ESCALATED_TO_AMBULANCE', 'COERCED_CANCELLATION'],
    default: 'NONE'
  },
  liveLocationStatus: {
    type: String,
    enum: ['ACTIVE', 'STOPPED'],
    default: 'ACTIVE'
  },
  liveLocationHistory: [{
    latitude: Number,
    longitude: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  notifiedContacts: [{
    name: String,
    phone: String,
    relationship: String,
    status: { type: String, default: 'SENT' },
    sentAt: { type: Date, default: Date.now }
  }],
  mlPrediction: {
    confidence: Number,
    modelUsed: String,
    rawCategory: String
  },
  demoMode: { type: Boolean, default: true },
  resolvedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const MongooseAlert = mongoose.models.EmergencyAlert || mongoose.model('EmergencyAlert', EmergencyAlertSchema);

class AlertRepository {
  static async create(data) {
    if (!isMemoryMode()) {
      return MongooseAlert.create(data);
    }
    const id = 'alert_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const alert = {
      _id: id,
      id: id,
      liveLocationHistory: [{
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date()
      }],
      notifiedContacts: [],
      timestamp: new Date(),
      status: 'ACTIVE',
      escalationStatus: (data.priority === 'CRITICAL' || data.priority === 'HIGH') ? 'PENDING' : 'NONE',
      liveLocationStatus: 'ACTIVE',
      ...data,
      createdAt: new Date()
    };
    getMemoryStore().alerts.set(id, alert);
    return alert;
  }

  static async findById(id) {
    if (!isMemoryMode()) {
      return MongooseAlert.findById(id);
    }
    return getMemoryStore().alerts.get(String(id)) || null;
  }

  static async findByUserId(userId) {
    if (!isMemoryMode()) {
      return MongooseAlert.find({ userId }).sort({ createdAt: -1 });
    }
    return Array.from(getMemoryStore().alerts.values())
      .filter(a => String(a.userId) === String(userId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async findActive() {
    if (!isMemoryMode()) {
      return MongooseAlert.find({ status: { $in: ['ACTIVE', 'ESCALATED'] } }).sort({ createdAt: -1 });
    }
    return Array.from(getMemoryStore().alerts.values())
      .filter(a => a.status === 'ACTIVE' || a.status === 'ESCALATED')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async findAll() {
    if (!isMemoryMode()) {
      return MongooseAlert.find().sort({ createdAt: -1 });
    }
    return Array.from(getMemoryStore().alerts.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async update(id, updates) {
    if (!isMemoryMode()) {
      return MongooseAlert.findByIdAndUpdate(id, updates, { new: true });
    }
    const alert = getMemoryStore().alerts.get(String(id));
    if (!alert) return null;
    Object.assign(alert, updates);
    getMemoryStore().alerts.set(String(id), alert);
    return alert;
  }

  static async delete(id) {
    if (!isMemoryMode()) {
      return MongooseAlert.findByIdAndDelete(id);
    }
    const deleted = getMemoryStore().alerts.get(String(id)) || null;
    getMemoryStore().alerts.delete(String(id));
    return deleted;
  }

  static async count(query = {}) {
    if (!isMemoryMode()) {
      return MongooseAlert.countDocuments(query);
    }
    const alerts = Array.from(getMemoryStore().alerts.values());
    if (Object.keys(query).length === 0) return alerts.length;
    return alerts.filter(a => {
      for (const [k, v] of Object.entries(query)) {
        if (a[k] !== v) return false;
      }
      return true;
    }).length;
  }
}

module.exports = AlertRepository;
