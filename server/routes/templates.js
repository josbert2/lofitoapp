const express = require('express');
const { db } = require('../config/database');
const { templates, user } = require('../db/schema');
const { eq, and, desc } = require('drizzle-orm');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/templates - Obtener templates (públicos o del usuario)
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { public: isPublic } = req.query;
        let result;

        if (isPublic === 'true') {
            // Templates públicos
            result = await db.query.templates.findMany({
                where: eq(templates.isPublic, true),
                with: {
                    user: {
                        columns: {
                            displayName: true
                        }
                    }
                },
                orderBy: [desc(templates.createdAt)]
            });
        } else if (req.user) {
            // Templates del usuario autenticado
            result = await db.query.templates.findMany({
                where: eq(templates.userId, req.user.userId),
                with: {
                    user: {
                        columns: {
                            displayName: true
                        }
                    }
                },
                orderBy: [desc(templates.createdAt)]
            });
        } else {
            return res.status(401).json({
                error: true,
                message: 'Authentication required'
            });
        }

        // Formatear respuesta
        const parsedTemplates = result.map(t => ({
            ...t,
            authorName: t.user?.displayName
        }));

        res.json({
            success: true,
            templates: parsedTemplates
        });

    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({
            error: true,
            message: 'Error fetching templates'
        });
    }
});

// GET /api/templates/:id - Obtener un template específico
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const template = await db.query.templates.findFirst({
            where: eq(templates.id, parseInt(id)),
            with: {
                user: {
                    columns: {
                        displayName: true
                    }
                }
            }
        });

        if (!template) {
            return res.status(404).json({
                error: true,
                message: 'Template not found'
            });
        }

        // Verificar permisos
        if (!template.isPublic && (!req.user || req.user.userId !== template.userId)) {
            return res.status(403).json({
                error: true,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            template: {
                ...template,
                authorName: template.user?.displayName
            }
        });

    } catch (error) {
        console.error('Get template error:', error);
        res.status(500).json({
            error: true,
            message: 'Error fetching template'
        });
    }
});

// POST /api/templates - Crear nuevo template (configuración de Lofi)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, setId, sceneIndex, level, effects, sceneEffect, mood, isPublic } = req.body;

        // Validaciones
        if (!name || !setId || sceneIndex === undefined || !effects || !mood) {
            return res.status(400).json({
                error: true,
                message: 'Name, setId, sceneIndex, effects, and mood are required'
            });
        }

        // Validar mood
        const validMoods = ['chill', 'jazzy', 'sleepy'];
        if (!validMoods.includes(mood)) {
            return res.status(400).json({
                error: true,
                message: 'Invalid mood. Must be: chill, jazzy, or sleepy'
            });
        }

        const [result] = await db.insert(templates).values({
            userId: req.user.userId,
            name,
            setId,
            sceneIndex,
            level: level || 50,
            effects,
            sceneEffect: sceneEffect || null,
            mood,
            isPublic: isPublic || false
        });

        res.status(201).json({
            success: true,
            message: 'Template created successfully',
            template: {
                id: result.insertId,
                userId: req.user.userId,
                name,
                setId,
                sceneIndex,
                level: level || 50,
                effects,
                sceneEffect,
                mood,
                isPublic: isPublic || false
            }
        });

    } catch (error) {
        console.error('Create template error:', error);
        res.status(500).json({
            error: true,
            message: 'Error creating template'
        });
    }
});

// PUT /api/templates/:id - Actualizar template
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, setId, sceneIndex, level, effects, sceneEffect, mood, isPublic } = req.body;

        // Verificar que el template pertenece al usuario
        const template = await db.query.templates.findFirst({
            where: eq(templates.id, parseInt(id)),
            columns: { userId: true }
        });

        if (!template) {
            return res.status(404).json({
                error: true,
                message: 'Template not found'
            });
        }

        if (template.userId !== req.user.userId) {
            return res.status(403).json({
                error: true,
                message: 'Access denied'
            });
        }

        // Construir update dinámico
        const updates = {};

        if (name !== undefined) {
            updates.name = name;
        }
        if (setId !== undefined) {
            updates.setId = setId;
        }
        if (sceneIndex !== undefined) {
            updates.sceneIndex = sceneIndex;
        }
        if (level !== undefined) {
            updates.level = level;
        }
        if (effects !== undefined) {
            updates.effects = effects;
        }
        if (sceneEffect !== undefined) {
            updates.sceneEffect = sceneEffect;
        }
        if (mood !== undefined) {
            // Validar mood
            const validMoods = ['chill', 'jazzy', 'sleepy'];
            if (!validMoods.includes(mood)) {
                return res.status(400).json({
                    error: true,
                    message: 'Invalid mood. Must be: chill, jazzy, or sleepy'
                });
            }
            updates.mood = mood;
        }
        if (isPublic !== undefined) {
            updates.isPublic = isPublic;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: true,
                message: 'No fields to update'
            });
        }

        // Actualizar template
        await db.update(templates)
            .set(updates)
            .where(eq(templates.id, parseInt(id)));

        res.json({
            success: true,
            message: 'Template updated successfully'
        });

    } catch (error) {
        console.error('Update template error:', error);
        res.status(500).json({
            error: true,
            message: 'Error updating template'
        });
    }
});

// DELETE /api/templates/:id - Eliminar template
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el template pertenece al usuario
        const template = await db.query.templates.findFirst({
            where: eq(templates.id, parseInt(id)),
            columns: { userId: true }
        });

        if (!template) {
            return res.status(404).json({
                error: true,
                message: 'Template not found'
            });
        }

        if (template.userId !== req.user.userId) {
            return res.status(403).json({
                error: true,
                message: 'Access denied'
            });
        }

        await db.delete(templates).where(eq(templates.id, parseInt(id)));

        res.json({
            success: true,
            message: 'Template deleted successfully'
        });

    } catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({
            error: true,
            message: 'Error deleting template'
        });
    }
});

module.exports = router;
