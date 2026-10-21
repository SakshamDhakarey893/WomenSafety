const mongoose = require('mongoose');
const { isMemoryMode, getMemoryStore } = require('../config/db');

const TrustedContactSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  relationship: { 
    type: String, 
    enum: ['Mother', 'Father', 'Brother/Sister', 'Friend', 'Partner', 'Guardian', 'Other'],
    default: 'Other'
  },
  email: { type: String, default: '' },
  priority: { type: Number, default: 1 }, // 1 = Primary, 2 = Secondary, etc.
  createdAt: { type: Date, default: Date.now }
});

const MongooseContact = mongoose.models.TrustedContact || mongoose.model('TrustedContact', TrustedContactSchema);

class ContactRepository {
  static async findByUserId(userId) {
    if (!isMemoryMode()) {
      return MongooseContact.find({ userId }).sort({ priority: 1 });
    }
    const contacts = Array.from(getMemoryStore().contacts.values())
      .filter(c => String(c.userId) === String(userId))
      .sort((a, b) => (a.priority || 1) - (b.priority || 1));
    return contacts;
  }

  static async findById(id) {
    if (!isMemoryMode()) {
      return MongooseContact.findById(id);
    }
    return getMemoryStore().contacts.get(String(id)) || null;
  }

  static async create(data) {
    if (!isMemoryMode()) {
      return MongooseContact.create(data);
    }
    const id = 'contact_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const contact = {
      _id: id,
      id: id,
      ...data,
      priority: data.priority || 1,
      createdAt: new Date()
    };
    getMemoryStore().contacts.set(id, contact);
    return contact;
  }

  static async update(id, updates) {
    if (!isMemoryMode()) {
      return MongooseContact.findByIdAndUpdate(id, updates, { new: true });
    }
    const contact = getMemoryStore().contacts.get(String(id));
    if (!contact) return null;
    Object.assign(contact, updates);
    getMemoryStore().contacts.set(String(id), contact);
    return contact;
  }

  static async delete(id) {
    if (!isMemoryMode()) {
      return MongooseContact.findByIdAndDelete(id);
    }
    const deleted = getMemoryStore().contacts.get(String(id)) || null;
    getMemoryStore().contacts.delete(String(id));
    return deleted;
  }
}

module.exports = ContactRepository;
