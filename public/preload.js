// Puente seguro entre el renderer y el proceso principal (contextIsolation).
// Se usa tanto en la ventana principal como en el mini-player.
const { contextBridge, ipcRenderer } = require('electron');

const isMini = process.argv.includes('--lofito-mini');

contextBridge.exposeInMainWorld('lofitoDesktop', {
    isMini,

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
});
