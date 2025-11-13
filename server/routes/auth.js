const express = require('express');
const { auth } = require('../lib/auth');
const { db } = require('../config/database');
const { userSettings } = require('../db/schema');

const router = express.Router();

// Better Auth maneja todas las rutas de autenticación automáticamente
// Montamos el handler de Better Auth en /api/auth/*
router.all('/*', async (req, res) => {
    return auth.handler(req, res);
});

module.exports = router;
