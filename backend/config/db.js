const mongoose = require('mongoose');

let isConnected = false;
let memoryStoreMode = false;

// In-memory fallback store
const memoryStore = {
  users: new Map(),
  contacts: new Map(),
  alerts: new Map(),
  zones: new Map(),
  notifications: new Map()
};

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/womensafty';
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500
    });
    isConnected = true;
    memoryStoreMode = false;
    console.log('[Database] Connected to MongoDB at', uri);
  } catch (err) {
    console.warn('[Database] MongoDB connection timed out or unavailable:', err.message);
    console.log('[Database] Activating Resilient In-Memory Storage Engine for seamless execution.');
    memoryStoreMode = true;
    initDefaultData();
  }
}

function initDefaultData() {
  // Pre-seed some default safety zones
  const defaultZones = [
    {
      _id: 'zone-1',
      zoneId: 'SZ-001',
      name: 'Downtown Commercial Corridor',
      coordinates: { lat: 28.6139, lng: 77.2090 },
      safetyScore: 82.5,
      riskLevel: 'LOW',
      alertCount: 4,
      categoryCounts: { 'Harassment': 3, 'Other': 1 },
      lastUpdated: new Date()
    },
    {
      _id: 'zone-2',
      zoneId: 'SZ-002',
      name: 'Metro Underpass & Railway Border',
      coordinates: { lat: 28.6250, lng: 77.2180 },
      safetyScore: 48.0,
      riskLevel: 'HIGH',
      alertCount: 18,
      categoryCounts: { 'Stalking/Following': 8, 'Physical Assault': 6, 'Harassment': 4 },
      lastUpdated: new Date()
    },
    {
      _id: 'zone-3',
      zoneId: 'SZ-003',
      name: 'University Campus South Gate',
      coordinates: { lat: 28.5800, lng: 77.2300 },
      safetyScore: 74.0,
      riskLevel: 'MODERATE',
      alertCount: 7,
      categoryCounts: { 'Harassment': 5, 'Stalking/Following': 2 },
      lastUpdated: new Date()
    },
    {
      _id: 'zone-4',
      zoneId: 'SZ-004',
      name: 'Tech City Outer Ring Road',
      coordinates: { lat: 28.5000, lng: 77.2800 },
      safetyScore: 89.0,
      riskLevel: 'LOW',
      alertCount: 2,
      categoryCounts: { 'Other': 2 },
      lastUpdated: new Date()
    }
  ];

  defaultZones.forEach(z => memoryStore.zones.set(z._id, z));
}

// Pre-initialize in-memory defaults on load for immediate resilience
initDefaultData();

function isMemoryMode() {
  return memoryStoreMode || !isConnected || mongoose.connection.readyState !== 1;
}

function getMemoryStore() {
  return memoryStore;
}

module.exports = {
  connectDB,
  isMemoryMode,
  getMemoryStore
};
