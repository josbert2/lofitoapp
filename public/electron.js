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

// En Linux/Wayland el posicionamiento de ventanas por código se ignora (Wayland
// no expone coordenadas globales), así que la isla no se puede anclar arriba y
// centrada. Forzamos X11 (XWayland) donde setPosition/setBounds sí funcionan.
// Nota: en GNOME Wayland Electron no puede posicionar ventanas (Mutter no expone
// coordenadas globales ni wlr-layer-shell), así que la isla no se puede anclar
// centrada arriba en esa sesión. Forzar X11 permitiría posicionar pero rompe el
// render en esta GPU. En macOS/Windows/X11 el centrado funciona normal.

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
        // Si el puerto fijo está ocupado (p.ej. un proceso viejo colgado), caemos
        // a un puerto efímero para que la app SIEMPRE abra.
        const listen = (port) => {
            server.once('error', () => {
                if (port !== 0) listen(0);
                else resolve(`http://127.0.0.1:${LOCAL_PORT}`);
            });
            server.listen(port, '127.0.0.1', () => {
                server.removeAllListeners('error');
                resolve(`http://127.0.0.1:${server.address().port}`);
            });
        };
        listen(LOCAL_PORT);
    });
}

let mainWindow = null;
let miniWindow = null;
let baseUrl = null;
let lastNowPlaying = null;
let miniEnabled = true; // widget flotante activado por defecto (toggle en el header)

const PRELOAD = path.join(__dirname, 'preload.js');

// Monitor donde anclar el widget: el de la ventana principal (así aparece en la
// pantalla que estás usando); si no hay, el primario.
function miniTargetDisplay() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        const b = mainWindow.getBounds();
        return screen.getDisplayNearestPoint({
            x: Math.round(b.x + b.width / 2),
            y: Math.round(b.y + b.height / 2),
        });
    }
    return screen.getPrimaryDisplay();
}

// Posición abajo-derecha del widget dentro del monitor objetivo (margen 16px).
function miniCornerPos(w, h) {
    const { x, y, width, height } = miniTargetDisplay().workArea;
    return { x: x + width - w - 16, y: y + height - h - 16 };
}

// Mini-player: ventana chica, sin bordes, siempre-encima. Aparece al minimizar.
function createMiniWindow() {
    if (miniWindow) return miniWindow;
    // Ventana FIJA y transparente, anclada abajo-derecha. El pill crece/encoge
    // por CSS (no se redimensiona la ventana → sin loops de hover). El área
    // transparente es click-through; el pill detecta el mouse por sí solo.
    const W = 380;
    const H = 150;
    const { x: px, y: py } = miniCornerPos(W, H);
    miniWindow = new BrowserWindow({
        width: W,
        height: H,
        x: px,
        y: py,
        frame: false,
        resizable: false,
        movable: false,
        focusable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        transparent: true,
        hasShadow: false,
        show: false,
        backgroundColor: '#00000000',
        webPreferences: {
            preload: PRELOAD,
            contextIsolation: true,
            nodeIntegration: false,
            additionalArguments: ['--lofito-mini'],
        },
    });
    miniWindow.setAlwaysOnTop(true, 'screen-saver');
    // Arranca click-through: los clics pasan al escritorio salvo sobre la isla.
    // forward:true reenvía los mousemove para poder detectar el hover.
    miniWindow.setIgnoreMouseEvents(true, { forward: true });
    miniWindow.loadURL(`${baseUrl}/mini.html`);
    miniWindow.on('closed', () => {
        miniWindow = null;
    });
    return miniWindow;
}

function showMini() {
    const w = createMiniWindow();
    // Reanclar abajo-derecha en el monitor donde está la ventana principal.
    const [ww, wh] = w.getSize();
    const { x, y } = miniCornerPos(ww, wh);
    w.setPosition(x, y);
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
        icon: path.join(__dirname, 'icon.png'),
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

    // Mostrar el mini-player al minimizar (si está activado); ocultarlo al volver.
    mainWindow.on('minimize', () => {
        if (miniEnabled) showMini();
    });
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

    // El mini activa/desactiva el click-through: interactivo sobre la isla,
    // transparente al mouse (clics pasan al escritorio) fuera de ella.
    ipcMain.on('mini:clickthrough', (_e, ignore) => {
        if (!miniWindow || miniWindow.isDestroyed()) return;
        miniWindow.setIgnoreMouseEvents(!!ignore, { forward: true });
    });

    // Activar/desactivar el widget flotante desde el header.
    ipcMain.on('mini:setEnabled', (_e, enabled) => {
        miniEnabled = !!enabled;
        if (!miniEnabled) hideMini();
        else if (mainWindow && mainWindow.isMinimized()) showMini();
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

// Una sola instancia: si ya hay una corriendo, enfocamos esa y salimos.
if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
    app.whenReady().then(() => {
        setupMenu();
        setupIpc();
        createWindow();
        setupAutoUpdate();
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
