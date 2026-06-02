import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    MenuItem,
    Paper,
    Snackbar,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import useStore from '~/hooks/useStore';
import * as catalog from '~/api/catalog';
import { staticSets } from '~/assets/data/sets.data';
import { staticTracks, effects as AMBIENT_EFFECTS } from '~/assets/data/audios.data';

const MOODS = ['chill', 'jazzy', 'sleepy'];

// efectos de ambiente disponibles para las acciones de sonido (en sync con audios.data)
const EFFECTS = AMBIENT_EFFECTS.map((e) => ({ key: e.type, name: e.name }));
const ACTION_TYPES = [
    { value: 'sound', label: 'Sonido' },
    { value: 'open-mixer', label: 'Abrir mixer' },
    { value: 'next-set', label: 'Cambiar lugar/escena' },
];

function Admin() {
    const { currentUser } = useStore();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(0);
    const [sets, setSets] = useState([]);
    const [tracks, setTracks] = useState([]);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState(null); // { type, msg }

    const notify = (type, msg) => setToast({ type, msg });
    const fail = (e) => notify('error', e?.message || 'Error');

    const reload = useCallback(async () => {
        try {
            const data = await catalog.getAdminCatalog();
            setSets(data.sets || []);
            setTracks(data.tracks || []);
        } catch (e) {
            fail(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentUser && currentUser.isAdmin) reload();
    }, [currentUser, reload]);

    // --- guard ---
    if (!currentUser) {
        return (
            <Guard
                title="Necesitás iniciar sesión"
                body="Entrá con tu cuenta de admin desde la app y volvé a /admin."
                onBack={() => navigate('/')}
            />
        );
    }
    if (!currentUser.isAdmin) {
        return (
            <Guard
                title="No autorizado"
                body="Tu usuario no es admin. Pedí que te promuevan."
                onBack={() => navigate('/')}
            />
        );
    }

    // --- acciones ---
    const doImport = async () => {
        if (!window.confirm('Importar el catálogo actual reemplaza TODO el catálogo en la DB. ¿Seguir?')) return;
        setBusy(true);
        try {
            const r = await catalog.seedCatalog({ sets: staticSets, tracks: staticTracks });
            notify('success', `Importado: ${r.counts.sets} sets, ${r.counts.scenes} escenas, ${r.counts.tracks} tracks`);
            await reload();
        } catch (e) {
            fail(e);
        } finally {
            setBusy(false);
        }
    };

    const patchSet = async (id, payload) => {
        try {
            const updated = await catalog.updateSet(id, payload);
            setSets((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
        } catch (e) {
            fail(e);
        }
    };
    const removeSet = async (id) => {
        if (!window.confirm('¿Borrar el set y sus escenas?')) return;
        try {
            await catalog.deleteSet(id);
            setSets((prev) => prev.filter((s) => s.id !== id));
        } catch (e) {
            fail(e);
        }
    };
    const patchScene = async (setId, sceneId, payload) => {
        try {
            const updated = await catalog.updateScene(sceneId, payload);
            setSets((prev) =>
                prev.map((s) =>
                    s.id !== setId
                        ? s
                        : { ...s, scenes: s.scenes.map((sc) => (sc.id === sceneId ? { ...sc, ...updated } : sc)) }
                )
            );
        } catch (e) {
            fail(e);
        }
    };
    const removeScene = async (setId, sceneId) => {
        if (!window.confirm('¿Borrar la escena?')) return;
        try {
            await catalog.deleteScene(sceneId);
            setSets((prev) =>
                prev.map((s) => (s.id !== setId ? s : { ...s, scenes: s.scenes.filter((sc) => sc.id !== sceneId) }))
            );
        } catch (e) {
            fail(e);
        }
    };
    const addScene = async (setId) => {
        const sceneKey = window.prompt('sceneKey (identificador, ej: greenHouse):');
        if (!sceneKey) return;
        const url = window.prompt('URL del video default (.mp4):') || '';
        try {
            const scene = await catalog.createScene({
                setId,
                sceneKey,
                variants: url ? { default: url } : {},
                actions: [],
                wallpaper: null,
                thumbnail: null,
                isPublic: true,
                sortOrder: 99,
            });
            setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, scenes: [...s.scenes, scene] } : s)));
        } catch (e) {
            fail(e);
        }
    };
    const addSet = async () => {
        const name = window.prompt('Nombre del set:');
        if (!name) return;
        const slug = (window.prompt('slug (sin espacios, ej: green_house):') || name)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_');
        try {
            const set = await catalog.createSet({ slug, name, effects: [], premium: false, isPublic: true, sortOrder: 99 });
            setSets((prev) => [...prev, { ...set, scenes: [] }]);
            notify('success', `Escena "${name}" creada — ahora subí videos adentro`);
        } catch (e) {
            fail(e);
        }
    };

    const patchTrack = async (id, payload) => {
        try {
            const updated = await catalog.updateTrack(id, payload);
            setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
        } catch (e) {
            fail(e);
        }
    };
    const removeTrack = async (id) => {
        try {
            await catalog.deleteTrack(id);
            setTracks((prev) => prev.filter((t) => t.id !== id));
        } catch (e) {
            fail(e);
        }
    };
    const addTrack = async (mood) => {
        const url = window.prompt(`URL del track (mood: ${mood}):`);
        if (!url) return;
        const title = window.prompt('Título (opcional):') || null;
        try {
            const track = await catalog.createTrack({ mood, url, title, isPublic: true, sortOrder: 99 });
            setTracks((prev) => [...prev, track]);
        } catch (e) {
            fail(e);
        }
    };

    // --- uploads a R2 (result = { url, thumbnailUrl, originalSize, size, compressed }) ---
    const sizeMsg = (r) =>
        r?.compressed && r.originalSize
            ? ` (${(r.originalSize / 1e6).toFixed(0)}→${(r.size / 1e6).toFixed(0)} MB)`
            : '';

    const onUploadTrack = async (mood, result, file) => {
        const title = (file?.name || '').replace(/\.[^.]+$/, '') || null;
        try {
            const track = await catalog.createTrack({ mood, url: result.url, title, isPublic: true, sortOrder: 99 });
            setTracks((prev) => [...prev, track]);
            notify('success', 'Track subido a R2 y agregado');
        } catch (e) {
            fail(e);
        }
    };
    const onUploadScene = async (setId, result, file) => {
        const sceneKey =
            (file?.name || '').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]+/g, '_') || `scene_${Date.now()}`;
        try {
            const scene = await catalog.createScene({
                setId,
                sceneKey,
                variants: { default: result.url },
                actions: [],
                thumbnail: result.thumbnailUrl || null,
                wallpaper: result.thumbnailUrl || null,
                isPublic: true,
                sortOrder: 99,
            });
            setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, scenes: [...s.scenes, scene] } : s)));
            // si el padre todavía no tiene thumbnail, usar el de este hijo (si no, la card sale invisible)
            const parent = sets.find((s) => s.id === setId);
            if (parent && !parent.thumbnail && result.thumbnailUrl) {
                await patchSet(setId, { thumbnail: result.thumbnailUrl });
            }
            notify('success', `Video agregado${sizeMsg(result)}`);
        } catch (e) {
            fail(e);
        }
    };
    const onReplaceSceneVideo = async (setId, scene, result) => {
        const patch = { variants: { ...(scene.variants || {}), default: result.url } };
        if (result.thumbnailUrl && !scene.thumbnail) patch.thumbnail = result.thumbnailUrl;
        await patchScene(setId, scene.id, patch);
        notify('success', `Video actualizado${sizeMsg(result)}`);
    };
    // Sube un video y crea su propio set + escena publicados de una (aparece solo en la app).
    const onUploadNewScene = async (result, file) => {
        const base =
            (file?.name || '').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase() ||
            `escena_${Date.now()}`;
        const name = (file?.name || '').replace(/\.[^.]+$/, '') || 'Escena nueva';
        try {
            const set = await catalog.createSet({
                slug: `${base}_${Date.now()}`,
                name,
                thumbnail: result.thumbnailUrl || null,
                effects: [],
                premium: false,
                isPublic: true,
                sortOrder: 99,
            });
            const scene = await catalog.createScene({
                setId: set.id,
                sceneKey: base,
                variants: { default: result.url },
                actions: [],
                thumbnail: result.thumbnailUrl || null,
                wallpaper: result.thumbnailUrl || null,
                isPublic: true,
                sortOrder: 0,
            });
            setSets((prev) => [...prev, { ...set, scenes: [scene] }]);
            notify('success', `"${name}" publicada${sizeMsg(result)}`);
        } catch (e) {
            fail(e);
        }
    };

    const isEmpty = !loading && sets.length === 0 && tracks.length === 0;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#0f1115', color: '#e8eaed', p: { xs: 2, md: 4 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>
                        Catálogo · Admin
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.6 }}>
                        Publicá escenas y música. Lo publicado es lo que ve la app.
                    </Typography>
                </Box>
                <Stack direction="row" gap={1} flexWrap="wrap">
                    <Button variant="text" sx={{ color: '#9aa0a6' }} onClick={() => navigate('/')}>
                        Volver a la app
                    </Button>
                    <Button startIcon={<RefreshIcon />} variant="outlined" color="inherit" onClick={reload} disabled={busy}>
                        Recargar
                    </Button>
                    <Button variant="contained" onClick={doImport} disabled={busy}>
                        {busy ? 'Importando…' : 'Importar catálogo actual'}
                    </Button>
                </Stack>
            </Stack>

            {loading ? (
                <Stack alignItems="center" sx={{ mt: 8 }}>
                    <CircularProgress color="inherit" />
                </Stack>
            ) : (
                <>
                    {isEmpty && (
                        <Alert severity="info" sx={{ mb: 3 }}>
                            El catálogo en la DB está vacío. Apretá <b>Importar catálogo actual</b> para sembrarlo con
                            las escenas y tracks que ya trae la app.
                        </Alert>
                    )}

                    <Tabs
                        value={tab}
                        onChange={(_e, v) => setTab(v)}
                        textColor="inherit"
                        sx={{ mb: 2, '& .MuiTabs-indicator': { bgcolor: '#8ab4f8' } }}
                    >
                        <Tab label={`Escenas · padres (${sets.length})`} />
                        <Tab label={`Música (${tracks.length} tracks)`} />
                    </Tabs>

                    {tab === 0 && (
                        <Stack gap={1.5}>
                            <Alert severity="info" icon={false} sx={{ bgcolor: '#171a21', color: '#9aa0a6' }}>
                                Cada <b>escena (padre)</b> agrupa varios <b>videos (hijos)</b> — son las vistas que se
                                cambian con "Cambiar escena" en el player.
                            </Alert>
                            <Stack direction="row" gap={1} flexWrap="wrap">
                                <UploadButton
                                    folder="scenes/nuevas"
                                    accept="video/*"
                                    label="Nueva escena (subí el 1er video)"
                                    variant="contained"
                                    onUploaded={onUploadNewScene}
                                    onError={fail}
                                />
                                <Button
                                    startIcon={<AddIcon />}
                                    size="small"
                                    color="inherit"
                                    variant="outlined"
                                    onClick={addSet}
                                >
                                    Crear escena vacía
                                </Button>
                            </Stack>
                            {sets.map((s) => (
                                <SetCard
                                    key={s.id}
                                    set={s}
                                    onPatchSet={patchSet}
                                    onRemoveSet={removeSet}
                                    onPatchScene={patchScene}
                                    onRemoveScene={removeScene}
                                    onAddScene={addScene}
                                    onUploadScene={onUploadScene}
                                    onReplaceSceneVideo={onReplaceSceneVideo}
                                    onError={fail}
                                />
                            ))}
                        </Stack>
                    )}

                    {tab === 1 && (
                        <TracksPanel
                            tracks={tracks}
                            onPatch={patchTrack}
                            onRemove={removeTrack}
                            onAdd={addTrack}
                            onUpload={onUploadTrack}
                            onError={fail}
                        />
                    )}
                </>
            )}

            <Snackbar
                open={!!toast}
                autoHideDuration={4000}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                {toast ? (
                    <Alert severity={toast.type} onClose={() => setToast(null)} variant="filled">
                        {toast.msg}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </Box>
    );
}

