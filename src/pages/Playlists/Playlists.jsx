import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    IconButton,
    List,
    ListItemButton,
    Paper,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import useStore from '~/hooks/useStore';
import * as playlistsApi from '~/api/playlists';

// Extrae el ID de un video de YouTube desde una URL o ID pelado.
const extractVideoId = (input) => {
    if (!input) return null;
    const trimmed = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const patterns = [
        /[?&]v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const re of patterns) {
        const m = trimmed.match(re);
        if (m) return m[1];
    }
    return null;
};

// Título del video vía oEmbed (best-effort; no rompe si falla).
const fetchTitle = async (videoId) => {
    try {
        const res = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        );
        if (!res.ok) return '';
        const data = await res.json();
        return data.title || '';
    } catch {
        return '';
    }
};

function Guard({ title, body, onLogin, onBack }) {
    return (
        <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#0f1115', color: '#fff', p: 3 }}>
            <Paper sx={{ p: 4, maxWidth: 420, textAlign: 'center' }} elevation={4}>
                <Typography variant="h6" gutterBottom>
                    {title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {body}
                </Typography>
                <Stack direction="row" spacing={1} justifyContent="center">
                    {onLogin && (
                        <Button variant="contained" onClick={onLogin}>
                            Iniciar sesión
                        </Button>
                    )}
                    <Button variant="outlined" onClick={onBack}>
                        Volver
                    </Button>
                </Stack>
            </Paper>
        </Box>
    );
}

function Playlists() {
    const { currentUser } = useStore();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [lists, setLists] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [currentVideoId, setCurrentVideoId] = useState(null);
    const [url, setUrl] = useState('');
    const [newName, setNewName] = useState('');
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState(null); // { type, msg }

    const notify = (type, msg) => setToast({ type, msg });
    const fail = (e) => notify('error', e?.response?.data?.message || e?.message || 'Error');

    const selected = useMemo(() => lists.find((l) => l.id === selectedId) || null, [lists, selectedId]);

    const reload = useCallback(async () => {
        try {
            const data = await playlistsApi.listPlaylists();
            setLists(data);
            setSelectedId((prev) => prev ?? data[0]?.id ?? null);
        } catch (e) {
            fail(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentUser) reload();
    }, [currentUser, reload]);

    // primer video de la playlist seleccionada cuando cambia la selección
    useEffect(() => {
        if (selected && !selected.items.some((it) => it.videoId === currentVideoId)) {
            setCurrentVideoId(selected.items[0]?.videoId ?? null);
        }
    }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

    const persistItems = async (id, items) => {
        const updated = await playlistsApi.updatePlaylist(id, { items });
        setLists((prev) => prev.map((l) => (l.id === id ? updated : l)));
        return updated;
    };

    const handleCreate = async () => {
        const name = newName.trim() || 'Mi playlist';
        setBusy(true);
        try {
            const created = await playlistsApi.createPlaylist({ name, items: [] });
            setLists((prev) => [created, ...prev]);
            setSelectedId(created.id);
            setCurrentVideoId(null);
            setNewName('');
        } catch (e) {
            fail(e);
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteList = async (id) => {
        if (!window.confirm('¿Borrar esta playlist?')) return;
        try {
            await playlistsApi.deletePlaylist(id);
            setLists((prev) => {
                const next = prev.filter((l) => l.id !== id);
                if (selectedId === id) {
                    setSelectedId(next[0]?.id ?? null);
                    setCurrentVideoId(null);
                }
                return next;
            });
        } catch (e) {
            fail(e);
        }
    };

    const handleRename = async (id, name) => {
        try {
            const updated = await playlistsApi.updatePlaylist(id, { name: name.trim() || 'Mi playlist' });
            setLists((prev) => prev.map((l) => (l.id === id ? updated : l)));
        } catch (e) {
            fail(e);
        }
    };

    const handleAddVideo = async (e) => {
        e.preventDefault();
        const videoId = extractVideoId(url);
        if (!videoId) {
            notify('error', 'No pude leer un ID de YouTube de ese enlace.');
            return;
        }
        if (!selected) {
            notify('error', 'Creá o elegí una playlist primero.');
            return;
        }
        if (selected.items.some((it) => it.videoId === videoId)) {
            setCurrentVideoId(videoId);
            setUrl('');
            return;
        }
        setBusy(true);
        try {
            const title = await fetchTitle(videoId);
            const item = { videoId, url: url.trim(), title, addedAt: Date.now() };
            await persistItems(selected.id, [...selected.items, item]);
            setCurrentVideoId(videoId);
            setUrl('');
        } catch (err) {
            fail(err);
        } finally {
            setBusy(false);
        }
    };

    const handleRemoveVideo = async (videoId) => {
        if (!selected) return;
        try {
            const next = selected.items.filter((it) => it.videoId !== videoId);
            await persistItems(selected.id, next);
            if (currentVideoId === videoId) setCurrentVideoId(next[0]?.videoId ?? null);
        } catch (e) {
            fail(e);
        }
    };

    // --- guards ---
    if (!currentUser) {
        return (
            <Guard
                title="Necesitás iniciar sesión"
                body="Entrá con tu cuenta para ver y guardar tus playlists de YouTube."
                onLogin={() => navigate('/?auth=login')}
                onBack={() => navigate('/')}
            />
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#0f1115', color: '#fff' }}>
            {/* top bar */}
            <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
            >
                <IconButton onClick={() => navigate('/')} sx={{ color: '#fff' }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6" sx={{ flex: 1 }}>
                    🎬 Mis videos de YouTube
                </Typography>
            </Stack>

            {loading ? (
                <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '300px 1fr' },
                        gap: 2,
                        p: 3,
                        alignItems: 'start',
                    }}
                >
                    {/* sidebar: playlists */}
                    <Paper sx={{ p: 2, bgcolor: '#171a21', color: '#fff' }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.7 }}>
                            PLAYLISTS
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            <TextField
                                size="small"
                                fullWidth
                                placeholder="Nueva playlist"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                variant="outlined"
                                sx={inputSx}
                            />
                            <Tooltip title="Crear playlist">
                                <span>
                                    <IconButton onClick={handleCreate} disabled={busy} sx={{ color: '#7cc4ff' }}>
                                        <PlaylistAddIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                        {lists.length === 0 ? (
                            <Typography variant="body2" sx={{ opacity: 0.6 }}>
                                Todavía no tenés playlists. Creá una arriba.
                            </Typography>
                        ) : (
                            <List dense disablePadding>
                                {lists.map((l) => (
                                    <ListItemButton
                                        key={l.id}
                                        selected={l.id === selectedId}
                                        onClick={() => setSelectedId(l.id)}
                                        sx={{
                                            borderRadius: 1,
                                            mb: 0.5,
                                            '&.Mui-selected': { bgcolor: 'rgba(124,196,255,0.15)' },
                                        }}
                                    >
                                        <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                            <Typography noWrap>{l.name}</Typography>
                                            <Typography variant="caption" sx={{ opacity: 0.6 }}>
                                                {l.items.length} video{l.items.length === 1 ? '' : 's'}
                                            </Typography>
                                        </Box>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteList(l.id);
                                            }}
                                            sx={{ color: '#ff8a80' }}
                                        >
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </ListItemButton>
                                ))}
                            </List>
                        )}
                    </Paper>

                    {/* main: player + add + videos */}
                    <Stack spacing={2}>
                        {selected ? (
                            <>
                                <TextField
                                    variant="standard"
                                    value={selected.name}
                                    onChange={(e) =>
                                        setLists((prev) =>
                                            prev.map((l) => (l.id === selected.id ? { ...l, name: e.target.value } : l))
                                        )
                                    }
                                    onBlur={(e) => handleRename(selected.id, e.target.value)}
                                    InputProps={{ sx: { color: '#fff', fontSize: 22, fontWeight: 600 } }}
                                    sx={{ maxWidth: 480 }}
                                />

                                {/* player 16:9 */}
                                <Box
                                    sx={{
                                        position: 'relative',
                                        pt: '56.25%',
                                        bgcolor: '#000',
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                    }}
                                >
                                    {currentVideoId ? (
                                        <ReactPlayer
                                            url={`https://www.youtube.com/watch?v=${currentVideoId}`}
                                            controls
                                            playing
                                            width="100%"
                                            height="100%"
                                            style={{ position: 'absolute', top: 0, left: 0 }}
                                            config={{ youtube: { playerVars: { rel: 0 } } }}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                inset: 0,
                                                display: 'grid',
                                                placeItems: 'center',
                                                opacity: 0.5,
                                            }}
                                        >
                                            <Typography>Agregá un video para empezar a ver ▶</Typography>
                                        </Box>
                                    )}
                                </Box>

                                {/* add url */}
                                <Paper
                                    component="form"
                                    onSubmit={handleAddVideo}
                                    sx={{ p: 1.5, bgcolor: '#171a21', display: 'flex', gap: 1 }}
                                >
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Pegá una URL de YouTube (o el ID)…"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        sx={inputSx}
                                    />
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        disabled={busy || !url.trim()}
                                    >
                                        Agregar
                                    </Button>
                                </Paper>

                                {/* video list */}
                                <Paper sx={{ bgcolor: '#171a21', color: '#fff' }}>
                                    {selected.items.length === 0 ? (
                                        <Typography variant="body2" sx={{ p: 2, opacity: 0.6 }}>
                                            Esta playlist está vacía. Pegá un enlace arriba.
                                        </Typography>
                                    ) : (
                                        <List disablePadding>
                                            {selected.items.map((it, i) => (
                                                <Box key={it.videoId}>
                                                    {i > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />}
                                                    <ListItemButton
                                                        selected={it.videoId === currentVideoId}
                                                        onClick={() => setCurrentVideoId(it.videoId)}
                                                        sx={{ '&.Mui-selected': { bgcolor: 'rgba(124,196,255,0.15)' } }}
                                                    >
                                                        <Box
                                                            component="img"
                                                            src={`https://i.ytimg.com/vi/${it.videoId}/mqdefault.jpg`}
                                                            alt=""
                                                            sx={{ width: 96, height: 54, borderRadius: 1, mr: 1.5, objectFit: 'cover' }}
                                                        />
                                                        {it.videoId === currentVideoId && (
                                                            <PlayArrowIcon fontSize="small" sx={{ mr: 0.5, color: '#7cc4ff' }} />
                                                        )}
                                                        <Typography noWrap sx={{ flex: 1 }}>
                                                            {it.title || it.url || it.videoId}
                                                        </Typography>
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveVideo(it.videoId);
                                                            }}
                                                            sx={{ color: '#ff8a80' }}
                                                        >
                                                            <DeleteOutlineIcon fontSize="small" />
                                                        </IconButton>
                                                    </ListItemButton>
                                                </Box>
                                            ))}
                                        </List>
                                    )}
                                </Paper>
                            </>
                        ) : (
                            <Paper sx={{ p: 4, bgcolor: '#171a21', color: '#fff', textAlign: 'center' }}>
                                <Typography sx={{ opacity: 0.7 }}>
                                    Creá una playlist a la izquierda para empezar.
                                </Typography>
                            </Paper>
                        )}
                    </Stack>
                </Box>
            )}

            <Snackbar
                open={!!toast}
                autoHideDuration={3500}
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

const inputSx = {
    '& .MuiOutlinedInput-root': { color: '#fff' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
    '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.5)' },
};

export default Playlists;
