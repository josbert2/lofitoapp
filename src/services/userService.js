import api from './api';

/**
 * User Service - Replaces Firebase user operations
 * Uses Better Auth and MySQL backend
 */

/**
 * Get current user data
 */
export const getCurrentUser = async () => {
    try {
        const response = await api.get('/api/users/me');
        return response.data;
    } catch (error) {
        console.error('Error fetching current user:', error);
        throw error;
    }
};

/**
 * Update user profile
 * @param {Object} userData - User data to update (name, image)
 */
export const updateUser = async (userData) => {
    try {
        const response = await api.put('/api/users/me', userData);
        return response.data;
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};

/**
 * Add/Create user (for backward compatibility with Firebase code)
 * Note: User creation is now handled by Better Auth sign-up
 * This function is kept for compatibility but delegates to Better Auth
 */
export const addUser = async (userId, userData) => {
    console.warn('addUser is deprecated. User creation is handled by Better Auth sign-up.');
    // If you need to update user data after signup, use updateUser instead
    return updateUser(userData);
};

/**
 * Get user by ID
 * @param {string} userId - User ID
 */
export const getUserById = async (userId) => {
    try {
        const response = await api.get(`/api/users/${userId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching user by ID:', error);
        throw error;
    }
};

/**
 * Update user settings
 * @param {Object} settings - Settings to update (theme, volume, autoplay, preferences)
 */
export const updateUserSettings = async (settings) => {
    try {
        const response = await api.put('/api/users/me/settings', settings);
        return response.data;
    } catch (error) {
        console.error('Error updating user settings:', error);
        throw error;
    }
};

/**
 * Get user settings
 */
export const getUserSettings = async () => {
    try {
        const response = await api.get('/api/users/me');
        return response.data.settings || {};
    } catch (error) {
        console.error('Error fetching user settings:', error);
        throw error;
    }
};

// Export for backward compatibility with Firebase imports
export { updateUser as default };
