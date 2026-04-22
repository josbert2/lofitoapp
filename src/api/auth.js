import api, { setToken } from './client';

export const signup = async ({ email, password, displayName, photoURL }) => {
    const { data } = await api.post('/api/auth/signup', { email, password, displayName, photoURL });
    setToken(data.token);
    return data;
};

export const login = async ({ email, password }) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    setToken(data.token);
    return data;
};

export const logout = async () => {
    try {
        await api.post('/api/auth/logout');
    } catch {
        /* ignore network errors on logout */
    }
    setToken(null);
};

export const me = async () => {
    const { data } = await api.get('/api/auth/me');
    return data;
};

export const updateProfile = async ({ displayName, photoURL }) => {
    const { data } = await api.patch('/api/auth/profile', { displayName, photoURL });
    return data;
};

export const updateEmail = async ({ email }) => {
    const { data } = await api.patch('/api/auth/email', { email });
    return data;
};

export const reauthenticate = async ({ password }) => {
    const { data } = await api.post('/api/auth/reauthenticate', { password });
    return data;
};

export const updatePassword = async ({ password }) => {
    const { data } = await api.patch('/api/auth/password', { password });
    return data;
};

export const resetPassword = async ({ email }) => {
    const { data } = await api.post('/api/auth/reset-password', { email });
    return data;
};

export const replaceTemplates = async (templates) => {
    const { data } = await api.put('/api/templates', { templates });
    return data;
};
