const SafeRouteService = require('../services/safeRouteService');
const SafetyZone = require('../models/SafetyZone');

class RouteController {
  static async getSafeRoutes(req, res) {
    try {
      const { origin, destination } = req.body;
      if (!origin || !destination) {
        return res.status(400).json({ error: 'Origin and destination coordinates are required.' });
      }

      const result = await SafeRouteService.calculateSafeRoutes(origin, destination);
      return res.json(result);
    } catch (err) {
      console.error('Route calc error:', err);
      return res.status(500).json({ error: 'Failed to calculate safe routes.' });
    }
  }

  static async getSafetyZones(req, res) {
    try {
      const zones = await SafetyZone.findAll();
      return res.json({ zones });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve safety zones.' });
    }
  }

  static async getZoneById(req, res) {
    try {
      const { id } = req.params;
      const zone = await SafetyZone.findById(id);
      if (!zone) return res.status(404).json({ error: 'Safety zone not found.' });
      return res.json({ zone });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve zone details.' });
    }
  }
}

module.exports = RouteController;
