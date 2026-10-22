const EmergencyAlert = require('../models/EmergencyAlert');
const TrustedContact = require('../models/TrustedContact');
const SafetyZone = require('../models/SafetyZone');
const { classifyEmergencyText, PRIORITY_MAPPING } = require('../services/mlClient');
const NotificationService = require('../services/notificationService');

class AlertController {
  static async createAlert(req, res) {
    try {
      const user = req.user;
      const {
        latitude = 28.6139,
        longitude = 77.2090,
        accuracy = 5.0,
        address = 'Near Metro Station, Central Avenue',
        description = '',
        manualCategory = null,
        triggerType = 'BUTTON',
        motion_magnitude = 0.0,
        acoustic_stress = 0.0,
        heart_rate_bpm = 75.0
      } = req.body;

      // 1. Determine Category and Priority through NLP or Manual Selection
      let category = manualCategory;
      let mlMeta = { confidence: 1.0, modelUsed: 'Manual Override' };
      let priority = 'HIGH';

      if (description && description.trim().length > 0) {
        const mlResult = await classifyEmergencyText(description, {
          motion_magnitude,
          acoustic_stress,
          heart_rate_bpm,
          zone_risk: 65.0
        });
        category = manualCategory || mlResult.category;
        priority = mlResult.priority || PRIORITY_MAPPING[category] || 'HIGH';
        mlMeta = {
          confidence: mlResult.confidence,
          modelUsed: mlResult.model_used,
          rawCategory: mlResult.category,
          xaiExplanation: mlResult.xai_explanation,
          multimodalAssessment: mlResult.multimodal_assessment
        };
      } else if (category) {
        priority = PRIORITY_MAPPING[category] || 'HIGH';
      } else {
        category = 'Other';
        priority = 'HIGH'; // Safety rule: default unclassified SOS gets HIGH attention
      }

      // 2. Escalation status based on priority
      let escalationStatus = 'NONE';
      if (priority === 'CRITICAL' || priority === 'HIGH') {
        escalationStatus = 'PENDING'; // Auto-escalate timer will fire if unacknowledged
      }

      // 3. Create EmergencyAlert in DB
      const alert = await EmergencyAlert.create({
        userId: user._id || user.id,
        userName: user.name,
        userPhone: user.phone,
        category,
        description: description.trim(),
        priority,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: parseFloat(accuracy),
        address,
        status: 'ACTIVE',
        escalationStatus,
        liveLocationStatus: 'ACTIVE',
        mlPrediction: mlMeta,
        demoMode: user.demoMode !== undefined ? user.demoMode : true
      });

      // 4. Retrieve user's trusted contacts
      const contacts = await TrustedContact.findByUserId(user._id || user.id);

      // 5. Notify Contacts via SMS/Push service
      const notifiedList = await NotificationService.notifyContacts(
        alert,
        contacts,
        user,
        user.demoMode !== undefined ? user.demoMode : true
      );

      // Update alert with notified contacts
      await EmergencyAlert.update(alert._id || alert.id, {
        notifiedContacts: notifiedList
      });

      // 6. Update nearby safety zone alert counter
      await SafetyZone.updateScore('SZ-002', 1, category);

      return res.status(201).json({
        message: 'Emergency SOS activated. Alerts dispatched to trusted contacts.',
        alert: {
          id: alert._id || alert.id,
          category: alert.category,
          priority: alert.priority,
          status: alert.status,
          escalationStatus: alert.escalationStatus,
          latitude: alert.latitude,
          longitude: alert.longitude,
          address: alert.address,
          timestamp: alert.timestamp,
          mlPrediction: alert.mlPrediction,
          notifiedContactsCount: notifiedList.length,
          demoMode: alert.demoMode,
          liveTrackingUrl: `https://safe-track.womensafty.app/live/${alert._id || alert.id}`
        }
      });
    } catch (err) {
      console.error('Create alert error:', err);
      return res.status(500).json({ error: 'Failed to dispatch emergency alert.' });
    }
  }

  static async getAlertById(req, res) {
    try {
      const { id } = req.params;
      const alert = await EmergencyAlert.findById(id);
      if (!alert) {
        return res.status(404).json({ error: 'Emergency alert not found.' });
      }
      return res.json({ alert });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve emergency alert.' });
    }
  }

