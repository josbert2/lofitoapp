const { auth } = require('../lib/auth');

// Middleware para verificar la sesión de Better Auth
const authenticateToken = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({
                error: true,
                message: 'Authentication required'
            });
        }

        // Agregar usuario a la request
        req.user = {
            userId: session.user.id,
            email: session.user.email,
            name: session.user.name
        };
        req.session = session;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            error: true,
            message: 'Invalid or expired session'
        });
    }
};

// Middleware opcional - no falla si no hay sesión
const optionalAuth = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (session) {
            req.user = {
                userId: session.user.id,
                email: session.user.email,
                name: session.user.name
            };
            req.session = session;
        }
    } catch (error) {
        // Silently fail for optional auth
    }

    next();
};

module.exports = {
    authenticateToken,
    optionalAuth
};
