// Phase 3: Smoothed Device Orientation + Multi-Target Offline Astronomy + Radar Reticle

const statusEl = document.getElementById('status');
const alphaEl = document.getElementById('alpha');
const betaEl = document.getElementById('beta');
const gammaEl = document.getElementById('gamma');

const targetAzEl = document.getElementById('target-az');
const targetAltEl = document.getElementById('target-alt');

const offsetAzEl = document.getElementById('offset-az');
const offsetAltEl = document.getElementById('offset-alt');
const guideEl = document.getElementById('guide');

const radarArrowEl = document.getElementById('radar-arrow');
const radarDotEl = document.getElementById('radar-dot');

// Smoothing factor for the low-pass filter: lower = steadier but laggier
const EMA_ALPHA = 0.15;
const IN_VIEW_DEG = 2;
// Radar edge represents this angular distance from the view center
const RADAR_RANGE_DEG = 90;
const RADAR_RADIUS = 60;

let headingDeg = null;
let viewAltDeg = null;
let targetAzDeg = null;
let targetAltDeg = null;

function getMoonTarget(now) {
    const p = SunCalc.getMoonPosition(now, OBSERVER_LAT, OBSERVER_LNG);
    return { azimuth: p.azimuth * (180 / Math.PI) + 180, altitude: p.altitude * (180 / Math.PI) };
}

function wrap360(deg) {
    return ((deg % 360) + 360) % 360;
}

// Signed shortest angular difference b - a, in (-180, 180]
function angleDiff(a, b) {
    return ((b - a + 540) % 360) - 180;
}

// Low-pass filter that handles the 0/360 wraparound for headings
function smoothAngle(prev, next) {
    return prev === null ? next : wrap360(prev + EMA_ALPHA * angleDiff(prev, next));
}

function smoothValue(prev, next) {
    return prev === null ? next : prev + EMA_ALPHA * (next - prev);
}

// Default observer is Novi, Michigan; replaced by a saved or live GPS fix when available
const DEFAULT_LOCATION = { lat: 42.48, lng: -83.47 };
const LOCATION_STORAGE_KEY = 'starwalk-location';
let OBSERVER_LAT = DEFAULT_LOCATION.lat;
let OBSERVER_LNG = DEFAULT_LOCATION.lng;
const locationEl = document.getElementById('location');

function setLocation(lat, lng, source) {
    OBSERVER_LAT = lat;
    OBSERVER_LNG = lng;
    locationEl.innerText = lat.toFixed(2) + ', ' + lng.toFixed(2) + ' (' + source + ')';
    updateCelestialBodies();
}

function initLocation() {
    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY));
    } catch (err) {
        console.error(err);
    }
    if (saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lng)) {
        setLocation(saved.lat, saved.lng, 'saved');
    } else {
        setLocation(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng, 'default');
    }

    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
                localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ lat: latitude, lng: longitude }));
            } catch (err) {
                console.error(err);
            }
            setLocation(latitude, longitude, 'GPS');
        },
        (err) => console.warn('Geolocation unavailable:', err.message),
        // Position drift of a few km is irrelevant for sky coordinates, so allow cached fixes
        { enableHighAccuracy: false, maximumAge: 300000, timeout: 30000 }
    );
}

function initApp() {
    initLocation();

    // 1. Initialize Sensors
    if (window.DeviceOrientationEvent) {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            statusEl.innerText = "Tap screen to enable tracking";
            document.body.addEventListener('click', requestIOSPermission, { once: true });
        } else {
            window.addEventListener('deviceorientation', handleOrientation, true);
            statusEl.innerText = "Offline Astronomy & Tracking Active";
        }
    } else {
        statusEl.innerText = "Device Orientation not supported";
    }

    // 2. Compute Celestial Coordinates immediately and loop update every second
    updateCelestialBodies();
    setInterval(updateCelestialBodies, 1000);
}

