const express = require('express');
const { db } = require('../config/database');
const { user, userSettings } = require('../db/schema');
const { eq } = require('drizzle-orm');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// GET /api/users/me - Obtener datos del usuario actual
router.get('/me', async (req, res) => {
    try {
        const userData = await db.query.user.findFirst({
            where: eq(user.id, req.user.userId),
            with: {
                settings: true
            }
        });

        if (!userData) {
            return res.status(404).json({
                error: true,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: userData.id,
                email: userData.email,
                name: userData.name,
                image: userData.image,
                emailVerified: userData.emailVerified,
                createdAt: userData.createdAt,
                updatedAt: userData.updatedAt,
                settings: userData.settings || {
                    theme: 'default',
                    volume: 50,
                    autoplay: true,
                    preferences: {}
                }
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: true,
            message: 'Error fetching user data'
        });
    }
});

// PUT /api/users/me - Actualizar perfil del usuario
router.put('/me', async (req, res) => {
    try {
        const { name, image } = req.body;
        const updates = {};

        if (name !== undefined) {
            updates.name = name;
        }

        if (image !== undefined) {
            updates.image = image;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: true,
                message: 'No fields to update'
            });
        }

        // Actualizar usuario
        await db.update(user)
            .set(updates)
            .where(eq(user.id, req.user.userId));

        res.json({
            success: true,
            message: 'Profile updated successfully',
            updates
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            error: true,
            message: 'Error updating profile'
        });
    }
});

// PUT /api/users/me/settings - Actualizar configuración del usuario
router.put('/me/settings', async (req, res) => {
    try {
        const { theme, volume, autoplay, preferences } = req.body;
        const updates = {};
        const values = [];

        if (theme !== undefined) {
            updates.theme = theme;
            values.push(theme);
        }

        if (volume !== undefined) {
            updates.volume = volume;
            values.push(volume);
        }

        if (autoplay !== undefined) {
            updates.autoplay = autoplay;
            values.push(autoplay);
        }

        if (preferences !== undefined) {
            updates.preferences = JSON.stringify(preferences);
            values.push(JSON.stringify(preferences));
        }

        if (values.length === 0) {
            return res.status(400).json({
                error: true,
                message: 'No settings to update'
            });
        }

        // Actualizar settings
        await db.update(userSettings)
            .set(updates)
            .where(eq(userSettings.userId, req.user.userId));

        res.json({
            success: true,
            message: 'Settings updated successfully',
            updates
        });

    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            error: true,
            message: 'Error updating settings'
        });
    }
});

// Better Auth maneja cambio de contraseña y eliminación de cuenta
// Usa las rutas de Better Auth: /api/auth/change-password y /api/auth/delete-account

module.exports = router;
