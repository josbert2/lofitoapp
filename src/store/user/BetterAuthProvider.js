import { createContext, useEffect, useReducer, useState } from 'react';
import { authClient } from '~/lib/auth-client';
import LoadingPage from '~/pages/LoadingPage/LoadingPage';
import { logger } from '~/utils/logger';
import reducer, { INITIAL_STATE } from './reducer';
import { forceUpdateMetaData } from './actions';
import axios from 'axios';

const AuthContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userState, userDispatch] = useReducer(logger(reducer), INITIAL_STATE);
    const [session, setSession] = useState(null);

    // Check session on mount and subscribe to changes
    useEffect(() => {
        let unsubscribed = false;

        const checkSession = async () => {
            try {
                const { data: sessionData } = await authClient.getSession();
                
                if (!unsubscribed) {
                    if (sessionData?.user) {
                        setCurrentUser(sessionData.user);
                        setSession(sessionData.session);
                        
                        // Fetch additional user metadata from your API
                        try {
                            const response = await axios.get(`${API_URL}/api/users/${sessionData.user.id}`, {
                                headers: {
                                    Authorization: `Bearer ${sessionData.session.token}`,
                                },
                            });
                            userDispatch(forceUpdateMetaData({ data: response.data }));
                        } catch (error) {
                            console.error('Error fetching user metadata:', error);
                        }
                    } else {
                        setCurrentUser(null);
                        setSession(null);
                    }
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error checking session:', error);
                if (!unsubscribed) {
                    setCurrentUser(null);
                    setSession(null);
                    setLoading(false);
                }
            }
        };

        checkSession();

        // Poll for session changes every 30 seconds
        const interval = setInterval(checkSession, 30000);

        return () => {
            unsubscribed = true;
            clearInterval(interval);
        };
    }, []);

    const createUser = async (email, password, displayName = '') => {
        try {
            const response = await authClient.signUp.email({
                email,
                password,
                name: displayName || email.split('@')[0],
            });

            if (response.error) {
                throw new Error(response.error.message || 'Failed to create user');
            }

            // Update current user after successful signup
            const { data: sessionData } = await authClient.getSession();
            if (sessionData?.user) {
                setCurrentUser(sessionData.user);
                setSession(sessionData.session);
            }

            return response;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    };

    const login = async (email, password) => {
        try {
            const response = await authClient.signIn.email({
                email,
                password,
            });

            if (response.error) {
                throw new Error(response.error.message || 'Failed to login');
            }

            // Update current user after successful login
            const { data: sessionData } = await authClient.getSession();
            if (sessionData?.user) {
                setCurrentUser(sessionData.user);
                setSession(sessionData.session);
            }

            return response;
        } catch (error) {
            console.error('Error logging in:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await authClient.signOut();
            setCurrentUser(null);
            setSession(null);
            userDispatch(forceUpdateMetaData({ data: null }));
        } catch (error) {
            console.error('Error logging out:', error);
            throw error;
        }
    };

    const changeProfile = async (displayName) => {
        try {
            if (!currentUser) {
                throw new Error('No user logged in');
            }

            const response = await axios.patch(
                `${API_URL}/api/users/${currentUser.id}`,
                { name: displayName },
                {
                    headers: {
                        Authorization: `Bearer ${session?.token}`,
                    },
                }
            );

            // Update local user state
            setCurrentUser({ ...currentUser, name: displayName });
            return response.data;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    };

    const changeEmail = async (email) => {
        try {
            if (!currentUser) {
                throw new Error('No user logged in');
            }

            const response = await axios.patch(
                `${API_URL}/api/users/${currentUser.id}`,
                { email },
                {
                    headers: {
                        Authorization: `Bearer ${session?.token}`,
                    },
                }
            );

            // Update local user state
            setCurrentUser({ ...currentUser, email });
            return response.data;
        } catch (error) {
            console.error('Error updating email:', error);
            throw error;
        }
    };

    const changePassword = async (currentPassword, newPassword) => {
        try {
            if (!currentUser) {
                throw new Error('No user logged in');
            }

            const response = await axios.post(
                `${API_URL}/api/auth/change-password`,
                {
                    currentPassword,
                    newPassword,
                },
                {
                    headers: {
                        Authorization: `Bearer ${session?.token}`,
                    },
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    };

    const reauthenticate = async (password) => {
        try {
            if (!currentUser) {
                throw new Error('No user logged in');
            }

            // Re-login with current credentials
            return await login(currentUser.email, password);
        } catch (error) {
            console.error('Error reauthenticating:', error);
            throw error;
        }
    };

    const resetPassword = async (email) => {
        try {
            const response = await axios.post(`${API_URL}/api/auth/forgot-password`, {
                email,
            });

            return response.data;
        } catch (error) {
            console.error('Error resetting password:', error);
            throw error;
        }
    };

    const value = {
        createUser,
        currentUser,
        session,
        login,
        logout,
        changeProfile,
        changeEmail,
        changePassword,
        reauthenticate,
        resetPassword,
        user: [userState, userDispatch],
        isAuthenticated: !!currentUser,
    };

    return <AuthContext.Provider value={value}>{loading ? <LoadingPage /> : children}</AuthContext.Provider>;
}

export default AuthProvider;
export { AuthContext };
