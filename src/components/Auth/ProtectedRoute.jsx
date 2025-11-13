import { Navigate } from 'react-router-dom';
import { useAuth } from '~/hooks/useAuth';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
function ProtectedRoute({ children }) {
    const { isAuthenticated, currentUser } = useAuth();

    if (!isAuthenticated || !currentUser) {
        // Redirect to login page if not authenticated
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;
