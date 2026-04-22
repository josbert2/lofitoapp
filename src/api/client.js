import axios from 'axios';

const TOKEN_KEY = 'lofito_auth_token';

export const getToken = () => {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
};

export const setToken = (token) => {
    try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    } catch {
        /* ignore */
    }
};

const envUrl = process.env.REACT_APP_API_URL;
const api = axios.create({
    baseURL: typeof envUrl === 'string' ? envUrl : 'http://localhost:3001',
});

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (error) => {
        const data = error?.response?.data;
        const err = new Error(data?.message || error.message || 'Network error');
        err.code = data?.code || 'network/error';
        err.status = error?.response?.status;
        return Promise.reject(err);
    }
);

export default api;
