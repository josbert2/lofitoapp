/**
 * Firebase Compatibility Layer
 * This file provides backward compatibility for code that still uses Firebase imports
 * All functions now use Better Auth and MySQL/Drizzle backend
 */

import { updateUser, addUser, getCurrentUser, getUserById, updateUserSettings } from './userService';

// Re-export all user service functions for backward compatibility
export { updateUser, addUser, getCurrentUser, getUserById, updateUserSettings };

// For components that import from '~/firebase/services'
export default {
    updateUser,
    addUser,
    getCurrentUser,
    getUserById,
    updateUserSettings,
};
