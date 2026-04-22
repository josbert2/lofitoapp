import { replaceTemplates } from '~/api/auth';

const listeners = new Set();

export const subscribeUserData = (fn) => {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
};

const notify = (data) => {
    listeners.forEach((fn) => fn(data));
};

export const getUserData = async () => ({});

export const addUSer = async () => {
    // no-op: signup endpoint already creates the user row server-side
};

export const updateUser = async (_uid, data) => {
    if (Array.isArray(data?.templates)) {
        const { templates } = await replaceTemplates(data.templates);
        const next = { ...data, templates };
        notify(next);
        return next;
    }
    notify(data);
    return data;
};
