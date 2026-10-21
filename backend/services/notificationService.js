const Notification = require('../models/Notification');

class NotificationService {
  /**
   * Dispatch emergency alerts to trusted contacts and police/ambulance if applicable.
   */
  static async notifyContacts(alert, contacts, user, isDemoMode = true) {
    const notificationsSent = [];
    const trackingLink = `https://safe-track.womensafty.app/live/${alert._id || alert.id}`;

    const emergencySmsTemplate = (contact) => 
      `EMERGENCY ALERT from ${user.name || 'Your contact'}!\n` +
      `Category: ${alert.category} (${alert.priority} PRIORITY)\n` +
      `Location: ${alert.address || `${alert.latitude}, ${alert.longitude}`}\n` +
      `Message: "${alert.description || 'Emergency SOS pressed'}"\n` +
      `Live Tracking: ${trackingLink}\n` +
      (isDemoMode ? '[DEMO MODE - No Real Police Dispatched]' : '');

    for (const contact of contacts) {
      const message = emergencySmsTemplate(contact);
      const status = isDemoMode ? 'DEMO_SIMULATED' : 'SENT';

      console.log(`[Notification] ${isDemoMode ? '[SIMULATED SMS]' : '[SMS]'} To: ${contact.name} (${contact.phone}) - Priority: ${contact.priority}`);
      console.log(`[Notification Message] ${message}\n---`);

      // Record in audit log
      const record = await Notification.create({
        userId: user._id || user.id,
        alertId: alert._id || alert.id,
        type: 'SMS',
        recipient: `${contact.name} (${contact.phone})`,
        message,
        status
      });

      notificationsSent.push({
        contactId: contact._id || contact.id,
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship,
        status,
        sentAt: new Date()
      });
    }

    // If Critical and escalated to police
    if (alert.priority === 'CRITICAL' && alert.escalationStatus === 'ESCALATED_TO_POLICE') {
      const policeMsg = `AUTOMATED POLICE DISPATCH ALERT:\n` +
        `Subject: Urgent safety incident for ${user.name} (${user.phone})\n` +
        `Category: ${alert.category}\n` +
        `GPS: Lat ${alert.latitude}, Lng ${alert.longitude}\n` +
        `Live Location: ${trackingLink}`;

      console.log(`[Notification] [POLICE ESCALATION] Station: Nearest Precinct Central\n${policeMsg}`);

      await Notification.create({
        userId: user._id || user.id,
        alertId: alert._id || alert.id,
        type: 'CALL',
        recipient: 'Police Central Dispatch (112)',
        message: policeMsg,
        status: isDemoMode ? 'DEMO_SIMULATED' : 'SENT'
      });
    }

    return notificationsSent;
  }
}

module.exports = NotificationService;
