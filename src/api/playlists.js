import api from './client';

export const listPlaylists = async () => {
    const { data } = await api.get('/api/playlists');
    return data.playlists;
};

export const createPlaylist = async (payload = {}) => {
    const { data } = await api.post('/api/playlists', payload);
    return data.playlist;
};

export const updatePlaylist = async (id, payload) => {
    const { data } = await api.patch(`/api/playlists/${id}`, payload);
    return data.playlist;
};

export const deletePlaylist = async (id) => {
    const { data } = await api.delete(`/api/playlists/${id}`);
    return data;
};
