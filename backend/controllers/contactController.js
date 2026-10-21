const TrustedContact = require('../models/TrustedContact');

class ContactController {
  static async getContacts(req, res) {
    try {
      const contacts = await TrustedContact.findByUserId(req.user._id || req.user.id);
      return res.json({ contacts });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve contacts.' });
    }
  }

  static async addContact(req, res) {
    try {
      const { name, phone, relationship = 'Other', email = '', priority = 1 } = req.body;
      if (!name || !phone) {
        return res.status(400).json({ error: 'Name and phone number are required.' });
      }

      const contact = await TrustedContact.create({
        userId: req.user._id || req.user.id,
        name: name.trim(),
        phone: phone.trim(),
        relationship,
        email: email.trim(),
        priority: parseInt(priority) || 1
      });

      return res.status(201).json({
        message: 'Trusted contact added successfully.',
        contact
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to add contact.' });
    }
  }

  static async updateContact(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const contact = await TrustedContact.findById(id);
      if (!contact) return res.status(404).json({ error: 'Contact not found.' });

      const updated = await TrustedContact.update(id, updates);
      return res.json({
        message: 'Contact updated successfully.',
        contact: updated
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update contact.' });
    }
  }

  static async deleteContact(req, res) {
    try {
      const { id } = req.params;
      await TrustedContact.delete(id);
      return res.json({ message: 'Contact deleted successfully.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete contact.' });
    }
  }

  static async reorderContacts(req, res) {
    try {
      const { orderedIds } = req.body; // Array of contact IDs in new order
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ error: 'orderedIds must be an array.' });
      }

      for (let i = 0; i < orderedIds.length; i++) {
        await TrustedContact.update(orderedIds[i], { priority: i + 1 });
      }

      const updatedList = await TrustedContact.findByUserId(req.user._id || req.user.id);
      return res.json({
        message: 'Contacts reordered successfully.',
        contacts: updatedList
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to reorder contacts.' });
    }
  }
}

module.exports = ContactController;
