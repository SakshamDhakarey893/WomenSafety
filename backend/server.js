const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const { connectDB } = require('./config/db');
const { authenticateToken, requireAdmin } = require('./middleware/auth');
const AuthController = require('./controllers/authController');
const AlertController = require('./controllers/alertController');
const ContactController = require('./controllers/contactController');
const RouteController = require('./controllers/routeController');
const NearbyController = require('./controllers/nearbyController');
const AdminController = require('./controllers/adminController');
const { classifyEmergencyText } = require('./services/mlClient');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow loading static admin dashboard assets
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static Admin and Research Dashboard (prioritizes root workspace admin/, falls back to local backend/admin/)
const rootAdminPath = path.join(__dirname, '..', 'admin');
const localAdminPath = path.join(__dirname, 'admin');
const adminPath = fs.existsSync(rootAdminPath) ? rootAdminPath : localAdminPath;
app.use('/admin', express.static(adminPath));

// Serve public Live Emergency Tracking Portal (zero-install for emergency contacts)
const rootTrackPath = path.join(__dirname, '..', 'public', 'track');
const localTrackPath = path.join(__dirname, 'public', 'track');
const trackPath = fs.existsSync(rootTrackPath) ? rootTrackPath : localTrackPath;
app.use('/track', express.static(trackPath));
app.get('/track/:id', (req, res) => {
  const indexFile = path.join(trackPath, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.redirect('/admin');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'ShaktiSense Backend API Gateway',
    version: '1.0.0',
    timestamp: new Date()
  });
});

// App Version & Update Endpoint (For Free Over-The-Air In-App Updates)
app.get('/api/app/version', (req, res) => {
  res.json({
    latestVersionCode: parseInt(process.env.APP_LATEST_VERSION_CODE || '1', 10),
    latestVersionName: process.env.APP_LATEST_VERSION_NAME || '1.0.0',
    apkUrl: process.env.APP_RELEASE_APK_URL || 'https://github.com/SakshamDhakarey893/WomenSafety/releases/latest/download/ShaktiSense-v1.0.0.apk',
    releaseNotes: process.env.APP_RELEASE_NOTES || '• Initial Release\n• Enhanced Real-time Threat Detection\n• Battery-optimized Emergency Dispatch',
    forceUpdate: process.env.APP_FORCE_UPDATE === 'true',
    timestamp: new Date().toISOString()
  });
});

// 1. Authentication Routes
const authRouter = express.Router();
authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
authRouter.post('/forgot-password', AuthController.forgotPassword);
authRouter.get('/profile', authenticateToken, AuthController.getProfile);
authRouter.get('/admin-check', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
  }
  return res.json({
    ok: true,
    user: {
      id: req.user._id || req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});
authRouter.put('/profile', authenticateToken, AuthController.updateProfile);
authRouter.post('/logout', (req, res) => res.json({ message: 'Logged out successfully.' }));
app.use('/api/auth', authRouter);
app.use('/api/users', authRouter); // Alias for compatibility

// 2. Emergency Alert Routes
const alertRouter = express.Router();

// Public Tracking & Responder Endpoints (No Auth Required for SMS recipients)
alertRouter.get('/:id/track', AlertController.getPublicTrackingData);
alertRouter.post('/:id/respond', AlertController.respondToAlert);
app.get('/api/track/:id', AlertController.getPublicTrackingData);
app.post('/api/track/:id/respond', AlertController.respondToAlert);

// Authenticated dispatch & user operations
alertRouter.post('/', authenticateToken, AlertController.createAlert);
alertRouter.get('/history', authenticateToken, AlertController.getHistory);
alertRouter.get('/:id', authenticateToken, AlertController.getAlertById);
alertRouter.post('/:id/escalate', authenticateToken, AlertController.escalateAlert);
alertRouter.post('/:id/acknowledge', authenticateToken, AlertController.acknowledgeAlert);
alertRouter.post('/:id/resolve', authenticateToken, AlertController.resolveAlert);
alertRouter.post('/:id/cancel', authenticateToken, AlertController.cancelAlert);
alertRouter.post('/:id/duress', authenticateToken, AlertController.duressCancelAlert);
alertRouter.post('/:id/location', authenticateToken, AlertController.updateLocation);
alertRouter.delete('/:id', authenticateToken, AlertController.deleteAlert);
app.use('/api/alerts', alertRouter);

// 3. Trusted Contacts Routes
const contactRouter = express.Router();
contactRouter.get('/', authenticateToken, ContactController.getContacts);
contactRouter.post('/', authenticateToken, ContactController.addContact);
contactRouter.post('/reorder', authenticateToken, ContactController.reorderContacts);
contactRouter.put('/:id', authenticateToken, ContactController.updateContact);
contactRouter.delete('/:id', authenticateToken, ContactController.deleteContact);
app.use('/api/contacts', contactRouter);

// 4. Safe Routes and Safety Zones
app.post('/api/routes/safe', RouteController.getSafeRoutes);
app.get('/api/zones', RouteController.getSafetyZones);
app.get('/api/zones/:id/safety', RouteController.getZoneById);

// 5. Nearby Emergency Services
app.get('/api/nearby/police', NearbyController.getNearbyPolice);
app.get('/api/nearby/hospitals', NearbyController.getNearbyHospitals);

// 6. Direct NLP Emergency Classification Endpoint
app.post('/api/ml/classify', async (req, res) => {
  const { text, motion_magnitude, acoustic_stress, zone_risk, heart_rate_bpm } = req.body;
  const result = await classifyEmergencyText(text, {
    motion_magnitude,
    acoustic_stress,
    zone_risk,
    heart_rate_bpm
  });
  res.json(result);
});

// 7. Admin & Research Endpoints (Protected: Requires Authenticated Admin)
app.get('/api/admin/overview', authenticateToken, requireAdmin, AdminController.getOverview);
app.get('/api/admin/research', authenticateToken, requireAdmin, AdminController.getResearchMetrics);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Pre-seed default Admin Account if not already present
async function seedDefaultAdmin() {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@shaktisense.org').toLowerCase().trim();
    const existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', salt);
      await User.create({
        name: 'System Administrator',
        email: adminEmail,
        phone: '+91 9900000000',
        passwordHash,
        role: 'admin',
        demoMode: true
      });
      console.log(`[Auth] Default admin account seeded: ${adminEmail} / Admin@123`);
    } else if (existing.role !== 'admin') {
      await User.update(existing._id || existing.id, { role: 'admin' });
      console.log(`[Auth] Existing user promoted to admin role: ${adminEmail}`);
    }
  } catch (err) {
    console.warn('[Auth] Admin seeding notice:', err.message);
  }
}

// Initialize DB and start server
async function start() {
  await connectDB();
  await seedDefaultAdmin();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ShaktiSense API] Server running at http://127.0.0.1:${PORT}`);
    console.log(`[Admin Dashboard] Available at http://127.0.0.1:${PORT}/admin`);
  });
}

start();

module.exports = app;
