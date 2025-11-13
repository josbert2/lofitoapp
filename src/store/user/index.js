// Using Better Auth instead of Firebase
import { AuthContext } from './BetterAuthProvider';
import * as selectors from './selectors';

export { AuthContext };
export { default as AuthProvider } from './BetterAuthProvider';
export * from './actions';
export const UserSelect = selectors;

// Legacy Firebase AuthProvider (deprecated)
// export { default as FirebaseAuthProvider } from './AuthProvider';
