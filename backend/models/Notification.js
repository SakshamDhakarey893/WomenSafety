const mongoose = require('mongoose');
const { isMemoryMode, getMemoryStore } = require('../config/db');

const NotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  alertId: { type: String, required: true },
  type: { type: String, enum: ['SMS', 'PUSH', 'CALL'], default: 'SMS' },
  recipient: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['QUEUED', 'SENT', 'FAILED', 'DEMO_SIMULATED'], default: 'SENT' },
  timestamp: { type: Date, default: Date.now }
});

const MongooseNotification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

class NotificationRepository {
  static async create(data) {
    if (!isMemoryMode()) {
      return MongooseNotification.create(data);
    }
    const id = 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const notif = {
      _id: id,
      id: id,
      ...data,
      timestamp: new Date()
    };
    getMemoryStore().notifications.set(id, notif);
    return notif;
  }

  static async findByAlertId(alertId) {
    if (!isMemoryMode()) {
      return MongooseNotification.find({ alertId });
    }
    return Array.from(getMemoryStore().notifications.values())
      .filter(n => String(n.alertId) === String(alertId));
  }
}

module.exports = NotificationRepository;
