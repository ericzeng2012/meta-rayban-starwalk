# Meta Ray-Ban Starwalk AR

An experimental augmented reality starmap web application designed for Meta Ray-Ban smart glasses, featuring real-time device orientation tracking and a high-contrast HUD optimized for transparent displays.

---

## Project Structure

- `index.html` - The main HUD container and UI layout.
- `style.css` - Pure black background styling with high-contrast cyan vector elements.
- `app.js` - Real-time device orientation sensor (`DeviceOrientationEvent`) handler.

---

## Developer Workflow & Testing Guide

### 1. Start the Local Server

1. Open the project folder in **VS Code**.
2. Click **"Go Live"** in the bottom-right corner to start **Live Server** on port `5500`.

### 2. Establish a Public Tunnel (Required for Glasses & Mobile)

Because smart glasses cannot access `localhost` directly, spin up a secure HTTPS tunnel using `localtunnel`:

```powershell
npx localtunnel --port 5500
```

Copy the generated public HTTPS URL (e.g., `https://your-custom-url.loca.lt`).

### 3. Environment Testing Options

#### Option A: Desktop Browser (Layout & UI Check)

1. Open your browser and navigate to `http://localhost:5500`.

**What to check:** Verify that the UI layout, high-contrast colors, and text elements render correctly. (Note: Desktop computers lack built-in gyroscopes, so orientation values will remain static at `--` or `0`.)

#### Option B: Chrome DevTools Sensor Simulator

To test and debug sensor orientation logic on your computer without a physical device:

1. Open `http://localhost:5500` in Google Chrome.
2. Press **F12** to open Developer Tools.
3. Press **Ctrl + Shift + P** (Windows) or **Cmd + Shift + P** (Mac) to open the Command Palette.
4. Type "Sensors" and select **Show Sensors**.
5. Under the **Orientation** panel at the bottom, select **Custom** or manually drag the 3D cube / adjust sliders.

**What to check:** Verify that `alpha`, `beta`, and `gamma` update live on your screen in real time as you adjust the simulation.

#### Option C: Mobile Browser Testing

To test real-world physical gyro tracking before using the glasses:

1. Open your active public `localtunnel` URL (e.g., `https://your-custom-url.loca.lt`) in your phone's browser (Safari or Chrome).
2. Click **"Click to Continue"** to bypass the `localtunnel` warning/security page.
3. Tap the screen if prompted to grant motion/orientation sensor permissions.

**What to check:** Physically tilt and pan your phone around to watch the orientation coordinates stream in real time.

#### Option D: Meta Ray-Ban Smart Glasses

1. Open the Meta AI companion app on your phone and navigate to your developer web apps settings.
2. Update your app target URL to your current active `localtunnel` HTTPS URL.
3. Put on your glasses, launch the application, and view your live head-tracking HUD coordinates projected directly onto the lenses.