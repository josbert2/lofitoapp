// Proceso principal de Electron (CRA lo copia public/ -> build/electron.js).
// En prod sirve el build por un mini servidor HTTP local (fallback SPA para que
// BrowserRouter funcione) y lo abre en una ventana. En dev carga el dev server.
const { app, BrowserWindow, shell, dialog, ipcMain, screen, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const isDev = !app.isPackaged;
const DEV_URL = process.env.ELECTRON_START_URL || 'http://localhost:3000';

const MIME = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.map': 'application/json',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
};

// Puerto fijo del server local → origin estable (http://127.0.0.1:41830) que se
// puede whitelistear en el CORS del backend hosteado.
const LOCAL_PORT = 41830;

// En producción este archivo vive en build/electron.js, así que __dirname === build/.
function startStaticServer() {
    const root = __dirname;
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            try {
                const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
                let filePath = path.join(root, urlPath);
                if (!filePath.startsWith(root)) filePath = path.join(root, 'index.html');
                if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                    const ext = path.extname(urlPath);
                    filePath = ext ? filePath : path.join(root, 'index.html');
                }
                if (!fs.existsSync(filePath)) filePath = path.join(root, 'index.html');
                const ext = path.extname(filePath).toLowerCase();
                res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
                fs.createReadStream(filePath).pipe(res);
            } catch {
                res.writeHead(500);
                res.end('error');
            }
        });
        server.listen(LOCAL_PORT, '127.0.0.1', () => {
            resolve(`http://127.0.0.1:${LOCAL_PORT}`);
        });
    });
}

let mainWindow = null;
let miniWindow = null;
let baseUrl = null;
let lastNowPlaying = null;

const PRELOAD = path.join(__dirname, 'preload.js');

// Mini-player: ventana chica, sin bordes, siempre-encima. Aparece al minimizar.
function createMiniWindow() {
    if (miniWindow) return miniWindow;
    const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
    const W = 344;
    const H = 92;
    miniWindow = new BrowserWindow({
        width: W,
        height: H,
        x: sw - W - 20,
        y: sh - H - 20,
        frame: false,
        resizable: false,
        movable: true,
        skipTaskbar: true,
        alwaysOnTop: true,
        transparent: true,
        show: false,
        backgroundColor: '#00000000',
        webPreferences: {
            preload: PRELOAD,
            contextIsolation: true,
            nodeIntegration: false,
            additionalArguments: ['--lofito-mini'],
        },
    });
    miniWindow.setAlwaysOnTop(true, 'floating');
    miniWindow.loadURL(`${baseUrl}/mini.html`);
    miniWindow.on('closed', () => {
        miniWindow = null;
    });
    return miniWindow;
}

function showMini() {
    const w = createMiniWindow();
    if (lastNowPlaying) w.webContents.send('lofito:nowplaying', lastNowPlaying);
    w.showInactive();
}

function hideMini() {
    if (miniWindow && miniWindow.isVisible()) miniWindow.hide();
}

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 900,
        minHeight: 600,
        backgroundColor: '#0f1115',
        title: 'Lofito',
        autoHideMenuBar: true,
        // Sin barra de título ni menú ni botones nativos: dibujamos controles
        // propios (min/max/cerrar) en el header para un look 100% integrado.
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: PRELOAD,
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    mainWindow.setMenuBarVisibility(false);

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http')) shell.openExternal(url);
        return { action: 'deny' };
    });

    // Mostrar el mini-player al minimizar; ocultarlo al volver.
    mainWindow.on('minimize', showMini);
    mainWindow.on('restore', hideMini);
    mainWindow.on('focus', hideMini);
    mainWindow.on('show', hideMini);

    baseUrl = isDev ? DEV_URL : await startStaticServer();
    await mainWindow.loadURL(baseUrl);
}

// --- IPC: puente mini <-> principal ----------------------------------------
function setupIpc() {
    // Controles del mini-player -> ejecutar en la ventana principal.
    ipcMain.on('lofito:command', (_e, cmd) => {
        if (mainWindow) mainWindow.webContents.send('lofito:command', cmd);
    });
    // "Qué suena" desde la principal -> reenviar al mini-player.
    ipcMain.on('lofito:nowplaying', (_e, state) => {
        lastNowPlaying = state;
        if (miniWindow) miniWindow.webContents.send('lofito:nowplaying', state);
    });
    // El mini pide el estado actual al abrir.
    ipcMain.on('lofito:request-nowplaying', (e) => {
        if (lastNowPlaying) e.sender.send('lofito:nowplaying', lastNowPlaying);
    });
    // Restaurar la ventana principal desde el mini.
    ipcMain.on('lofito:restore', () => {
        if (mainWindow) {
            mainWindow.restore();
            mainWindow.focus();
        }
    });

    // Controles de ventana propios (min / max-restore / cerrar).
    ipcMain.on('win:minimize', () => mainWindow && mainWindow.minimize());
    ipcMain.on('win:maximize', () => {
        if (!mainWindow) return;
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        else mainWindow.maximize();
    });
    ipcMain.on('win:close', () => mainWindow && mainWindow.close());

    // Instalar la actualización descargada (desde el toast propio).
    ipcMain.on('update:install', () => autoUpdater.quitAndInstall());
}

// --- Auto-update (solo en la app empaquetada) ------------------------------
function setupAutoUpdate() {
    if (isDev) return;
    autoUpdater.autoDownload = true;
    autoUpdater.on('update-downloaded', (info) => {
        // Avisar a la app (toast propio). Fallback al diálogo nativo si no hay ventana.
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update:ready', { version: info.version });
        } else {
            dialog
                .showMessageBox({
                    type: 'info',
                    buttons: ['Reiniciar ahora', 'Después'],
                    defaultId: 0,
                    cancelId: 1,
                    title: 'Actualización disponible',
                    message: `Lofito ${info.version} está listo.`,
                })
                .then((r) => r.response === 0 && autoUpdater.quitAndInstall());
        }
    });
    autoUpdater.on('error', (err) => {
        console.error('auto-update error:', err?.message || err);
    });
    // chequeo al arranque y cada 6 horas
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    setInterval(() => autoUpdater.checkForUpdatesAndNotify().catch(() => {}), 6 * 60 * 60 * 1000);
}

// Menú mínimo (reemplaza el "File Edit View Window" default). Queda oculto por
// autoHideMenuBar; conserva copiar/pegar, zoom y pantalla completa.
function setupMenu() {
    const isMac = process.platform === 'darwin';
    const template = [
        ...(isMac ? [{ role: 'appMenu' }] : []),
        { role: 'editMenu' },
        {
            label: 'Ver',
            submenu: [
                { role: 'reload' },
                { role: 'togglefullscreen' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
            ],
        },
        { role: 'windowMenu' },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
    setupMenu();
    setupIpc();
    createWindow();
    setupAutoUpdate();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
