import { useEffect, useState } from 'react';

// Toast propio de actualización (reemplaza el diálogo nativo de Windows).
// Solo aparece en la app de escritorio cuando hay una versión descargada.
function UpdateToast() {
    const [info, setInfo] = useState(null);

    useEffect(() => {
        const D = window.lofitoDesktop;
        if (!D || !D.onUpdateReady) return;
        return D.onUpdateReady((i) => setInfo(i));
    }, []);

    if (!info) return null;

    return (
        <div style={S.wrap}>
            <div style={S.card}>
                <div style={S.row}>
                    <span style={S.badge}>⬆</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={S.title}>Nueva versión lista</div>
                        <div style={S.sub}>Lofito {info.version} se instala al reiniciar.</div>
                    </div>
                </div>
                <div style={S.actions}>
                    <button style={S.later} onClick={() => setInfo(null)}>
                        Después
                    </button>
                    <button style={S.primary} onClick={() => window.lofitoDesktop.installUpdate()}>
                        Reiniciar ahora
                    </button>
                </div>
            </div>
        </div>
    );
}

const S = {
    wrap: {
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 3000000,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    card: {
        width: 320,
        background: '#171a21',
        color: '#fff',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
        padding: 16,
    },
    row: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
    badge: {
        width: 38,
        height: 38,
        flex: '0 0 38px',
        borderRadius: 10,
        background: 'linear-gradient(135deg,#5b6cff,#a24bff)',
        display: 'grid',
        placeItems: 'center',
        fontSize: 18,
    },
    title: { fontSize: 14, fontWeight: 700 },
    sub: { fontSize: 12, opacity: 0.6, marginTop: 2 },
    actions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
    later: {
        cursor: 'pointer',
        border: 'none',
        background: 'transparent',
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        padding: '8px 12px',
        borderRadius: 8,
    },
    primary: {
        cursor: 'pointer',
        border: 'none',
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        padding: '8px 16px',
        borderRadius: 8,
        background: 'linear-gradient(135deg,#5b6cff,#a24bff)',
    },
};

export default UpdateToast;
