const http = require('http');

const BACKEND_BASE = 'http://127.0.0.1:5000';
const ML_BASE = 'http://127.0.0.1:5001';

let authToken = '';
let testAlertId = '';
let testContactId = '';

function request(urlStr, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const postData = data ? JSON.stringify(data) : null;

    const headers = {};
    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('       SHAKTISENSE FULL-STACK INTEGRATION TEST      ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  async function assertTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Health Checks
  await assertTest('Backend API Health Check', async () => {
    const res = await request(`${BACKEND_BASE}/health`);
    if (res.status !== 200 || res.data.status !== 'online') {
      throw new Error(`Unexpected status: ${res.status}`);
    }
  });

  await assertTest('Python ML Service Health Check', async () => {
    const res = await request(`${ML_BASE}/health`);
    if (res.status !== 200 || res.data.status !== 'online') {
      throw new Error(`Unexpected status: ${res.status}`);
    }
  });

  await assertTest('In-App Self-Update Version Check API', async () => {
    const res = await request(`${BACKEND_BASE}/api/app/version`);
    if (res.status !== 200 || typeof res.data.latestVersionCode !== 'number' || !res.data.apkUrl) {
      throw new Error(`Invalid app version response: ${JSON.stringify(res.data)}`);
    }
  });

  // 2. Auth Flow
  const testEmail = `test_safety_${Date.now()}@example.com`;
  await assertTest('User Registration & JWT Generation', async () => {
    const res = await request(`${BACKEND_BASE}/api/auth/register`, 'POST', {
      name: 'Rhea Sen',
      email: testEmail,
      phone: '+91 9988776655',
      password: 'securePassword123'
    });
    if (res.status !== 201 || !res.data.token) {
      throw new Error(`Registration failed: ${JSON.stringify(res.data)}`);
    }
    authToken = res.data.token;
  });

  await assertTest('User Profile Retrieval', async () => {
    const res = await request(`${BACKEND_BASE}/api/users/profile`, 'GET', null, authToken);
    if (res.status !== 200 || res.data.user.email !== testEmail.toLowerCase()) {
      throw new Error('Profile mismatch');
    }
  });

  // 3. Trusted Contacts
  await assertTest('Create & Retrieve Trusted Contact', async () => {
    const res = await request(`${BACKEND_BASE}/api/contacts`, 'POST', {
      name: 'Emergency Guardian',
      phone: '+91 9911223344',
      relationship: 'Guardian',
      priority: 1
    }, authToken);

    if (res.status !== 201 || !res.data.contact) {
      throw new Error('Contact creation failed');
    }
    testContactId = res.data.contact._id || res.data.contact.id;

    const listRes = await request(`${BACKEND_BASE}/api/contacts`, 'GET', null, authToken);
    if (listRes.status !== 200 || listRes.data.contacts.length === 0) {
      throw new Error('Could not retrieve contacts list');
    }
  });

  // 4. NLP Classification
  await assertTest('NLP Service Classification (Assault)', async () => {
    const res = await request(`${BACKEND_BASE}/api/ml/classify`, 'POST', {
      text: 'A man attacked and hit me violently with an iron rod near the bus stop'
    });
    if (res.status !== 200 || res.data.category !== 'Physical Assault' || res.data.priority !== 'CRITICAL') {
      throw new Error(`Unexpected classification: ${JSON.stringify(res.data)}`);
    }
  });

  await assertTest('NLP Service Classification (Stalking)', async () => {
    const res = await request(`${BACKEND_BASE}/api/ml/classify`, 'POST', {
      text: 'A suspicious guy has been following me down this dark alley for 10 minutes'
    });
    if (res.status !== 200 || res.data.category !== 'Stalking/Following' || res.data.priority !== 'CRITICAL') {
      throw new Error(`Unexpected classification: ${JSON.stringify(res.data)}`);
    }
  });

  await assertTest('NLP Service Classification (Medical)', async () => {
    const res = await request(`${BACKEND_BASE}/api/ml/classify`, 'POST', {
      text: 'Severe chest pain, difficulty breathing, feeling unconscious'
    });
    if (res.status !== 200 || res.data.category !== 'Medical Emergency' || res.data.priority !== 'MEDIUM') {
      throw new Error(`Unexpected classification: ${JSON.stringify(res.data)}`);
    }
  });

  await assertTest('NLP Service Classification (Kidnapping & Detainment)', async () => {
    const res = await request(`${BACKEND_BASE}/api/ml/classify`, 'POST', {
      text: 'Cab driver locked doors and changed route into isolated area'
    });
    if (res.status !== 200 || res.data.category !== 'Kidnapping/Detainment' || res.data.priority !== 'CRITICAL') {
      throw new Error(`Unexpected classification: ${JSON.stringify(res.data)}`);
    }
  });

  await assertTest('NLP Service Classification (Theft & Snatching)', async () => {
    const res = await request(`${BACKEND_BASE}/api/ml/classify`, 'POST', {
      text: 'A biker just snatched my handbag and sped off near the metro'
    });
    if (res.status !== 200 || res.data.category !== 'Theft/Snatching' || res.data.priority !== 'HIGH') {
      throw new Error(`Unexpected classification: ${JSON.stringify(res.data)}`);
    }
  });

  await assertTest('NLP Service Classification (False Alarm / Accidental Trigger)', async () => {
    const res = await request(`${BACKEND_BASE}/api/ml/classify`, 'POST', {
      text: 'Sorry pressed the SOS button by mistake while testing app'
    });
    if (res.status !== 200 || res.data.category !== 'False Alarm' || res.data.priority !== 'LOW') {
      throw new Error(`Unexpected classification: ${JSON.stringify(res.data)}`);
    }
  });

  await assertTest('Explainable AI (XAI) Feature Attribution & Token Importance', async () => {
    const res = await request(`${BACKEND_BASE}/api/ml/classify`, 'POST', {
      text: 'A stranger physically attacked me with a weapon near the station'
    });
    if (res.status !== 200 || !res.data.xai_explanation || !res.data.xai_explanation.contributing_tokens) {
      throw new Error('Missing XAI explanation metadata');
    }
    if (res.data.xai_explanation.contributing_tokens.length === 0) {
      throw new Error('XAI returned no contributing tokens');
    }
  });

  await assertTest('Multimodal Threat Fusion (Motion + Acoustic + Location Risk)', async () => {
    const res = await request(`${BACKEND_BASE}/api/ml/classify`, 'POST', {
      text: 'Suspicious individual tracking my steps',
      motion_magnitude: 1.8,
      acoustic_stress: 0.7,
      zone_risk: 80.0
    });
    if (res.status !== 200 || !res.data.multimodal_assessment) {
      throw new Error('Missing multimodal assessment');
    }
    if (res.data.multimodal_assessment.fused_threat_score <= 0) {
      throw new Error('Invalid fused threat score');
    }
  });

  // 5. Emergency SOS Flow
  await assertTest('Dispatch Emergency SOS Alert with NLP & Contact Notifications', async () => {
    const res = await request(`${BACKEND_BASE}/api/alerts`, 'POST', {
      latitude: 28.6139,
      longitude: 77.2090,
      accuracy: 4.2,
      address: 'Central Metro Station Concourse Gate 2',
      description: 'A stranger is following me and tracking my route near the dark underpass'
    }, authToken);

    if (res.status !== 201 || !res.data.alert) {
      throw new Error(`Alert dispatch failed: ${JSON.stringify(res.data)}`);
    }

    testAlertId = res.data.alert.id;
    if (res.data.alert.priority !== 'CRITICAL') {
      throw new Error(`Expected CRITICAL priority, got ${res.data.alert.priority}`);
    }
    if (res.data.alert.status !== 'ACTIVE') {
      throw new Error(`Expected ACTIVE status, got ${res.data.alert.status}`);
    }
  });

  await assertTest('Update Live Location During Emergency', async () => {
    const res = await request(`${BACKEND_BASE}/api/alerts/${testAlertId}/location`, 'POST', {
      latitude: 28.6145,
      longitude: 77.2098,
      accuracy: 3.8
    }, authToken);

    if (res.status !== 200) {
      throw new Error(`Live tracking update failed: ${JSON.stringify(res.data)}`);
    }
  });

  await assertTest('Escalate Emergency Alert to Police (112)', async () => {
    const res = await request(`${BACKEND_BASE}/api/alerts/${testAlertId}/escalate`, 'POST', {
      target: 'POLICE'
    }, authToken);

    if (res.status !== 200 || res.data.alert.escalationStatus !== 'ESCALATED_TO_POLICE') {
      throw new Error(`Escalation failed: ${JSON.stringify(res.data)}`);
    }
  });

  await assertTest('Acknowledge Emergency Alert via Dispatch Action', async () => {
    const res = await request(`${BACKEND_BASE}/api/alerts/${testAlertId}/acknowledge`, 'POST', null, authToken);

    if (res.status !== 200 || res.data.alert.status !== 'ACKNOWLEDGED') {
      throw new Error(`Acknowledge failed: ${JSON.stringify(res.data)}`);
    }
  });

  await assertTest('Escalate Emergency Alert to Ambulance (108)', async () => {
    const res = await request(`${BACKEND_BASE}/api/alerts/${testAlertId}/escalate`, 'POST', {
      target: 'AMBULANCE'
    }, authToken);

    if (res.status !== 200 || res.data.alert.escalationStatus !== 'ESCALATED_TO_AMBULANCE') {
      throw new Error(`Escalation to Ambulance failed: ${JSON.stringify(res.data)}`);
    }
  });

  // 5b. Public Live Web Tracking (Zero-Install Family Locator)
  await assertTest('Public Live Tracking Telemetry (Zero Auth Required)', async () => {
    const res = await request(`${BACKEND_BASE}/api/track/${testAlertId}`);
    if (res.status !== 200 || !res.data.alert || typeof res.data.alert.latitude !== 'number') {
      throw new Error(`Public tracking retrieval failed: ${JSON.stringify(res.data)}`);
    }
    if (res.data.alert.battery === undefined || res.data.alert.speed === undefined) {
      throw new Error(`Missing battery/speed telemetry: ${JSON.stringify(res.data)}`);
    }
  });

  await assertTest('Public Family Responder Broadcast En Route', async () => {
    const res = await request(`${BACKEND_BASE}/api/track/${testAlertId}/respond`, 'POST', {
      responderName: 'Arun Sen (Father)',
      responderPhone: '+91 98765 43210',
      etaMinutes: 10,
      note: 'Driving towards incident location now'
    });

    if (res.status !== 200 || !res.data.success || !res.data.responder) {
      throw new Error(`Responder broadcast failed: ${JSON.stringify(res.data)}`);
    }
  });

  await assertTest('Public Tracking Web Portal Static Viewport (HTML Delivery)', async () => {
    const res = await request(`${BACKEND_BASE}/track/${testAlertId}`);
    if (res.status !== 200 || typeof res.data !== 'string' || !res.data.includes('SHAKTISENSE')) {
      throw new Error(`Tracking HTML failed to render properly (status: ${res.status})`);
    }
  });

  await assertTest('Mark Emergency Alert as Resolved via Dispatch Action', async () => {
    const res = await request(`${BACKEND_BASE}/api/alerts/${testAlertId}/resolve`, 'POST', {
      reason: 'Resolved by emergency dispatch triage team'
    }, authToken);

    if (res.status !== 200 || res.data.alert.status !== 'RESOLVED') {
      throw new Error(`Resolve failed: ${JSON.stringify(res.data)}`);
    }
  });

  await assertTest('Cancel Emergency Alert Safely', async () => {
    const res = await request(`${BACKEND_BASE}/api/alerts/${testAlertId}/cancel`, 'POST', {
      reason: 'User reached safe location with campus security'
    }, authToken);

    if (res.status !== 200 || res.data.alert.status !== 'CANCELLED') {
      throw new Error(`Cancellation failed: ${JSON.stringify(res.data)}`);
    }
  });

  await assertTest('Duress PIN Silent Escalation under Coercion', async () => {
    // 1. Create a new alert
    const alertRes = await request(`${BACKEND_BASE}/api/alerts`, 'POST', {
      latitude: 28.6139,
      longitude: 77.2090,
      accuracy: 4.0,
      address: 'Dark Alleyway Sector 4',
      description: 'Being held against my will'
    }, authToken);

    const duressAlertId = alertRes.data.alert.id;

    // 2. Coerced cancellation via Duress PIN (POST /api/alerts/:id/duress)
    const duressRes = await request(`${BACKEND_BASE}/api/alerts/${duressAlertId}/duress`, 'POST', {
      reason: 'coerced_cancellation_pin_entered'
    }, authToken);

    if (duressRes.status !== 200) {
      throw new Error(`Duress request failed: ${JSON.stringify(duressRes.data)}`);
    }

    // Outer response looks cancelled to appease attacker
    if (duressRes.data.alert.status !== 'CANCELLED') {
      throw new Error(`Outer response must show CANCELLED to deceive assailant, got: ${duressRes.data.alert.status}`);
    }

    // 3. Backend record verification (must be DURESS_ACTIVE with COERCED_CANCELLATION in real DB)
    const alertDetailRes = await request(`${BACKEND_BASE}/api/alerts/${duressAlertId}`, 'GET', null, authToken);
    if (alertDetailRes.status !== 200 || !alertDetailRes.data.alert) {
      throw new Error(`Failed to retrieve duress alert details: ${JSON.stringify(alertDetailRes.data)}`);
    }
    const matchedAlert = alertDetailRes.data.alert;
    if (matchedAlert.status !== 'DURESS_ACTIVE') {
      throw new Error(`Expected real DB status DURESS_ACTIVE, got: ${matchedAlert.status}`);
    }
    if (matchedAlert.escalationStatus !== 'COERCED_CANCELLATION') {
      throw new Error(`Expected escalationStatus COERCED_CANCELLATION, got: ${matchedAlert.escalationStatus}`);
    }
    if (matchedAlert.priority !== 'CRITICAL') {
      throw new Error(`Expected CRITICAL priority under duress, got: ${matchedAlert.priority}`);
    }
  });

  // 6. Safe Routes & Zones
  await assertTest('Safe Route Calculation (Shortest vs Safer Route)', async () => {
    const res = await request(`${BACKEND_BASE}/api/routes/safe`, 'POST', {
      origin: { lat: 28.6139, lng: 77.2090, name: 'Metro Plaza' },
      destination: { lat: 28.5355, lng: 77.3910, name: 'Home' }
    });

    if (res.status !== 200 || !res.data.routes || res.data.routes.length < 2) {
      throw new Error('Safe routes calculation failed');
    }

    const safeRoute = res.data.routes.find(r => r.isRecommended);
    const shortRoute = res.data.routes.find(r => !r.isRecommended);

    if (!safeRoute || !shortRoute) {
      throw new Error('Missing Route A or Route B');
    }
    if (safeRoute.safetyScore <= shortRoute.safetyScore) {
      throw new Error('Safer route score must be higher than shortest route score');
    }
  });

  // 7. Nearby Services
  await assertTest('Retrieve Nearby Police Stations', async () => {
    const res = await request(`${BACKEND_BASE}/api/nearby/police?lat=28.6139&lng=77.2090`);
    if (res.status !== 200 || res.data.policeStations.length === 0) {
      throw new Error('Failed to retrieve nearby police stations');
    }
  });

  await assertTest('Retrieve Nearby Hospitals', async () => {
    const res = await request(`${BACKEND_BASE}/api/nearby/hospitals?lat=28.6139&lng=77.2090`);
    if (res.status !== 200 || res.data.hospitals.length === 0) {
      throw new Error('Failed to retrieve nearby hospitals');
    }
  });

  // 8. Admin Security & Research Metrics
  await assertTest('Admin Overview Security Guard (Reject Unauthenticated 401)', async () => {
    const res = await request(`${BACKEND_BASE}/api/admin/overview`);
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for unprotected request, got: ${res.status}`);
    }
  });

  await assertTest('Admin Overview Security Guard (Reject Non-Admin Role 403)', async () => {
    const res = await request(`${BACKEND_BASE}/api/admin/overview`, 'GET', null, authToken);
    if (res.status !== 403) {
      throw new Error(`Expected 403 Forbidden for non-admin user, got: ${res.status}`);
    }
  });

  let adminToken = '';
  await assertTest('Admin Authentication Gateway Login', async () => {
    const res = await request(`${BACKEND_BASE}/api/auth/login`, 'POST', {
      email: 'admin@shaktisense.org',
      password: 'Admin@123'
    });
    if (res.status !== 200 || !res.data.token || res.data.user.role !== 'admin') {
      throw new Error(`Admin login failed: ${JSON.stringify(res.data)}`);
    }
    adminToken = res.data.token;
  });

  await assertTest('Admin System Overview & Metrics (Authorized Admin 200)', async () => {
    const res = await request(`${BACKEND_BASE}/api/admin/overview`, 'GET', null, adminToken);
    if (res.status !== 200 || !res.data.summary) {
      throw new Error(`Failed to fetch admin overview: ${JSON.stringify(res.data)}`);
    }
  });

  await assertTest('Admin Research ML Benchmark Metrics (Authorized Admin 200)', async () => {
    const res = await request(`${BACKEND_BASE}/api/admin/research`, 'GET', null, adminToken);
    if (res.status !== 200 || !res.data.models || !res.data.models.linear_svm) {
      throw new Error(`Failed to fetch research metrics: ${JSON.stringify(res.data)}`);
    }
  });

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed/total)*100)}%)`);
  console.log('====================================================\n');

  if (passed === total) {
    console.log('🎉 ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('⚠️ SOME TESTS FAILED');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
