const AutoLaunch = require("auto-launch"); // Import the auto-launch module
const { app, BrowserWindow, screen } = require("electron");
const wifi = require("node-wifi");
const os = require("os");
const path = require("path");
const fs = require('fs');
const unhandled = require('electron-unhandled');
const startServer = require('./wroomroom-unmodal/app/src/Server.js');

unhandled();


const logFile = path.join(app.getPath('userData'), 'your-app-log.log');


function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (let ifaceName in interfaces) {
    const iface = interfaces[ifaceName];
    for (let alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) {
        console.log(alias.address);

        return alias.address;
      }
    }
  }
  return "localhost";
}

wifi.init({
  iface: null,
});

async function connectToWiFi(ssid, password) {
  return new Promise((resolve, reject) => {
    wifi.connect({ ssid, password }, (error) => {
      if (error) {
        console.error("Connection Error:", error);
        reject(error);
      } else {
        console.log("Connected to WiFi:", ssid);
        resolve();
      }
    });
  });
}

function createWindow() {
  const localIP = getLocalIP();
  // Wait until the app is ready
  app.whenReady().then(() => {
    // Get all the displays
    const displays = screen.getAllDisplays();
    const externalDisplay = displays.find(
      (display) => display.bounds.x !== 0 || display.bounds.y !== 0
    );

    // First window
    const win1 = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
      },
    });

    if (externalDisplay) {
      // Load URL in the first window
      win1.loadURL(`https://${localIP}:8010/view/room`);

      // Second window, positioned based on external display
      const win2 = new BrowserWindow({
        x: externalDisplay.bounds.x + 50,
        y: externalDisplay.bounds.y + 50,
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: true,
        },
      });

      // Load URL in the second window
      win2.loadURL(`https://${localIP}:8010/qrcode/room`);
    } else {
      // No external display found, load second URL in the first window
      win1.loadURL(`https://${localIP}:8010/qrcode/room`);

      const win2 = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          nodeIntegration: true,
        },
      });
      win2.loadURL(`https://${localIP}:8010/view/room`);
    }
  });
}

function getResolvedPath(relativePath) {
  // Check if app is running in development or in packaged mode
  if (app.isPackaged) {
      // In packaged mode, __dirname points to resources/app.asar
      return path.join(process.resourcesPath, 'app.asar', relativePath);
  } else {
      // In development, use __dirname as usual
      return path.join(__dirname, relativePath);
  }
}




app.on("ready", async () => {
  try {
    await connectToWiFi("wifi-ssd", "wifi-password");
    createWindow();
    const autoLauncher = new AutoLaunch({
      name: "Wroomroom", // Replace with your app's name
      path: app.getPath("exe"),
    });
    autoLauncher.isEnabled().then((isEnabled) => {
      if (!isEnabled) autoLauncher.enable();
    });
  } catch (error) {
    console.error("Error:", error);
    logToFile(error);
  }
});

app.on(
  "certificate-error",
  (event, webContents, url, error, certificate, callback) => {
    // Warning: This bypasses SSL certificate validation. Use only for local development.
    event.preventDefault();
    callback(true);
  }
);


function logToFile(message) {
  fs.appendFile(logFile, message + '\n', (err) => {
      if (err) console.error('Error writing to log file:', err);
  });
}

