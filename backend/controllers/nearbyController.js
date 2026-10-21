class NearbyController {
  static getNearbyPolice(req, res) {
    const lat = parseFloat(req.query.lat || 28.6139);
    const lng = parseFloat(req.query.lng || 77.2090);

    const policeStations = [
      {
        id: 'police-1',
        name: 'Central Police Precinct & Women Helpdesk',
        distanceKm: 0.8,
        address: 'Sector 3 Main Boulevard',
        phone: '112',
        directLine: '+1-555-0911',
        lat: lat + 0.005,
        lng: lng + 0.004,
        status: '24/7 Active',
        isWomenSpecialDesk: true
      },
      {
        id: 'police-2',
        name: 'Metro Transit Police Post',
        distanceKm: 1.4,
        address: 'Central Metro Station Concourse Gate 2',
        phone: '112',
        directLine: '+1-555-0912',
        lat: lat - 0.007,
        lng: lng + 0.006,
        status: '24/7 Active',
        isWomenSpecialDesk: true
      },
      {
        id: 'police-3',
        name: 'City North Police Station',
        distanceKm: 2.3,
        address: 'Outer Bypass Highway Crossing',
        phone: '112',
        directLine: '+1-555-0913',
        lat: lat + 0.012,
        lng: lng - 0.008,
        status: '24/7 Active',
        isWomenSpecialDesk: false
      }
    ];

    return res.json({ policeStations });
  }

  static getNearbyHospitals(req, res) {
    const lat = parseFloat(req.query.lat || 28.6139);
    const lng = parseFloat(req.query.lng || 77.2090);

    const hospitals = [
      {
        id: 'hosp-1',
        name: 'City General Emergency Hospital & Trauma Center',
        distanceKm: 1.1,
        address: '14 Healthcare Avenue',
        phone: '108',
        emergencyLine: '+1-555-0108',
        lat: lat + 0.008,
        lng: lng - 0.005,
        status: '24/7 Emergency & ICU',
        hasAmbulance: true
      },
      {
        id: 'hosp-2',
        name: 'St. Jude Community Medical Care',
        distanceKm: 2.1,
        address: 'Sector 8 Park Road',
        phone: '108',
        emergencyLine: '+1-555-0109',
        lat: lat - 0.011,
        lng: lng + 0.009,
        status: '24/7 Emergency',
        hasAmbulance: true
      },
      {
        id: 'pharm-1',
        name: 'Apollo 24/7 Night Pharmacy & First Aid',
        distanceKm: 0.5,
        address: 'Main Market Complex Shop 12',
        phone: '+1-555-0450',
        lat: lat + 0.003,
        lng: lng + 0.002,
        status: 'Open 24 Hours',
        type: 'Pharmacy'
      }
    ];

    return res.json({ hospitals });
  }
}

module.exports = NearbyController;
