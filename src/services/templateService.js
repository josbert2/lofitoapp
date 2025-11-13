import api from './api';

/**
 * Template Service - Replaces Firebase template operations
 * Uses Better Auth and MySQL backend
 */

/**
 * Get all templates for current user
 */
export const getUserTemplates = async () => {
    try {
        const response = await api.get('/api/templates');
        return response.data;
    } catch (error) {
        console.error('Error fetching templates:', error);
        throw error;
    }
};

/**
 * Get public templates
 */
export const getPublicTemplates = async () => {
    try {
        const response = await api.get('/api/templates/public');
        return response.data;
    } catch (error) {
        console.error('Error fetching public templates:', error);
        throw error;
    }
};

/**
 * Get template by ID
 * @param {number} templateId - Template ID
 */
export const getTemplateById = async (templateId) => {
    try {
        const response = await api.get(`/api/templates/${templateId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching template:', error);
        throw error;
    }
};

/**
 * Create new template
 * @param {Object} templateData - Template data
 */
export const createTemplate = async (templateData) => {
    try {
        const response = await api.post('/api/templates', templateData);
        return response.data;
    } catch (error) {
        console.error('Error creating template:', error);
        throw error;
    }
};

/**
 * Update template
 * @param {number} templateId - Template ID
 * @param {Object} templateData - Template data to update
 */
export const updateTemplate = async (templateId, templateData) => {
    try {
        const response = await api.put(`/api/templates/${templateId}`, templateData);
        return response.data;
    } catch (error) {
        console.error('Error updating template:', error);
        throw error;
    }
};

/**
 * Delete template
 * @param {number} templateId - Template ID
 */
export const deleteTemplate = async (templateId) => {
    try {
        const response = await api.delete(`/api/templates/${templateId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting template:', error);
        throw error;
    }
};

/**
 * Toggle template visibility (public/private)
 * @param {number} templateId - Template ID
 * @param {boolean} isPublic - New visibility status
 */
export const toggleTemplateVisibility = async (templateId, isPublic) => {
    try {
        const response = await api.patch(`/api/templates/${templateId}`, { isPublic });
        return response.data;
    } catch (error) {
        console.error('Error toggling template visibility:', error);
        throw error;
    }
};

export default {
    getUserTemplates,
    getPublicTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplateVisibility,
};
