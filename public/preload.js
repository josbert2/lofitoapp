// Puente seguro entre el renderer y el proceso principal (contextIsolation).
// Se usa en la ventana principal, el mini-player y el wallpaper.
const { contextBridge, ipcRenderer } = require('electron');

const isMini = process.argv.includes('--lofito-mini');
const isWallpaper = process.argv.includes('--lofito-wallpaper');

contextBridge.exposeInMainWorld('lofitoDesktop', {
    isMini,
    isWallpaper,

    // Controles: el mini-player los manda, la ventana principal los ejecuta.
    sendCommand: (cmd) => ipcRenderer.send('lofito:command', cmd),
    onCommand: (cb) => {
        const h = (_e, cmd) => cb(cmd);
        ipcRenderer.on('lofito:command', h);
        return () => ipcRenderer.removeListener('lofito:command', h);
    },

    // "Qué suena": la ventana principal lo publica, el mini-player lo escucha.
    publishNowPlaying: (state) => ipcRenderer.send('lofito:nowplaying', state),
    onNowPlaying: (cb) => {
        const h = (_e, s) => cb(s);
        ipcRenderer.on('lofito:nowplaying', h);
        return () => ipcRenderer.removeListener('lofito:nowplaying', h);
    },
    requestNowPlaying: () => ipcRenderer.send('lofito:request-nowplaying'),

    // El mini-player pide restaurar la ventana principal.
    restoreMain: () => ipcRenderer.send('lofito:restore'),

    // La ventana del mini es fija y transparente; el mini pide activar/desactivar
    // el click-through según el mouse esté sobre la isla o no.
    setClickThrough: (ignore) => ipcRenderer.send('mini:clickthrough', ignore),

    // Activar/desactivar el widget flotante (toggle desde el header).
    setWidgetEnabled: (enabled) => ipcRenderer.send('mini:setEnabled', enabled),

    // Controles de la ventana principal (barra de título propia).
    minimize: () => ipcRenderer.send('win:minimize'),
    maximize: () => ipcRenderer.send('win:maximize'),
    close: () => ipcRenderer.send('win:close'),

    // Actualizaciones: aviso "lista para instalar" + acción de instalar.
    onUpdateReady: (cb) => {
        const h = (_e, info) => cb(info);
        ipcRenderer.on('update:ready', h);
        return () => ipcRenderer.removeListener('update:ready', h);
    },
    installUpdate: () => ipcRenderer.send('update:install'),

    // --- Modo Wallpaper ---
    // Activar/desactivar el fondo de escritorio vivo (toggle desde el header).
    setWallpaperEnabled: (enabled) => ipcRenderer.send('wallpaper:setEnabled', enabled),
    // La app principal publica la URL de la escena que se ve de fondo.
    publishScene: (url) => ipcRenderer.send('wallpaper:scene', url),
    // La ventana del wallpaper escucha la escena y la pide al cargar.
    onScene: (cb) => {
        const h = (_e, url) => cb(url);
        ipcRenderer.on('wallpaper:scene', h);
        return () => ipcRenderer.removeListener('wallpaper:scene', h);
    },
    requestScene: () => ipcRenderer.send('wallpaper:requestScene'),
});
