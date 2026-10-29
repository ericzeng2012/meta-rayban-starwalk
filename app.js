// Phase 1 prototype: read device orientation and show the values in the HUD.

// Find the HTML elements that will display sensor status and orientation values.
const statusEl = document.getElementById('status');
const alphaEl = document.getElementById('alpha');
const betaEl = document.getElementById('beta');
const gammaEl = document.getElementById('gamma');

function initOrientation() {
    // Check whether this browser exposes the Device Orientation API.
    if (window.DeviceOrientationEvent) {
        // Some iOS browsers require permission to be requested from a user action.
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            statusEl.innerText = "Tap screen to enable head tracking";
            document.body.addEventListener('click', requestIOSPermission, { once: true });
        } else {
            // Other browsers can start listening without this permission prompt.
            window.addEventListener('deviceorientation', handleOrientation, true);
            statusEl.innerText = "Tracking Active (Standard)";
        }
    } else {
        statusEl.innerText = "Device Orientation not supported";
    }
}

function requestIOSPermission() {
    // Ask after the user's tap, as required by browsers that gate sensor access.
    DeviceOrientationEvent.requestPermission()
        .then(response => {
            if (response === 'granted') {
                // Start updating the HUD only after permission is granted.
                window.addEventListener('deviceorientation', handleOrientation, true);
                statusEl.innerText = "Tracking Active (iOS Granted)";
            } else {
                statusEl.innerText = "Sensor permission denied";
            }
        })
        .catch(console.error);
}

function handleOrientation(event) {
    // alpha is rotation around the device, beta is front-to-back tilt,
    // and gamma is left-to-right tilt. Values are shown to one decimal place.
    // A missing value is displayed as 0.0.
    const alpha = event.alpha ? event.alpha.toFixed(1) : '0.0';
    const beta = event.beta ? event.beta.toFixed(1) : '0.0';
    const gamma = event.gamma ? event.gamma.toFixed(1) : '0.0';

    // Update the matching value in the page.
    alphaEl.innerText = alpha;
    betaEl.innerText = beta;
    gammaEl.innerText = gamma;
}

// Wait until the page is ready so all the elements above exist before setup.
window.addEventListener('DOMContentLoaded', initOrientation);