function requestIOSPermission() {
    DeviceOrientationEvent.requestPermission()
        .then(response => {
            if (response === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation, true);
                statusEl.innerText = "Tracking Active (iOS Granted)";
            } else {
                statusEl.innerText = "Sensor permission denied";
            }
        })
        .catch(console.error);
}

function handleOrientation(event) {
    const alpha = event.alpha ? event.alpha.toFixed(1) : '0.0';
    const beta = event.beta ? event.beta.toFixed(1) : '0.0';
    const gamma = event.gamma ? event.gamma.toFixed(1) : '0.0';

    alphaEl.innerText = alpha;
    betaEl.innerText = beta;
    gammaEl.innerText = gamma;

    // iOS provides a true compass heading; elsewhere alpha is counter-clockwise from the device reference
    // Smooth the heading and pitch to suppress compass jitter
    if (typeof event.webkitCompassHeading === 'number') {
        headingDeg = smoothAngle(headingDeg, event.webkitCompassHeading);
    } else if (event.alpha !== null) {
        headingDeg = smoothAngle(headingDeg, wrap360(360 - event.alpha));
    }
    // Upright device (beta = 90) looks at the horizon
    if (event.beta !== null) {
        viewAltDeg = smoothValue(viewAltDeg, event.beta - 90);
    }
    updateRelativeOffset();
}

function updateRelativeOffset() {
    if (headingDeg === null || viewAltDeg === null || targetAzDeg === null) return;

    // Positive dAz = turn right, positive dAlt = look up
    const dAz = angleDiff(headingDeg, targetAzDeg);
    const dAlt = targetAltDeg - viewAltDeg;

    offsetAzEl.innerText = dAz.toFixed(1);
    offsetAltEl.innerText = dAlt.toFixed(1);

    const label = 'MOON';
    const horiz = Math.abs(dAz) < IN_VIEW_DEG ? '' : (dAz > 0 ? 'Turn RIGHT' : 'Turn LEFT');
    const vert = Math.abs(dAlt) < IN_VIEW_DEG ? '' : (dAlt > 0 ? 'Look UP' : 'Look DOWN');
    let guide = (horiz || vert) ? [horiz, vert].filter(Boolean).join(' / ') : label + ' IN VIEW';
    if (targetAltDeg < 0) guide += ' (below horizon)';
    guideEl.innerText = guide;

    updateRadar(dAz, dAlt);
}

// Arrow points toward the target (up = look up, right = turn right); a dot marks it when close
function updateRadar(dAz, dAlt) {
    const dist = Math.hypot(dAz, dAlt);
    const angle = Math.atan2(dAz, dAlt) * (180 / Math.PI);

    if (dist < IN_VIEW_DEG) {
        radarArrowEl.setAttribute('visibility', 'hidden');
        radarDotEl.setAttribute('cx', 0);
        radarDotEl.setAttribute('cy', 0);
        radarDotEl.setAttribute('class', 'locked');
        return;
    }

    radarArrowEl.setAttribute('visibility', 'visible');
    radarArrowEl.setAttribute('transform', 'rotate(' + angle.toFixed(1) + ')');

    const r = Math.min(dist / RADAR_RANGE_DEG, 1) * RADAR_RADIUS;
    const rad = angle * (Math.PI / 180);
    radarDotEl.setAttribute('cx', (r * Math.sin(rad)).toFixed(1));
    radarDotEl.setAttribute('cy', (-r * Math.cos(rad)).toFixed(1));
    radarDotEl.setAttribute('class', '');
}

function updateCelestialBodies() {
    try {
        const pos = getMoonTarget(new Date());

        targetAzEl.innerText = pos.azimuth.toFixed(1);
        targetAltEl.innerText = pos.altitude.toFixed(1);

        targetAzDeg = pos.azimuth;
        targetAltDeg = pos.altitude;
        updateRelativeOffset();
    } catch (err) {
        statusEl.innerText = 'Astronomy error: ' + err.message;
        console.error(err);
    }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', initApp);