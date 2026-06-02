import api from './client';

// --- público ---------------------------------------------------------------

export const getCatalog = async () => {
    const { data } = await api.get('/api/catalog');
    return data; // { sets: [...], tracks: { chill, jazzy, sleepy } }
};

// --- admin -----------------------------------------------------------------

export const getAdminCatalog = async () => {
    const { data } = await api.get('/api/admin/catalog');
    return data; // { sets: [...], tracks: [...] }
};

// Importa (reset completo) el catálogo estático actual del front.
export const seedCatalog = async ({ sets, tracks }) => {
    const { data } = await api.post('/api/admin/seed', { sets, tracks });
    return data; // { ok, counts }
};

export const createSet = async (payload) => (await api.post('/api/admin/sets', payload)).data.set;
export const updateSet = async (id, payload) => (await api.patch(`/api/admin/sets/${id}`, payload)).data.set;
export const deleteSet = async (id) => (await api.delete(`/api/admin/sets/${id}`)).data;

export const createScene = async (payload) => (await api.post('/api/admin/scenes', payload)).data.scene;
export const updateScene = async (id, payload) => (await api.patch(`/api/admin/scenes/${id}`, payload)).data.scene;
export const deleteScene = async (id) => (await api.delete(`/api/admin/scenes/${id}`)).data;

// Sube un archivo a R2 (vía el server) y devuelve { url, key }.
export const uploadFile = async (file, folder, onProgress) => {
    const form = new FormData();
    form.append('folder', folder || 'misc');
    form.append('file', file);
    const { data } = await api.post('/api/admin/upload', form, {
        onUploadProgress: (e) => {
            if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
    });
    return data; // { url, key, size, contentType }
};

export const createTrack = async (payload) => (await api.post('/api/admin/tracks', payload)).data.track;
export const updateTrack = async (id, payload) => (await api.patch(`/api/admin/tracks/${id}`, payload)).data.track;
export const deleteTrack = async (id) => (await api.delete(`/api/admin/tracks/${id}`)).data;