  static async escalateAlert(req, res) {
    try {
      const { id } = req.params;
      const { target = 'POLICE' } = req.body;
      const alert = await EmergencyAlert.findById(id);
      if (!alert) return res.status(404).json({ error: 'Alert not found.' });

      const newEscalation = target === 'AMBULANCE' ? 'ESCALATED_TO_AMBULANCE' : 'ESCALATED_TO_POLICE';

      const updated = await EmergencyAlert.update(id, {
        escalationStatus: newEscalation,
        status: 'ESCALATED'
      });

      // Notify police dispatch in notification audit
      await NotificationService.notifyContacts(
        updated,
        [],
        req.user,
        req.user.demoMode
      );

      return res.json({
        message: `Alert escalated to ${target}. Emergency response teams notified.`,
        alert: updated
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to escalate alert.' });
    }
  }

  static async cancelAlert(req, res) {
    try {
      const { id } = req.params;
      const { reason = 'Accidental trigger / Safe now' } = req.body;
      const alert = await EmergencyAlert.findById(id);
      if (!alert) return res.status(404).json({ error: 'Alert not found.' });

      const updated = await EmergencyAlert.update(id, {
        status: 'CANCELLED',
        liveLocationStatus: 'STOPPED',
        resolvedAt: new Date()
      });

      return res.json({
        message: 'Emergency alert cancelled. Live location sharing stopped.',
        alert: updated
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to cancel alert.' });
    }
  }

  static async acknowledgeAlert(req, res) {
    try {
      const { id } = req.params;
      const alert = await EmergencyAlert.findById(id);
      if (!alert) return res.status(404).json({ error: 'Alert not found.' });

      const updated = await EmergencyAlert.update(id, {
        status: 'ACKNOWLEDGED',
        escalationStatus: 'ACKNOWLEDGED_BY_DISPATCH'
      });

      return res.json({
        message: 'Alert acknowledged by emergency dispatch center.',
        alert: updated
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to acknowledge alert.' });
    }
  }

  static async resolveAlert(req, res) {
    try {
      const { id } = req.params;
      const { reason = 'Resolved by Emergency Command' } = req.body;
      const alert = await EmergencyAlert.findById(id);
      if (!alert) return res.status(404).json({ error: 'Alert not found.' });

      const updated = await EmergencyAlert.update(id, {
        status: 'RESOLVED',
        escalationStatus: 'RESOLVED',
        liveLocationStatus: 'STOPPED',
        resolvedAt: new Date()
      });

      return res.json({
        message: 'Emergency alert marked as resolved.',
        alert: updated
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to resolve alert.' });
    }
  }

  static async duressCancelAlert(req, res) {
    try {
      const { id } = req.params;
      const { reason = 'Coerced cancellation triggered' } = req.body;
      const alert = await EmergencyAlert.findById(id);
      if (!alert) return res.status(404).json({ error: 'Alert not found.' });

      // Silently set alert status to DURESS_ACTIVE and COERCED_CANCELLATION
      // Live location remains ACTIVE!
      const updated = await EmergencyAlert.update(id, {
        status: 'DURESS_ACTIVE',
        escalationStatus: 'COERCED_CANCELLATION',
        priority: 'CRITICAL',
        liveLocationStatus: 'ACTIVE',
        description: alert.description + ' [⚠️ DURESS SILENT ALERT: Coerced cancellation attempt detected]'
      });

      // Send silent urgent notification to police and guardians
      const contacts = req.user.trustedContacts || [];
      await NotificationService.notifyContacts(
        updated,
        contacts,
        req.user,
        req.user.demoMode
      );

      // Return simulated peaceful response so attacker sees normal cancellation
      return res.json({
        message: 'Emergency alert cancelled. Live location sharing stopped.',
        alert: { ...updated, status: 'CANCELLED' },
        isDuressSilentlyLogged: true
      });
    } catch (err) {
      console.error('Duress cancel error:', err);
      return res.status(500).json({ error: 'Failed to process cancellation.' });
    }
  }

  static async updateLocation(req, res) {
    try {
      const { id } = req.params;
      const { latitude, longitude, accuracy = 5 } = req.body;
      const alert = await EmergencyAlert.findById(id);
      if (!alert) return res.status(404).json({ error: 'Alert not found.' });

      if (alert.liveLocationStatus === 'STOPPED') {
        return res.status(400).json({ error: 'Live location sharing is inactive for this alert.' });
      }

      const history = alert.liveLocationHistory || [];
      history.push({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: new Date()
      });

      const updated = await EmergencyAlert.update(id, {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: parseFloat(accuracy),
        liveLocationHistory: history
      });

      return res.json({
        message: 'Location updated successfully.',
        currentLocation: { latitude, longitude, accuracy }
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update live location.' });
    }
  }

  static async getHistory(req, res) {
    try {
      const alerts = await EmergencyAlert.findByUserId(req.user._id || req.user.id);
      return res.json({ alerts });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch alert history.' });
    }
  }

  static async deleteAlert(req, res) {
    try {
      const { id } = req.params;
      await EmergencyAlert.delete(id);
      return res.json({ message: 'Alert record deleted.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete alert record.' });
    }
  }
}

module.exports = AlertController;
