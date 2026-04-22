import { createContext, useCallback, useEffect, useReducer, useState } from 'react';

import * as authApi from '~/api/auth';
import { getToken, setToken } from '~/api/client';
import LoadingPage from '~/pages/LoadingPage/LoadingPage';
import { logger } from '~/utils/logger';
import reducer, { INITIAL_STATE } from './reducer';
import { forceUpdateMetaData } from './actions';
import { subscribeUserData } from '~/firebase/services';

const AuthContext = createContext();

function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState();
    const [loading, setLoading] = useState(true);
    const [userState, userDispatch] = useReducer(logger(reducer), INITIAL_STATE);

    const applyAuth = useCallback((payload) => {
        if (!payload) {
            setCurrentUser(null);
            userDispatch(forceUpdateMetaData({ data: {} }));
            return;
        }
        setCurrentUser(payload.user);
        userDispatch(forceUpdateMetaData({ data: payload.data }));
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const token = getToken();
            if (!token) {
                if (!cancelled) {
                    setCurrentUser(null);
                    setLoading(false);
                }
                return;
            }
            try {
                const data = await authApi.me();
                if (!cancelled) applyAuth(data);
            } catch {
                setToken(null);
                if (!cancelled) setCurrentUser(null);
            } finally {
                if (!cancelled) setTimeout(() => setLoading(false), 400);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [applyAuth]);

    useEffect(() => {
        return subscribeUserData((data) => {
            userDispatch(forceUpdateMetaData({ data }));
        });
    }, []);

    const createUser = async (email, password) => {
        const payload = await authApi.signup({ email, password });
        applyAuth(payload);
        return { user: payload.user };
    };

    const login = async (email, password) => {
        const payload = await authApi.login({ email, password });
        applyAuth(payload);
        return { user: payload.user };
    };

    const logout = async () => {
        await authApi.logout();
        applyAuth(null);
    };

    const changeProfile = async (username) => {
        const payload = await authApi.updateProfile({ displayName: username });
        applyAuth(payload);
        return payload.user;
    };

    const changeEmail = async (email) => {
        const payload = await authApi.updateEmail({ email });
        applyAuth(payload);
        return payload.user;
    };

    const changePassword = async (password) => {
        await authApi.updatePassword({ password });
    };

    const reauthenticate = async (password) => {
        await authApi.reauthenticate({ password });
    };

    const resetPassword = async (email) => {
        await authApi.resetPassword({ email });
    };

    const value = {
        createUser,
        currentUser,
        login,
        logout,
        changeProfile,
        changeEmail,
        changePassword,
        reauthenticate,
        resetPassword,
        user: [userState, userDispatch],
    };
    return <AuthContext.Provider value={value}>{loading ? <LoadingPage /> : children}</AuthContext.Provider>;
}

export default AuthProvider;
export { AuthContext };