function Guard({ title, body, onBack }) {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#0f1115',
                color: '#e8eaed',
                display: 'grid',
                placeItems: 'center',
                p: 3,
            }}
        >
            <Paper sx={{ p: 4, bgcolor: '#171a21', color: '#e8eaed', maxWidth: 420, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                    {title}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>
                    {body}
                </Typography>
                <Button variant="contained" onClick={onBack}>
                    Ir a la app
                </Button>
            </Paper>
        </Box>
    );
}

function UploadButton({ folder, accept, label, onUploaded, onError, size = 'small', variant = 'outlined' }) {
    const inputRef = useRef(null);
    const [pct, setPct] = useState(null);

    const handle = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPct(0);
        try {
            const result = await catalog.uploadFile(file, folder, setPct);
            await onUploaded(result, file);
        } catch (err) {
            onError?.(err);
        } finally {
            setPct(null);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <>
            <input ref={inputRef} type="file" accept={accept} hidden onChange={handle} />
            <Button
                size={size}
                variant={variant}
                color="inherit"
                startIcon={<CloudUploadIcon />}
                disabled={pct !== null}
                onClick={() => inputRef.current?.click()}
            >
                {pct !== null ? `Subiendo ${pct}%` : label}
            </Button>
        </>
    );
}

function SceneActionsEditor({ scene, onSave, onError }) {
    const [rows, setRows] = useState(() =>
        (scene.actions || []).map((a) => ({ ...a, position: Array.isArray(a.position) ? [...a.position] : [50, 50] }))
    );
    const [saving, setSaving] = useState(false);
    const [dragIdx, setDragIdx] = useState(null);
    const [selected, setSelected] = useState(null);
    const canvasRef = useRef(null);
    const bg = scene.thumbnail || scene.wallpaper || '';

    const update = (i, patch) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    const remove = (i) => {
        setRows((rs) => rs.filter((_, idx) => idx !== i));
        setSelected(null);
    };

    const pctFromEvent = (e) => {
        const r = canvasRef.current.getBoundingClientRect();
        const x = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
        const y = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
        return [Math.round(x), Math.round(y)];
    };

    const addAt = (pos) => {
        setRows((rs) => [...rs, { type: 'sound', effect: 'rain_forest', title: 'Lluvia', position: pos }]);
        setSelected(rows.length);
    };

    const onCanvasClick = (e) => {
        if (e.target === canvasRef.current) addAt(pctFromEvent(e));
    };

    useEffect(() => {
        if (dragIdx === null) return;
        const move = (e) => update(dragIdx, { position: pctFromEvent(e) });
        const up = () => setDragIdx(null);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dragIdx]);

    const save = async () => {
        setSaving(true);
        try {
            const clean = rows.map((r) => ({
                type: r.type,
                ...(r.type === 'sound' ? { effect: r.effect } : {}),
                title: r.title || EFFECTS.find((e) => e.key === r.effect)?.name || r.type,
                position: [Number(r.position?.[0]) || 0, Number(r.position?.[1]) || 0],
            }));
            await onSave(clean);
        } catch (e) {
            onError?.(e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ p: 1.5, borderTop: '1px solid #2a2f3a' }}>
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
                Arrastrá los círculos sobre la escena para ubicarlos. Click en un lugar vacío para agregar uno.
            </Typography>

            <Box
                ref={canvasRef}
                onClick={onCanvasClick}
                sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 560,
                    aspectRatio: '16 / 9',
                    mt: 1,
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    bgcolor: '#000',
                    backgroundImage: bg ? `url(${bg})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    cursor: 'crosshair',
                    userSelect: 'none',
                    border: '1px solid #2a2f3a',
                }}
            >
                {!bg && (
                    <Typography
                        variant="caption"
                        sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: 0.4 }}
                    >
                        (sin preview — subí un video para ver el fondo)
                    </Typography>
                )}
                {rows.map((r, i) => (
                    <Box
                        key={i}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            setDragIdx(i);
                            setSelected(i);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title={r.title}
                        sx={{
                            position: 'absolute',
                            left: `${r.position[0]}%`,
                            top: `${r.position[1]}%`,
                            transform: 'translate(-50%, -50%)',
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            border: '2px solid #fff',
                            bgcolor: selected === i ? 'rgba(138,180,248,0.95)' : 'rgba(255,255,255,0.4)',
                            boxShadow: '0 0 0 4px rgba(0,0,0,0.28)',
                            cursor: dragIdx === i ? 'grabbing' : 'grab',
                            display: 'grid',
                            placeItems: 'center',
                            touchAction: 'none',
                        }}
                    >
                        <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: '#fff' }} />
                    </Box>
                ))}
            </Box>

            <Stack gap={0.5} sx={{ mt: 1.5 }}>
                {rows.map((r, i) => (
                    <Stack
                        key={i}
                        direction="row"
                        gap={1}
                        alignItems="center"
                        flexWrap="wrap"
                        onClick={() => setSelected(i)}
                        sx={{
                            p: 0.5,
                            borderRadius: 1,
                            cursor: 'pointer',
                            bgcolor: selected === i ? 'rgba(138,180,248,0.12)' : 'transparent',
                        }}
                    >
                        <Chip size="small" label={`#${i + 1}`} sx={{ bgcolor: '#2a2f3a', color: '#9aa0a6' }} />
                        <TextField
                            select
                            size="small"
                            label="tipo"
                            value={r.type}
                            onChange={(e) => update(i, { type: e.target.value })}
                            sx={{ ...inputSx, width: 150 }}
                        >
                            {ACTION_TYPES.map((t) => (
                                <MenuItem key={t.value} value={t.value}>
                                    {t.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        {r.type === 'sound' && (
                            <TextField
                                select
                                size="small"
                                label="sonido"
                                value={r.effect || ''}
                                onChange={(e) => {
                                    const name = EFFECTS.find((x) => x.key === e.target.value)?.name;
                                    update(i, { effect: e.target.value, title: r.title || name });
                                }}
                                sx={{ ...inputSx, width: 170 }}
                            >
                                {EFFECTS.map((e) => (
                                    <MenuItem key={e.key} value={e.key}>
                                        {e.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                        <TextField
                            size="small"
                            label="título"
                            value={r.title || ''}
                            onChange={(e) => update(i, { title: e.target.value })}
                            sx={{ ...inputSx, flex: 1, minWidth: 110 }}
                        />
                        <Typography variant="caption" sx={{ opacity: 0.5, width: 56, textAlign: 'right' }}>
                            {r.position[0]},{r.position[1]}
                        </Typography>
                        <IconButton size="small" color="error" onClick={() => remove(i)}>
                            <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                ))}
                {rows.length === 0 && (
                    <Typography variant="caption" sx={{ opacity: 0.4 }}>
                        sin acciones — click sobre la escena para agregar el primer círculo
                    </Typography>
                )}
            </Stack>

            <Stack direction="row" gap={1} sx={{ mt: 1.5 }}>
                <Button size="small" color="inherit" startIcon={<AddIcon />} onClick={() => addAt([50, 50])}>
                    Agregar acción
                </Button>
                <Button size="small" variant="contained" onClick={save} disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar acciones'}
                </Button>
            </Stack>
        </Box>
    );
}

function SetCard({
    set,
    onPatchSet,
    onRemoveSet,
    onPatchScene,
    onRemoveScene,
    onAddScene,
    onUploadScene,
    onReplaceSceneVideo,
    onError,
}) {
    const [actionsFor, setActionsFor] = useState(null);
    const [name, setName] = useState(set.name);
    return (
        <Accordion sx={{ bgcolor: '#171a21', color: '#e8eaed', borderRadius: 2, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#9aa0a6' }} />}>
                <Stack direction="row" alignItems="center" gap={1.5} sx={{ width: '100%', pr: 2 }} flexWrap="wrap">
                    <Typography fontWeight={600}>{set.name}</Typography>
                    <Chip size="small" label={set.slug} sx={{ bgcolor: '#2a2f3a', color: '#9aa0a6' }} />
                    {set.premium && <Chip size="small" label="premium" color="warning" />}
                    <Box sx={{ flex: 1 }} />
                    <Typography variant="caption" sx={{ opacity: 0.6 }}>
                        {set.scenes.length} videos
                    </Typography>
                    <Stack direction="row" alignItems="center" gap={0.5} onClick={(e) => e.stopPropagation()}>
                        <Typography variant="caption">Público</Typography>
                        <Switch
                            size="small"
                            checked={!!set.isPublic}
                            onChange={(e) => onPatchSet(set.id, { isPublic: e.target.checked })}
                        />
                    </Stack>
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                <Stack direction="row" gap={2} flexWrap="wrap" sx={{ mb: 2 }}>
                    <TextField
                        size="small"
                        label="Nombre"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => name !== set.name && onPatchSet(set.id, { name })}
                        variant="outlined"
                        sx={inputSx}
                    />
                    <Stack direction="row" alignItems="center">
                        <Typography variant="body2">Premium</Typography>
                        <Switch
                            checked={!!set.premium}
                            onChange={(e) => onPatchSet(set.id, { premium: e.target.checked })}
                        />
                    </Stack>
                    <Box sx={{ flex: 1 }} />
                    <Button color="error" size="small" startIcon={<DeleteOutlineIcon />} onClick={() => onRemoveSet(set.id)}>
                        Borrar escena (y sus videos)
                    </Button>
                </Stack>
                <Divider sx={{ borderColor: '#2a2f3a', mb: 1 }} />
                <Stack gap={1}>
                    {set.scenes.map((sc) => (
                        <Box key={sc.id} sx={{ bgcolor: '#11141a', borderRadius: 1 }}>
                            <Stack direction="row" alignItems="center" gap={1.5} sx={{ p: 1 }} flexWrap="wrap">
                                {sc.thumbnail || sc.wallpaper ? (
                                    <Box
                                        component="img"
                                        src={sc.thumbnail || sc.wallpaper}
                                        alt=""
                                        sx={{ width: 64, height: 40, objectFit: 'cover', borderRadius: 1 }}
                                    />
                                ) : (
                                    <Box sx={{ width: 64, height: 40, bgcolor: '#2a2f3a', borderRadius: 1 }} />
                                )}
                                <Box sx={{ minWidth: 120 }}>
                                    <Typography variant="body2">{sc.sceneKey}</Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.5 }}>
                                        {Object.keys(sc.variants || {}).length} variantes
                                    </Typography>
                                </Box>
                                <Box sx={{ flex: 1 }} />
                                <Button
                                    size="small"
                                    color="inherit"
                                    variant={actionsFor === sc.id ? 'contained' : 'text'}
                                    onClick={() => setActionsFor(actionsFor === sc.id ? null : sc.id)}
                                >
                                    Acciones ({(sc.actions || []).length})
                                </Button>
                                <UploadButton
                                    folder={`scenes/${set.slug}`}
                                    accept="video/*"
                                    label="Video"
                                    onUploaded={(result) => onReplaceSceneVideo(set.id, sc, result)}
                                    onError={onError}
                                />
                                <Typography variant="caption">Público</Typography>
                                <Switch
                                    size="small"
                                    checked={!!sc.isPublic}
                                    onChange={(e) => onPatchScene(set.id, sc.id, { isPublic: e.target.checked })}
                                />
                                <IconButton size="small" color="error" onClick={() => onRemoveScene(set.id, sc.id)}>
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                            {actionsFor === sc.id && (
                                <SceneActionsEditor
                                    scene={sc}
                                    onSave={(actions) => onPatchScene(set.id, sc.id, { actions })}
                                    onError={onError}
                                />
                            )}
                        </Box>
                    ))}
                    <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>
                            Agregar video (hijo) a esta escena:
                        </Typography>
                        <UploadButton
                            folder={`scenes/${set.slug}`}
                            accept="video/*"
                            label="Subir video"
                            onUploaded={(result, file) => onUploadScene(set.id, result, file)}
                            onError={onError}
                        />
                        <Button startIcon={<AddIcon />} size="small" color="inherit" onClick={() => onAddScene(set.id)}>
                            por URL
                        </Button>
                    </Stack>
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
}

function TracksPanel({ tracks, onPatch, onRemove, onAdd, onUpload, onError }) {
    const byMood = useMemo(() => {
        const m = {};
        for (const mood of MOODS) m[mood] = [];
        for (const t of tracks) {
            if (!m[t.mood]) m[t.mood] = [];
            m[t.mood].push(t);
        }
        return m;
    }, [tracks]);

    return (
        <Stack gap={3}>
            {Object.entries(byMood).map(([mood, list]) => (
                <Box key={mood}>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <Typography variant="h6" textTransform="capitalize">
                            {mood}
                        </Typography>
                        <Chip size="small" label={list.length} sx={{ bgcolor: '#2a2f3a', color: '#9aa0a6' }} />
                        <Button startIcon={<AddIcon />} size="small" color="inherit" onClick={() => onAdd(mood)}>
                            Agregar track (URL)
                        </Button>
                        <UploadButton
                            folder={`tracks/${mood}`}
                            accept="audio/*"
                            label="Subir track"
                            onUploaded={(result, file) => onUpload(mood, result, file)}
                            onError={onError}
                        />
                    </Stack>
                    <Stack gap={0.5}>
                        {list.map((t) => (
                            <TrackRow key={t.id} track={t} onPatch={onPatch} onRemove={onRemove} />
                        ))}
                        {list.length === 0 && (
                            <Typography variant="caption" sx={{ opacity: 0.4 }}>
                                sin tracks
                            </Typography>
                        )}
                    </Stack>
                </Box>
            ))}
        </Stack>
    );
}

function TrackRow({ track, onPatch, onRemove }) {
    const [url, setUrl] = useState(track.url);
    const [title, setTitle] = useState(track.title || '');
    return (
        <Stack
            direction="row"
            alignItems="center"
            gap={1}
            sx={{ bgcolor: '#171a21', p: 1, borderRadius: 1 }}
            flexWrap="wrap"
        >
            <TextField
                size="small"
                label="título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => (title || '') !== (track.title || '') && onPatch(track.id, { title: title || null })}
                sx={{ ...inputSx, width: 160 }}
            />
            <TextField
                size="small"
                label="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => url !== track.url && url && onPatch(track.id, { url })}
                sx={{ ...inputSx, flex: 1, minWidth: 220 }}
            />
            <TextField
                size="small"
                select
                label="mood"
                value={track.mood}
                onChange={(e) => onPatch(track.id, { mood: e.target.value })}
                sx={{ ...inputSx, width: 110 }}
            >
                {MOODS.map((m) => (
                    <MenuItem key={m} value={m}>
                        {m}
                    </MenuItem>
                ))}
            </TextField>
            <Typography variant="caption">Público</Typography>
            <Switch
                size="small"
                checked={!!track.isPublic}
                onChange={(e) => onPatch(track.id, { isPublic: e.target.checked })}
            />
            <IconButton size="small" color="error" onClick={() => onRemove(track.id)}>
                <DeleteOutlineIcon fontSize="small" />
            </IconButton>
        </Stack>
    );
}

const inputSx = {
    '& .MuiInputBase-root': { color: '#e8eaed' },
    '& .MuiInputLabel-root': { color: '#9aa0a6' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2a2f3a' },
    '& .MuiSvgIcon-root': { color: '#9aa0a6' },
};

export default Admin;
