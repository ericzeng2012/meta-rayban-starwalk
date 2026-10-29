// Phase 2: Device Orientation + Offline Moon Celestial Calculations

const statusEl = document.getElementById('status');
const alphaEl = document.getElementById('alpha');
const betaEl = document.getElementById('beta');
const gammaEl = document.getElementById('gamma');

const targetAzEl = document.getElementById('target-az');
const targetAltEl = document.getElementById('target-alt');

const offsetAzEl = document.getElementById('offset-az');
const offsetAltEl = document.getElementById('offset-alt');
const guideEl = document.getElementById('guide');

let headingDeg = null;
let viewAltDeg = null;
let moonAzDeg = null;
let moonAltDeg = null;

// Observer coordinates for Novi, Michigan
const OBSERVER_LAT = 42.48;
const OBSERVER_LNG = -83.47;

function initApp() {
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
    if (typeof event.webkitCompassHeading === 'number') {
        headingDeg = event.webkitCompassHeading;
    } else if (event.alpha !== null) {
        headingDeg = (360 - event.alpha) % 360;
    }
    // Upright device (beta = 90) looks at the horizon
    if (event.beta !== null) {
        viewAltDeg = event.beta - 90;
    }
    updateRelativeOffset();
}

function updateRelativeOffset() {
    if (headingDeg === null || viewAltDeg === null || moonAzDeg === null) return;

    // Signed shortest turn to the Moon: positive = turn right
    const dAz = ((moonAzDeg - headingDeg + 540) % 360) - 180;
    const dAlt = moonAltDeg - viewAltDeg;

    offsetAzEl.innerText = dAz.toFixed(1);
    offsetAltEl.innerText = dAlt.toFixed(1);

    const horiz = Math.abs(dAz) < 2 ? '' : (dAz > 0 ? 'Turn RIGHT' : 'Turn LEFT');
    const vert = Math.abs(dAlt) < 2 ? '' : (dAlt > 0 ? 'Look UP' : 'Look DOWN');
    guideEl.innerText = (horiz || vert) ? [horiz, vert].filter(Boolean).join(' / ') : 'MOON IN VIEW';
}

function updateCelestialBodies() {
    const now = new Date();
    
    // Compute Moon position using local SunCalc library
    const moonPos = SunCalc.getMoonPosition(now, OBSERVER_LAT, OBSERVER_LNG);
    
    // Convert radians to degrees and normalize Azimuth to 0-360 degrees clockwise from North
    let azimuthDeg = (moonPos.azimuth * (180 / Math.PI)) + 180;
    let altitudeDeg = moonPos.altitude * (180 / Math.PI);

    targetAzEl.innerText = azimuthDeg.toFixed(1);
    targetAltEl.innerText = altitudeDeg.toFixed(1);

    moonAzDeg = azimuthDeg;
    moonAltDeg = altitudeDeg;
    updateRelativeOffset();
}

// Initialize on load
window.addEventListener('DOMContentLoaded', initApp);