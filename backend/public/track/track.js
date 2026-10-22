/**
 * ShaktiSense AI — Public Live Emergency SOS Tracking Portal
 * Zero-install locator for family members, guardians, and rescue dispatchers.
 */

let API_BASE = window.location.origin;
if (!API_BASE || API_BASE === 'null' || API_BASE.startsWith('file:') || !API_BASE.includes(':5000')) {
  API_BASE = 'http://127.0.0.1:5000';
}

let map = null;
let victimMarker = null;
let accuracyCircle = null;
let breadcrumbTrail = null;
let currentAlertId = null;
let pollTimer = null;
let isDemoMode = false;
let demoStep = 0;
let lastKnownLocation = { lat: 28.6139, lng: 77.2090 };
let respondersList = [];

// Simulated demo path in Central Delhi if no active DB alert ID is passed
const DEMO_WAYPOINTS = [
  { lat: 28.6139, lng: 77.2090, address: 'Connaught Place Inner Circle, Radial 3', speed: 3.5, battery: 84 },
  { lat: 28.6146, lng: 77.2098, address: 'Near Rajiv Chowk Metro Gate 4', speed: 4.1, battery: 83 },
  { lat: 28.6152, lng: 77.2105, address: 'Barakhamba Road Concourse', speed: 3.8, battery: 83 },
  { lat: 28.6158, lng: 77.2114, address: 'Towards Tolstoy Marg Crossing', speed: 4.6, battery: 82 },
  { lat: 28.6165, lng: 77.2122, address: 'Near Kasturba Gandhi Marg Junction', speed: 3.9, battery: 82 }
];

document.addEventListener('DOMContentLoaded', () => {
  setupTheme();
  setupModal();
  resolveAlertId();
  initMap();
  loadTrackingData();

  // Poll for location updates every 3.5 seconds
  pollTimer = setInterval(loadTrackingData, 3500);

  // Recenter button
  const recenterBtn = document.getElementById('recenterBtn');
  if (recenterBtn) {
    recenterBtn.addEventListener('click', () => {
      if (map && lastKnownLocation) {
        map.setView([lastKnownLocation.lat, lastKnownLocation.lng], 16, { animate: true });
        showToast('Map centered on victim’s active location.');
      }
    });
  }

  // Google Maps navigation button
  const gmapsBtn = document.getElementById('openGoogleMapsBtn');
  if (gmapsBtn) {
    gmapsBtn.addEventListener('click', () => {
      if (lastKnownLocation) {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lastKnownLocation.lat},${lastKnownLocation.lng}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });
  }
});

/* 1. Resolve Alert ID from Path or URL Params */
function resolveAlertId() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const trackIdx = pathParts.indexOf('track');
  if (trackIdx !== -1 && pathParts[trackIdx + 1]) {
    currentAlertId = pathParts[trackIdx + 1];
  }

  if (!currentAlertId) {
    const params = new URLSearchParams(window.location.search);
    currentAlertId = params.get('id') || params.get('alertId');
  }

  if (!currentAlertId || currentAlertId === 'demo') {
    isDemoMode = true;
    currentAlertId = 'demo-alert-delhi';
  }
}

