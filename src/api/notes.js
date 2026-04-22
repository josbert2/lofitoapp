import api from './client';

export const listNotes = async () => {
    const { data } = await api.get('/api/notes');
    return data.notes;
};

export const createNote = async (payload = {}) => {
    const { data } = await api.post('/api/notes', payload);
    return data.note;
};

export const updateNote = async (id, payload) => {
    const { data } = await api.patch(`/api/notes/${id}`, payload);
    return data.note;
};

export const deleteNote = async (id) => {
    const { data } = await api.delete(`/api/notes/${id}`);
    return data;
};
