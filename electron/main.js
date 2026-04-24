const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function startServer() {
    const serverPath = path.join(__dirname, '../server/app.js');
    console.log('Starting server from:', serverPath);
    
    serverProcess = spawn('node', [serverPath], {
        cwd: path.join(__dirname, '../server'),
        env: { ...process.env, PORT: 5001 },
        shell: true
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(`Server: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`Server Error: ${data}`);
    });
}

function createWindow() {
    startServer();

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        title: "Inventory Billing Software"
    });

    // In production, load the static file.
    const startUrl = path.join(__dirname, '../out/index.html');

    // Load the static export
    mainWindow.loadFile(startUrl);

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (serverProcess) {
        serverProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
