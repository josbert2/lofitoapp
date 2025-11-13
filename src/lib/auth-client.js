import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
});

// Export commonly used hooks and methods
export const {
  useSession,
  signIn,
  signUp,
  signOut,
  useActiveOrganization,
} = authClient;