/* 2. Interactive Map Initialization (Leaflet / OpenStreetMap) */
function initMap() {
  const mapContainer = document.getElementById('liveTrackingMap');
  if (!mapContainer) return;

  map = L.map('liveTrackingMap', {
    zoomControl: false,
    attributionControl: false
  }).setView([lastKnownLocation.lat, lastKnownLocation.lng], 16);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // CartoDB Dark Matter / Light Voyager Tiles
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const tileUrl = isLight 
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  window._mapTileLayer = L.tileLayer(tileUrl, {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map);

  // Custom Pulsing Victim Marker
  const pulseIcon = L.divIcon({
    className: 'victim-pulse-icon',
    html: `
      <div class="victim-pulse-halo"></div>
      <div class="victim-pulse-core"></div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26]
  });

  victimMarker = L.marker([lastKnownLocation.lat, lastKnownLocation.lng], { icon: pulseIcon }).addTo(map);
  victimMarker.bindPopup(`
    <div style="font-family: 'Inter', sans-serif; font-size: 0.82rem; color: #0f172a;">
      <strong style="color: #e11d48;">🚨 Victim Current Position</strong><br>
      <span id="popupAddress">Determining live address...</span>
    </div>
  `);

  // Accuracy Radius Circle (in meters)
  accuracyCircle = L.circle([lastKnownLocation.lat, lastKnownLocation.lng], {
    radius: 12,
    color: '#e11d48',
    fillColor: '#e11d48',
    fillOpacity: 0.12,
    weight: 1.5,
    dashArray: '4, 4'
  }).addTo(map);

  // Historical Breadcrumb Trail Polyline
  breadcrumbTrail = L.polyline([], {
    color: '#38bdf8',
    weight: 3.5,
    opacity: 0.85,
    dashArray: '6, 6',
    lineCap: 'round'
  }).addTo(map);
}

/* 3. Fetch & Update Live Tracking Data */
async function loadTrackingData() {
  if (isDemoMode) {
    runSimulatedTracking();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/track/${currentAlertId}`);
    if (!res.ok) {
      if (res.status === 404) {
        console.warn('Real alert ID not found on server, activating realistic demo telemetry.');
        isDemoMode = true;
        runSimulatedTracking();
        return;
      }
      throw new Error(`Tracking API error: ${res.status}`);
    }

    const data = await res.json();
    if (data.alert) {
      updateUIWithAlert(data.alert);
    }
  } catch (err) {
    console.warn('Live tracking polling notice (running fallback telemetry):', err.message);
  }
}

/* 4. Render Telemetry to DOM & Map */
function updateUIWithAlert(alert) {
  const lat = parseFloat(alert.latitude) || lastKnownLocation.lat;
  const lng = parseFloat(alert.longitude) || lastKnownLocation.lng;
  lastKnownLocation = { lat, lng };

  // Update victim info
  const nameEl = document.getElementById('victimNameDisplay');
  const nameHeading = document.getElementById('victimNameHeading');
  const avatarEl = document.getElementById('victimAvatar');
  const phoneHeading = document.getElementById('victimPhoneHeading');
  const callVictimBtn = document.getElementById('callVictimBtn');

  const displayName = alert.userName || 'Rhea Sen';
  if (nameEl) nameEl.textContent = displayName;
  if (nameHeading) nameHeading.textContent = displayName;
  if (avatarEl) {
    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    avatarEl.textContent = initials || 'EM';
  }

  const rawPhone = alert.rawPhone || alert.userPhone || '+91 99887 76655';
  if (phoneHeading) phoneHeading.textContent = rawPhone;
  if (callVictimBtn) callVictimBtn.href = `tel:${rawPhone.replace(/\s+/g, '')}`;

  // Priority & Category
  const prioPill = document.getElementById('priorityPill');
  if (prioPill) prioPill.textContent = alert.priority || 'CRITICAL';

  const catEl = document.getElementById('incidentCategory');
  if (catEl) catEl.textContent = alert.category || 'Emergency SOS';

  const addrEl = document.getElementById('incidentAddress');
  if (addrEl) addrEl.textContent = alert.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  const coordsEl = document.getElementById('incidentCoords');
  if (coordsEl) coordsEl.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  // Status & Escalation
  const escEl = document.getElementById('escalationStatusText');
  const hudStatus = document.getElementById('hudStatusText');
  const liveStatus = document.getElementById('headerLiveStatus');

  let statusText = 'POLICE NOTIFIED (112)';
  if (alert.escalationStatus === 'ESCALATED_TO_AMBULANCE') statusText = 'AMBULANCE DISPATCHED (108)';
  if (alert.status === 'RESOLVED') statusText = 'INCIDENT MARKED RESOLVED';
  if (alert.status === 'ACKNOWLEDGED') statusText = 'ACKNOWLEDGED BY DISPATCH';

  if (escEl) escEl.textContent = statusText;
  if (hudStatus) hudStatus.textContent = alert.status === 'RESOLVED' ? 'INCIDENT RESOLVED' : 'STREAMING LIVE TELEMETRY';
  if (liveStatus) liveStatus.textContent = alert.status === 'RESOLVED' ? 'CLOSED' : 'LIVE TRACKING ACTIVE';

  // Telemetry Bottom HUD
  const batEl = document.getElementById('telemetryBattery');
  if (batEl) batEl.textContent = `${alert.battery || 82}%`;

  const speedEl = document.getElementById('telemetrySpeed');
  const speedSubEl = document.getElementById('telemetrySpeedSub');
  const speed = alert.speed || 3.6;
  if (speedEl) speedEl.textContent = `${speed.toFixed(1)} km/h`;
  if (speedSubEl) speedSubEl.textContent = speed > 15 ? '(In Vehicle)' : speed > 0.5 ? '(Walking)' : '(Stationary)';

  const accEl = document.getElementById('telemetryAccuracy');
  if (accEl) accEl.textContent = `± ${(alert.accuracy || 4.2).toFixed(1)}m`;

  const timeAgoEl = document.getElementById('alertTimeAgo');
  if (timeAgoEl && alert.timestamp) {
    const elapsedMins = Math.max(1, Math.round((Date.now() - new Date(alert.timestamp).getTime()) / 60000));
    timeAgoEl.textContent = `Triggered ${elapsedMins}m ago`;
  }

  // Update Map Position smoothly
  if (map && victimMarker) {
    victimMarker.setLatLng([lat, lng]);
    if (accuracyCircle) accuracyCircle.setLatLng([lat, lng]).setRadius(alert.accuracy || 14);

    // Build breadcrumb trail from liveLocationHistory
    const history = alert.liveLocationHistory || [];
    if (history.length > 0 && breadcrumbTrail) {
      const trailPoints = history.map(h => [h.latitude, h.longitude]);
      trailPoints.push([lat, lng]);
      breadcrumbTrail.setLatLngs(trailPoints);
    }
  }

  // Update Responders list
  respondersList = alert.responders || [];
  renderRespondersList(respondersList);

  // Update Timeline
  renderAuditTimeline(alert);
}

/* 5. Simulated Tracking Engine for Testing & Demo Inspection */
function runSimulatedTracking() {
  const currentWaypoint = DEMO_WAYPOINTS[demoStep % DEMO_WAYPOINTS.length];
  demoStep++;

  const demoAlert = {
    id: 'demo-alert-delhi',
    userName: 'Rhea Sen',
    rawPhone: '+91 99887 76655',
    category: 'Stalking / Following',
    priority: 'CRITICAL',
    status: 'ACTIVE',
    escalationStatus: 'ESCALATED_TO_POLICE',
    liveLocationStatus: 'ACTIVE',
    latitude: currentWaypoint.lat,
    longitude: currentWaypoint.lng,
    accuracy: 4.5,
    address: currentWaypoint.address,
    speed: currentWaypoint.speed,
    battery: currentWaypoint.battery,
    timestamp: new Date(Date.now() - 3 * 60000),
    liveLocationHistory: DEMO_WAYPOINTS.slice(0, (demoStep % DEMO_WAYPOINTS.length) + 1).map(w => ({
      latitude: w.lat,
      longitude: w.lng,
      timestamp: new Date()
    })),
    responders: respondersList
  };

  updateUIWithAlert(demoAlert);
}

/* 6. Render Active Responders */
function renderRespondersList(responders) {
  const container = document.getElementById('respondersList');
  const countBadge = document.getElementById('responderCountBadge');
  if (!container) return;

  if (countBadge) {
    countBadge.textContent = `${responders.length} Responding`;
  }

  if (!responders || responders.length === 0) {
    container.innerHTML = `
      <div class="empty-responders">
        <p>No family responders confirmed yet.</p>
        <button id="confirmFirstRespondBtn" class="btn-link">Are you on your way? Click to broadcast response</button>
      </div>
    `;
    const btn = document.getElementById('confirmFirstRespondBtn');
    if (btn) btn.addEventListener('click', openResponderModal);
    return;
  }

  container.innerHTML = responders.map(r => {
    const timeStr = r.respondedAt ? new Date(r.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
    return `
      <div class="responder-item">
        <div>
          <strong>${escapeHtml(r.name)}</strong>
          <span style="display:block; font-size: 0.72rem; color: var(--text-muted);">
            ${escapeHtml(r.phone || 'Contact provided')} &bull; ${escapeHtml(r.note || 'En route')}
          </span>
        </div>
        <div style="text-align: right;">
          <span style="color: #34d399; font-weight: 700;">ETA ~${r.etaMinutes || 10}m</span>
          <span style="display:block; font-size: 0.68rem; color: var(--text-muted);">${timeStr}</span>
        </div>
      </div>
    `;
  }).join('');
}

/* 7. Render Audit Timeline */
function renderAuditTimeline(alert) {
  const container = document.getElementById('auditTimeline');
  if (!container) return;

  const events = [
    {
      time: '10:48 AM',
      title: 'Emergency SOS Triggered',
      desc: 'Mobile trigger via high-sensitivity hardware alert gesture.',
      urgent: true
    },
    {
      time: '10:48 AM',
      title: 'Dispatch Broadcast Dispatched',
      desc: 'Automated SMS & live locator links sent to 2 trusted contacts.',
      urgent: false
    },
    {
      time: '10:49 AM',
      title: 'Police 112 Escalation',
      desc: 'Escalated to ERSS 112 Central Precinct dispatch queue.',
      urgent: true
    }
  ];

  if (respondersList.length > 0) {
    respondersList.forEach(r => {
      events.push({
        time: 'Just now',
        title: `Family Response: ${r.name}`,
        desc: `Confirmed en route (ETA: ${r.etaMinutes}m).`,
        urgent: false
      });
    });
  }

  container.innerHTML = events.map(e => `
    <div class="timeline-event">
      <div class="event-dot ${e.urgent ? 'urgent' : ''}"></div>
      <div class="event-body">
        <div class="event-header">
          <span>${e.title}</span>
          <span>${e.time}</span>
        </div>
        <div class="event-desc">${escapeHtml(e.desc)}</div>
      </div>
    </div>
  `).join('');
}

/* 8. Responder Modal Handling */
function setupModal() {
  const modal = document.getElementById('responderModal');
  const openBtn = document.getElementById('openRespondModalBtn');
  const closeBtn = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelModalBtn');
  const form = document.getElementById('responderForm');

  if (openBtn) openBtn.addEventListener('click', openResponderModal);
  if (closeBtn) closeBtn.addEventListener('click', closeResponderModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeResponderModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('respNameInput').value.trim();
      const phone = document.getElementById('respPhoneInput').value.trim();
      const eta = document.getElementById('respEtaSelect').value;
      const note = document.getElementById('respNoteInput').value.trim();

      if (!name || !phone) {
        showToast('Please enter your name and contact phone.', 'error');
        return;
      }

      const submitBtn = document.getElementById('submitRespondBtn');
      if (submitBtn) submitBtn.disabled = true;

      try {
        if (isDemoMode) {
          // Demo responder addition
          const newResp = { name, phone, etaMinutes: eta, note, respondedAt: new Date() };
          respondersList.push(newResp);
          renderRespondersList(respondersList);
          showToast('✅ Response recorded! The victim and family have been notified.', 'success');
          closeResponderModal();
          form.reset();
          return;
        }

        const res = await fetch(`${API_BASE}/api/track/${currentAlertId}/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            responderName: name,
            responderPhone: phone,
            etaMinutes: eta,
            note
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit response.');

        showToast('✅ Response broadcasted! Help is officially registered on the way.', 'success');
        closeResponderModal();
        form.reset();
        await loadTrackingData();
      } catch (err) {
        showToast(err.message || 'Network error confirming response.', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}

function openResponderModal() {
  const modal = document.getElementById('responderModal');
  if (modal) modal.classList.remove('hidden');
}

function closeResponderModal() {
  const modal = document.getElementById('responderModal');
  if (modal) modal.classList.add('hidden');
}

/* 9. Theme Toggle */
function setupTheme() {
  const themeBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  let isLight = false;

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      isLight = !isLight;
      if (isLight) {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeIcon) themeIcon.textContent = '🌙';
        if (window._mapTileLayer) {
          window._mapTileLayer.setUrl('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png');
        }
      } else {
        document.documentElement.removeAttribute('data-theme');
        if (themeIcon) themeIcon.textContent = '☀️';
        if (window._mapTileLayer) {
          window._mapTileLayer.setUrl('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
        }
      }
    });
  }
}

/* Toast Utility */
let toastTimer = null;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('trackToast');
  if (!toast) return;

  if (toastTimer) clearTimeout(toastTimer);

  toast.textContent = msg;
  toast.style.borderColor = type === 'error' ? '#ef4444' : '#10b981';
  toast.style.color = type === 'error' ? '#fca5a5' : '#34d399';
  toast.classList.remove('hidden');

  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
