const mongoose = require('mongoose');
const { isMemoryMode, getMemoryStore } = require('../config/db');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  profilePhoto: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  demoMode: { type: Boolean, default: true },
  settings: {
    sosCountdownSeconds: { type: Number, default: 5 },
    autoEscalate: { type: Boolean, default: true },
    escalationTimeoutSeconds: { type: Number, default: 60 },
    shakeSosEnabled: { type: Boolean, default: true },
    shakeSensitivity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    shakeThresholdCount: { type: Number, default: 3 },
    voiceSosEnabled: { type: Boolean, default: true },
    voiceTriggerPhrase: { type: String, default: 'Help me' },
    liveLocationSharing: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now }
});

const MongooseUser = mongoose.models.User || mongoose.model('User', UserSchema);

// Repository wrapper supporting both Mongoose and In-Memory
class UserRepository {
  static async findById(id) {
    if (!isMemoryMode()) {
      return MongooseUser.findById(id);
    }
    return getMemoryStore().users.get(String(id)) || null;
  }

  static async findOne(query) {
    if (!isMemoryMode()) {
      return MongooseUser.findOne(query);
    }
    const users = Array.from(getMemoryStore().users.values());
    return users.find(u => {
      for (const [key, val] of Object.entries(query)) {
        if (u[key] !== val) return false;
      }
      return true;
    }) || null;
  }

  static async create(data) {
    if (!isMemoryMode()) {
      return MongooseUser.create(data);
    }
    const id = 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const user = {
      _id: id,
      id: id,
      ...data,
      demoMode: data.demoMode !== undefined ? data.demoMode : true,
      settings: {
        sosCountdownSeconds: 5,
        autoEscalate: true,
        escalationTimeoutSeconds: 60,
        shakeSosEnabled: true,
        shakeSensitivity: 'medium',
        shakeThresholdCount: 3,
        voiceSosEnabled: true,
        voiceTriggerPhrase: 'Help me',
        liveLocationSharing: true,
        smsNotifications: true,
        pushNotifications: true,
        ...(data.settings || {})
      },
      createdAt: new Date()
    };
    getMemoryStore().users.set(id, user);
    return user;
  }

  static async update(id, updates) {
    if (!isMemoryMode()) {
      return MongooseUser.findByIdAndUpdate(id, updates, { new: true });
    }
    const user = getMemoryStore().users.get(String(id));
    if (!user) return null;
    Object.assign(user, updates);
    if (updates.settings) {
      user.settings = { ...user.settings, ...updates.settings };
    }
    getMemoryStore().users.set(String(id), user);
    return user;
  }

  static async count() {
    if (!isMemoryMode()) {
      return MongooseUser.countDocuments();
    }
    return getMemoryStore().users.size;
  }
}

module.exports = UserRepository;
