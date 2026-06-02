import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import os from 'node:os';
import path from 'node:path';
import { writeFile, readFile, mkdtemp, rm } from 'node:fs/promises';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2, r2Enabled, R2_BUCKET_NAME, r2PublicUrl } from './r2.js';
import { compressVideo, makeThumbnail } from './media.js';

const {
    PORT = 3001,
    DB_HOST = '127.0.0.1',
    DB_PORT = 3318,
    DB_USER = 'lofiuser',
    DB_PASSWORD = 'lofipass123',
    DB_NAME = 'lofitoapp',
    JWT_SECRET = 'dev-secret-change-me',
    JWT_EXPIRES_IN = '7d',
    CORS_ORIGIN = 'http://localhost:3020',
} = process.env;

const pool = mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
});

const app = express();
app.use(cors({ origin: CORS_ORIGIN.split(','), credentials: true }));
app.use(express.json());

// --- helpers ----------------------------------------------------------------

const httpError = (status, code, message) => {
    const err = new Error(message || code);
    err.status = status;
    err.code = code;
    return err;
};

const signToken = (userId) => jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const requireAuth = async (req, _res, next) => {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token) throw httpError(401, 'auth/unauthenticated');
        const payload = jwt.verify(token, JWT_SECRET);
        req.userId = payload.sub;
        next();
    } catch (e) {
        if (e.name === 'TokenExpiredError') return next(httpError(401, 'auth/requires-recent-login'));
        if (e.name === 'JsonWebTokenError') return next(httpError(401, 'auth/unauthenticated'));
        next(e);
    }
};

const publicUser = (u) => ({
    uid: u.id,
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
    emailVerified: !!u.emailVerified,
    isAdmin: !!u.is_admin,
});

const requireAdmin = async (req, _res, next) => {
    try {
        const [rows] = await pool.query('SELECT is_admin FROM users WHERE id = :id', { id: req.userId });
        if (!rows.length || !rows[0].is_admin) throw httpError(403, 'auth/forbidden');
        next();
    } catch (e) {
        next(e);
    }
};

// JSON columns vienen ya parseadas desde mysql2, pero por las dudas toleramos string.
const jsonCol = (v, fallback) => {
    if (v == null) return fallback;
    if (typeof v === 'string') {
        try {
            return JSON.parse(v);
        } catch {
            return fallback;
        }
    }
    return v;
};

const rowToCatalogScene = (r) => ({
    id: r.id,
    sceneKey: r.sceneKey,
    thumbnail: r.thumbnail,
    wallpaper: r.wallpaper,
    variants: jsonCol(r.variants, {}),
    actions: jsonCol(r.actions, []),
    isPublic: !!r.is_public,
    sortOrder: r.sort_order,
});

const rowToCatalogSet = (r, scenes) => ({
    _id: r.slug,
    id: r.id,
    slug: r.slug,
    name: r.name,
    thumbnail: r.thumbnail,
    effects: jsonCol(r.effects, []),
    premium: !!r.premium,
    isPublic: !!r.is_public,
    sortOrder: r.sort_order,
    scenes: scenes || [],
});

const rowToCatalogTrack = (r) => ({
    id: r.id,
    mood: r.mood,
    title: r.title,
    artist: r.artist,
    url: r.url,
    isPublic: !!r.is_public,
    sortOrder: r.sort_order,
});

const rowToTemplate = (r) => ({
    _id: String(r.id),
    id: String(r.id),
    name: r.name,
    setId: r.setId,
    sceneIndex: r.sceneIndex,
    level: r.level,
    effects: typeof r.effects === 'string' ? JSON.parse(r.effects) : r.effects,
    sceneEffect: r.sceneEffect,
    mood: r.mood,
    isPublic: !!r.isPublic,
    createdAt: r.createdAt,
    modifiedAt: r.modifiedAt,
});

const loadUserData = async (userId) => {
    const [users] = await pool.query('SELECT * FROM users WHERE id = :id', { id: userId });
    if (!users.length) throw httpError(404, 'auth/user-not-found');
    const [templates] = await pool.query(
        'SELECT * FROM templates WHERE userId = :id ORDER BY createdAt DESC',
        { id: userId }
    );
    return {
        user: publicUser(users[0]),
        data: {
            ...publicUser(users[0]),
            templates: templates.map(rowToTemplate),
        },
    };
};

const validEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// --- routes -----------------------------------------------------------------

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// signup
app.post('/api/auth/signup', async (req, res, next) => {
    try {
        const { email, password, displayName = null, photoURL = null } = req.body || {};
        if (!validEmail(email)) throw httpError(400, 'auth/invalid-email');
        if (typeof password !== 'string' || password.length < 8) throw httpError(400, 'auth/weak-password');

        const [existing] = await pool.query('SELECT id FROM users WHERE email = :email', { email });
        if (existing.length) throw httpError(409, 'auth/email-already-in-use');

        const id = crypto.randomUUID();
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            `INSERT INTO users (id, email, password, displayName, photoURL)
             VALUES (:id, :email, :password, :displayName, :photoURL)`,
            { id, email, password: hash, displayName, photoURL }
        );
        const { user, data } = await loadUserData(id);
        const token = signToken(id);
        res.status(201).json({ token, user, data });
    } catch (e) {
        next(e);
    }
});

// login
app.post('/api/auth/login', async (req, res, next) => {
    try {
        const { email, password } = req.body || {};
        if (!validEmail(email)) throw httpError(400, 'auth/invalid-email');
        if (typeof password !== 'string') throw httpError(400, 'auth/wrong-password');

        const [rows] = await pool.query('SELECT * FROM users WHERE email = :email', { email });
        if (!rows.length) throw httpError(401, 'auth/user-not-found');
        const ok = await bcrypt.compare(password, rows[0].password);
        if (!ok) throw httpError(401, 'auth/wrong-password');

        const { user, data } = await loadUserData(rows[0].id);
        const token = signToken(rows[0].id);
        res.json({ token, user, data });
    } catch (e) {
        next(e);
    }
});

// me (fetch user + data)
app.get('/api/auth/me', requireAuth, async (req, res, next) => {
    try {
        const { user, data } = await loadUserData(req.userId);
        res.json({ user, data });
    } catch (e) {
        next(e);
    }
});

// logout — stateless JWT; just a no-op the client can call
app.post('/api/auth/logout', requireAuth, (_req, res) => res.json({ ok: true }));

// change displayName
app.patch('/api/auth/profile', requireAuth, async (req, res, next) => {
    try {
        const { displayName = null, photoURL } = req.body || {};
        const fields = ['displayName = :displayName'];
        const params = { id: req.userId, displayName };
        if (photoURL !== undefined) {
            fields.push('photoURL = :photoURL');
            params.photoURL = photoURL;
        }
        await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = :id`, params);
        const { user, data } = await loadUserData(req.userId);
        res.json({ user, data });
    } catch (e) {
        next(e);
    }
});

// change email
app.patch('/api/auth/email', requireAuth, async (req, res, next) => {
    try {
        const { email } = req.body || {};
        if (!validEmail(email)) throw httpError(400, 'auth/invalid-email');

        const [dupe] = await pool.query('SELECT id FROM users WHERE email = :email AND id <> :id', {
            email,
            id: req.userId,
        });
        if (dupe.length) throw httpError(409, 'auth/email-already-in-use');

        await pool.query('UPDATE users SET email = :email WHERE id = :id', { email, id: req.userId });
        const { user, data } = await loadUserData(req.userId);
        res.json({ user, data });
    } catch (e) {
        next(e);
    }
});

// reauthenticate (verify current password)
app.post('/api/auth/reauthenticate', requireAuth, async (req, res, next) => {
    try {
        const { password } = req.body || {};
        const [rows] = await pool.query('SELECT password FROM users WHERE id = :id', { id: req.userId });
        if (!rows.length) throw httpError(404, 'auth/user-not-found');
        const ok = await bcrypt.compare(password || '', rows[0].password);
        if (!ok) throw httpError(401, 'auth/wrong-password');
        res.json({ ok: true });
    } catch (e) {
        next(e);
    }
});

// change password
app.patch('/api/auth/password', requireAuth, async (req, res, next) => {
    try {
        const { password } = req.body || {};
        if (typeof password !== 'string' || password.length < 8) throw httpError(400, 'auth/weak-password');
        const hash = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password = :password WHERE id = :id', {
            password: hash,
            id: req.userId,
        });
        res.json({ ok: true });
    } catch (e) {
        next(e);
    }
});

// reset password (stub — logs a reset token; no email transport configured)
app.post('/api/auth/reset-password', async (req, res, next) => {
    try {
        const { email } = req.body || {};
        if (!validEmail(email)) throw httpError(400, 'auth/invalid-email');
        const [rows] = await pool.query('SELECT id FROM users WHERE email = :email', { email });
        if (rows.length) {
            const resetToken = jwt.sign({ sub: rows[0].id, purpose: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
            console.log(`[reset-password] ${email} → token: ${resetToken}`);
        }
        res.json({ ok: true });
    } catch (e) {
        next(e);
    }
});

// templates — list
app.get('/api/templates', requireAuth, async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM templates WHERE userId = :id ORDER BY createdAt DESC',
            { id: req.userId }
        );
        res.json({ templates: rows.map(rowToTemplate) });
    } catch (e) {
        next(e);
    }
});

// templates — replace full list (mirrors Firebase's updateUser(uid, { templates }))
app.put('/api/templates', requireAuth, async (req, res, next) => {
    try {
        const { templates = [] } = req.body || {};
        if (!Array.isArray(templates)) throw httpError(400, 'invalid/templates');

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [existing] = await conn.query('SELECT id FROM templates WHERE userId = :id', { id: req.userId });
            const incomingIds = new Set(templates.filter((t) => t?.id || t?._id).map((t) => String(t.id ?? t._id)));
            const toDelete = existing.filter((r) => !incomingIds.has(String(r.id))).map((r) => r.id);

            if (toDelete.length) {
                await conn.query('DELETE FROM templates WHERE userId = ? AND id IN (?)', [req.userId, toDelete]);
            }

            for (const t of templates) {
                const tid = t?.id ?? t?._id;
                const numericTid = tid != null && /^\d+$/.test(String(tid)) ? Number(tid) : null;
                const row = {
                    userId: req.userId,
                    name: String(t.name ?? ''),
                    setId: String(t.setId ?? ''),
                    sceneIndex: Number.isFinite(t.sceneIndex) ? t.sceneIndex : 0,
                    level: Number.isFinite(t.level) ? t.level : 50,
                    effects: JSON.stringify(Array.isArray(t.effects) ? t.effects : []),
                    sceneEffect: t.sceneEffect ?? null,
                    mood: String(t.mood ?? 'chill'),
                };
                if (numericTid) {
                    await conn.query(
                        `UPDATE templates
                         SET name = :name, setId = :setId, sceneIndex = :sceneIndex,
                             level = :level, effects = :effects, sceneEffect = :sceneEffect, mood = :mood
                         WHERE id = :id AND userId = :userId`,
                        { ...row, id: numericTid }
                    );
                } else {
                    await conn.query(
                        `INSERT INTO templates (userId, name, setId, sceneIndex, level, effects, sceneEffect, mood)
                         VALUES (:userId, :name, :setId, :sceneIndex, :level, :effects, :sceneEffect, :mood)`,
                        row
                    );
                }
            }
            await conn.commit();
        } catch (txErr) {
            await conn.rollback();
            throw txErr;
        } finally {
            conn.release();
        }

        const [rows] = await pool.query(
            'SELECT * FROM templates WHERE userId = :id ORDER BY createdAt DESC',
            { id: req.userId }
        );
        res.json({ templates: rows.map(rowToTemplate) });
    } catch (e) {
        next(e);
    }
});

// --- notes ------------------------------------------------------------------

const rowToNote = (r) => ({
    id: r.id,
    title: r.title || '',
    content: r.content || '',
    color: r.color || 'default',
    pinned: !!r.pinned,
    createdAt: r.createdAt,
    modifiedAt: r.modifiedAt,
});

app.get('/api/notes', requireAuth, async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM notes WHERE userId = :id ORDER BY pinned DESC, modifiedAt DESC',
            { id: req.userId }
        );
        res.json({ notes: rows.map(rowToNote) });
    } catch (e) {
        next(e);
    }
});

app.post('/api/notes', requireAuth, async (req, res, next) => {
    try {
        const { title = '', content = '', color = 'default', pinned = false } = req.body || {};
        const [result] = await pool.query(
            `INSERT INTO notes (userId, title, content, color, pinned)
             VALUES (:userId, :title, :content, :color, :pinned)`,
            { userId: req.userId, title, content, color, pinned: pinned ? 1 : 0 }
        );
        const [rows] = await pool.query('SELECT * FROM notes WHERE id = :id', { id: result.insertId });
        res.status(201).json({ note: rowToNote(rows[0]) });
    } catch (e) {
        next(e);
    }
});

app.patch('/api/notes/:id', requireAuth, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) throw httpError(400, 'notes/invalid-id');

        const sets = [];
        const params = { id, userId: req.userId };
        for (const [key, col] of [
            ['title', 'title'],
            ['content', 'content'],
            ['color', 'color'],
        ]) {
            if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
                sets.push(`${col} = :${key}`);
                params[key] = req.body[key];
            }
        }
        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'pinned')) {
            sets.push('pinned = :pinned');
            params.pinned = req.body.pinned ? 1 : 0;
        }
        if (!sets.length) throw httpError(400, 'notes/no-fields');

        const [result] = await pool.query(
            `UPDATE notes SET ${sets.join(', ')} WHERE id = :id AND userId = :userId`,
            params
        );
        if (!result.affectedRows) throw httpError(404, 'notes/not-found');
        const [rows] = await pool.query('SELECT * FROM notes WHERE id = :id', { id });
        res.json({ note: rowToNote(rows[0]) });
    } catch (e) {
        next(e);
    }
});

app.delete('/api/notes/:id', requireAuth, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) throw httpError(400, 'notes/invalid-id');
        const [result] = await pool.query(
            'DELETE FROM notes WHERE id = :id AND userId = :userId',
            { id, userId: req.userId }
        );
        if (!result.affectedRows) throw httpError(404, 'notes/not-found');
        res.json({ ok: true });
    } catch (e) {
        next(e);
    }
});

// --- catálogo (público) -----------------------------------------------------

// Catálogo publicado, en la misma forma que consumen los archivos estáticos del
// front: { sets: [{ _id, name, thumbnail, effects, premium, scenes: [...] }], tracks: { chill, jazzy, sleepy } }
app.get('/api/catalog', async (_req, res, next) => {
    try {
        const [setRows] = await pool.query(
            'SELECT * FROM catalog_sets WHERE is_public = 1 ORDER BY sort_order ASC, id ASC'
        );
        const [sceneRows] = await pool.query(
            'SELECT * FROM catalog_scenes WHERE is_public = 1 ORDER BY sort_order ASC, id ASC'
        );
        const [trackRows] = await pool.query(
            'SELECT * FROM catalog_tracks WHERE is_public = 1 ORDER BY sort_order ASC, id ASC'
        );

        const scenesBySet = new Map();
        for (const r of sceneRows) {
            if (!scenesBySet.has(r.setId)) scenesBySet.set(r.setId, []);
            scenesBySet.get(r.setId).push(rowToCatalogScene(r));
        }
        // un set sin escenas públicas no sirve para el player → se omite
        const sets = setRows
            .map((r) => rowToCatalogSet(r, scenesBySet.get(r.id)))
            .filter((s) => s.scenes.length > 0);

        const tracks = { chill: [], jazzy: [], sleepy: [] };
        for (const r of trackRows) {
            if (!tracks[r.mood]) tracks[r.mood] = [];
            tracks[r.mood].push({ url: r.url, title: r.title, artist: r.artist });
        }

        // slugs gestionados en la DB (publicados o no). El front usa esto para
        // decidir qué sets estáticos seguir mostrando: si un slug está acá,
        // manda la DB (incluido ocultarlo); si no, se muestra el estático.
        const [allSlugRows] = await pool.query('SELECT slug FROM catalog_sets');
        const managedSlugs = allSlugRows.map((r) => r.slug);

        res.json({ sets, tracks, managedSlugs });
    } catch (e) {
        next(e);
    }
});

// --- catálogo (admin) -------------------------------------------------------

// Catálogo completo (incluye no publicados) para administrar.
app.get('/api/admin/catalog', requireAuth, requireAdmin, async (_req, res, next) => {
    try {
        const [setRows] = await pool.query('SELECT * FROM catalog_sets ORDER BY sort_order ASC, id ASC');
        const [sceneRows] = await pool.query('SELECT * FROM catalog_scenes ORDER BY sort_order ASC, id ASC');
        const [trackRows] = await pool.query('SELECT * FROM catalog_tracks ORDER BY mood ASC, sort_order ASC, id ASC');

        const scenesBySet = new Map();
        for (const r of sceneRows) {
            if (!scenesBySet.has(r.setId)) scenesBySet.set(r.setId, []);
            scenesBySet.get(r.setId).push(rowToCatalogScene(r));
        }
        const sets = setRows.map((r) => rowToCatalogSet(r, scenesBySet.get(r.id)));
        const tracks = trackRows.map(rowToCatalogTrack);
        res.json({ sets, tracks });
    } catch (e) {
        next(e);
    }
});

// Importar el catálogo estático actual del front (reset completo). El front
// manda { sets: [...sets.data], tracks: playlistsBase }. Reemplaza todo.
app.post('/api/admin/seed', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const { sets = [], tracks = {} } = req.body || {};
        if (!Array.isArray(sets)) throw httpError(400, 'catalog/invalid-sets');

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            await conn.query('DELETE FROM catalog_tracks');
            await conn.query('DELETE FROM catalog_scenes');
            await conn.query('DELETE FROM catalog_sets');

            let setOrder = 0;
            for (const s of sets) {
                const slug = String(s._id ?? s.slug ?? `set-${setOrder}`);
                const [r] = await conn.query(
                    `INSERT INTO catalog_sets (slug, name, thumbnail, effects, premium, is_public, sort_order)
                     VALUES (:slug, :name, :thumbnail, :effects, :premium, 1, :sort)`,
                    {
                        slug,
                        name: String(s.name ?? slug),
                        thumbnail: s.thumbnail ?? null,
                        effects: JSON.stringify(Array.isArray(s.effects) ? s.effects : []),
                        premium: s.premium ? 1 : 0,
                        sort: setOrder++,
                    }
                );
                const setId = r.insertId;
                let sceneOrder = 0;
                for (const sc of Array.isArray(s.scenes) ? s.scenes : []) {
                    await conn.query(
                        `INSERT INTO catalog_scenes (setId, sceneKey, thumbnail, wallpaper, variants, actions, is_public, sort_order)
                         VALUES (:setId, :sceneKey, :thumbnail, :wallpaper, :variants, :actions, 1, :sort)`,
                        {
                            setId,
                            sceneKey: String(sc.sceneKey ?? sc.key ?? `${slug}-${sceneOrder}`),
                            thumbnail: sc.thumbnail ?? null,
                            wallpaper: sc.wallpaper ?? null,
                            variants: JSON.stringify(sc.variants ?? {}),
                            actions: JSON.stringify(Array.isArray(sc.actions) ? sc.actions : []),
                            sort: sceneOrder++,
                        }
                    );
                }
            }

            for (const [mood, list] of Object.entries(tracks)) {
                if (!Array.isArray(list)) continue;
                let order = 0;
                for (const t of list) {
                    if (!t || !t.url) continue;
                    await conn.query(
                        `INSERT INTO catalog_tracks (mood, title, artist, url, is_public, sort_order)
                         VALUES (:mood, :title, :artist, :url, 1, :sort)`,
                        {
                            mood: String(mood),
                            title: t.title ?? null,
                            artist: t.artist ?? null,
                            url: String(t.url),
                            sort: order++,
                        }
                    );
                }
            }
            await conn.commit();
        } catch (txErr) {
            await conn.rollback();
            throw txErr;
        } finally {
            conn.release();
        }

        const [counts] = await pool.query(
            `SELECT
                (SELECT COUNT(*) FROM catalog_sets) AS sets,
                (SELECT COUNT(*) FROM catalog_scenes) AS scenes,
                (SELECT COUNT(*) FROM catalog_tracks) AS tracks`
        );
        res.json({ ok: true, counts: counts[0] });
    } catch (e) {
        next(e);
    }
});

// helper: arma SET parcial para PATCH a partir de un mapa campo→columna
const buildPatch = (body, map) => {
    const sets = [];
    const params = {};
    for (const [key, col] of Object.entries(map)) {
        if (Object.prototype.hasOwnProperty.call(body || {}, key)) {
            let val = body[key];
            if (col.json) val = JSON.stringify(val ?? (col.array ? [] : {}));
            else if (col.bool) val = val ? 1 : 0;
            sets.push(`${col.name} = :${key}`);
            params[key] = val;
        }
    }
    return { sets, params };
};

const SET_MAP = {
    slug: { name: 'slug' },
    name: { name: 'name' },
    thumbnail: { name: 'thumbnail' },
    effects: { name: 'effects', json: true, array: true },
    premium: { name: 'premium', bool: true },
    isPublic: { name: 'is_public', bool: true },
    sortOrder: { name: 'sort_order' },
};
const SCENE_MAP = {
    setId: { name: 'setId' },
    sceneKey: { name: 'sceneKey' },
    thumbnail: { name: 'thumbnail' },
    wallpaper: { name: 'wallpaper' },
    variants: { name: 'variants', json: true },
    actions: { name: 'actions', json: true, array: true },
    isPublic: { name: 'is_public', bool: true },
    sortOrder: { name: 'sort_order' },
};
const TRACK_MAP = {
    mood: { name: 'mood' },
    title: { name: 'title' },
    artist: { name: 'artist' },
    url: { name: 'url' },
    isPublic: { name: 'is_public', bool: true },
    sortOrder: { name: 'sort_order' },
};

// --- sets CRUD ---
app.post('/api/admin/sets', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const b = req.body || {};
        if (!b.slug || !b.name) throw httpError(400, 'catalog/missing-fields');
        const [r] = await pool.query(
            `INSERT INTO catalog_sets (slug, name, thumbnail, effects, premium, is_public, sort_order)
             VALUES (:slug, :name, :thumbnail, :effects, :premium, :isPublic, :sortOrder)`,
            {
                slug: String(b.slug),
                name: String(b.name),
                thumbnail: b.thumbnail ?? null,
                effects: JSON.stringify(Array.isArray(b.effects) ? b.effects : []),
                premium: b.premium ? 1 : 0,
                isPublic: b.isPublic ? 1 : 0,
                sortOrder: Number.isFinite(b.sortOrder) ? b.sortOrder : 0,
            }
        );
        const [rows] = await pool.query('SELECT * FROM catalog_sets WHERE id = :id', { id: r.insertId });
        res.status(201).json({ set: rowToCatalogSet(rows[0], []) });
    } catch (e) {
        next(e);
    }
});

app.patch('/api/admin/sets/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) throw httpError(400, 'catalog/invalid-id');
        const { sets, params } = buildPatch(req.body, SET_MAP);
        if (!sets.length) throw httpError(400, 'catalog/no-fields');
        const [r] = await pool.query(`UPDATE catalog_sets SET ${sets.join(', ')} WHERE id = :id`, { ...params, id });
        if (!r.affectedRows) throw httpError(404, 'catalog/not-found');
        const [rows] = await pool.query('SELECT * FROM catalog_sets WHERE id = :id', { id });
        res.json({ set: rowToCatalogSet(rows[0], []) });
    } catch (e) {
        next(e);
    }
});

app.delete('/api/admin/sets/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) throw httpError(400, 'catalog/invalid-id');
        const [r] = await pool.query('DELETE FROM catalog_sets WHERE id = :id', { id });
        if (!r.affectedRows) throw httpError(404, 'catalog/not-found');
        res.json({ ok: true });
    } catch (e) {
        next(e);
    }
});

// --- scenes CRUD ---
app.post('/api/admin/scenes', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const b = req.body || {};
        if (!Number.isFinite(Number(b.setId)) || !b.sceneKey) throw httpError(400, 'catalog/missing-fields');
        const [r] = await pool.query(
            `INSERT INTO catalog_scenes (setId, sceneKey, thumbnail, wallpaper, variants, actions, is_public, sort_order)
             VALUES (:setId, :sceneKey, :thumbnail, :wallpaper, :variants, :actions, :isPublic, :sortOrder)`,
            {
                setId: Number(b.setId),
                sceneKey: String(b.sceneKey),
                thumbnail: b.thumbnail ?? null,
                wallpaper: b.wallpaper ?? null,
                variants: JSON.stringify(b.variants ?? {}),
                actions: JSON.stringify(Array.isArray(b.actions) ? b.actions : []),
                isPublic: b.isPublic ? 1 : 0,
                sortOrder: Number.isFinite(b.sortOrder) ? b.sortOrder : 0,
            }
        );
        const [rows] = await pool.query('SELECT * FROM catalog_scenes WHERE id = :id', { id: r.insertId });
        res.status(201).json({ scene: rowToCatalogScene(rows[0]) });
    } catch (e) {
        next(e);
    }
});

app.patch('/api/admin/scenes/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) throw httpError(400, 'catalog/invalid-id');
        const { sets, params } = buildPatch(req.body, SCENE_MAP);
        if (!sets.length) throw httpError(400, 'catalog/no-fields');
        const [r] = await pool.query(`UPDATE catalog_scenes SET ${sets.join(', ')} WHERE id = :id`, { ...params, id });
        if (!r.affectedRows) throw httpError(404, 'catalog/not-found');
        const [rows] = await pool.query('SELECT * FROM catalog_scenes WHERE id = :id', { id });
        res.json({ scene: rowToCatalogScene(rows[0]) });
    } catch (e) {
        next(e);
    }
});

app.delete('/api/admin/scenes/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) throw httpError(400, 'catalog/invalid-id');
        const [r] = await pool.query('DELETE FROM catalog_scenes WHERE id = :id', { id });
        if (!r.affectedRows) throw httpError(404, 'catalog/not-found');
        res.json({ ok: true });
    } catch (e) {
        next(e);
    }
});

// --- tracks CRUD ---
app.post('/api/admin/tracks', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const b = req.body || {};
        if (!b.mood || !b.url) throw httpError(400, 'catalog/missing-fields');
        const [r] = await pool.query(
            `INSERT INTO catalog_tracks (mood, title, artist, url, is_public, sort_order)
             VALUES (:mood, :title, :artist, :url, :isPublic, :sortOrder)`,
            {
                mood: String(b.mood),
                title: b.title ?? null,
                artist: b.artist ?? null,
                url: String(b.url),
                isPublic: b.isPublic === false ? 0 : 1,
                sortOrder: Number.isFinite(b.sortOrder) ? b.sortOrder : 0,
            }
        );
        const [rows] = await pool.query('SELECT * FROM catalog_tracks WHERE id = :id', { id: r.insertId });
        res.status(201).json({ track: rowToCatalogTrack(rows[0]) });
    } catch (e) {
        next(e);
    }
});

app.patch('/api/admin/tracks/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) throw httpError(400, 'catalog/invalid-id');
        const { sets, params } = buildPatch(req.body, TRACK_MAP);
        if (!sets.length) throw httpError(400, 'catalog/no-fields');
        const [r] = await pool.query(`UPDATE catalog_tracks SET ${sets.join(', ')} WHERE id = :id`, { ...params, id });
        if (!r.affectedRows) throw httpError(404, 'catalog/not-found');
        const [rows] = await pool.query('SELECT * FROM catalog_tracks WHERE id = :id', { id });
        res.json({ track: rowToCatalogTrack(rows[0]) });
    } catch (e) {
        next(e);
    }
});

app.delete('/api/admin/tracks/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) throw httpError(400, 'catalog/invalid-id');
        const [r] = await pool.query('DELETE FROM catalog_tracks WHERE id = :id', { id });
        if (!r.affectedRows) throw httpError(404, 'catalog/not-found');
        res.json({ ok: true });
    } catch (e) {
        next(e);
    }
});

// --- upload a R2 ------------------------------------------------------------

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 300 * 1024 * 1024 } });

const sanitizeSegment = (s) =>
    String(s || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();

const putR2 = (Key, Body, ContentType) =>
    r2.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key, Body, ContentType }));

app.post('/api/admin/upload', requireAuth, requireAdmin, upload.single('file'), async (req, res, next) => {
    try {
        if (!r2Enabled) throw httpError(503, 'r2/not-configured');
        if (!req.file) throw httpError(400, 'upload/no-file');

        const folder = String(req.body?.folder || 'misc')
            .split('/')
            .map(sanitizeSegment)
            .filter(Boolean)
            .join('/') || 'misc';

        const original = sanitizeSegment(req.file.originalname.replace(/\.[^.]+$/, '')) || 'file';
        const extMatch = req.file.originalname.match(/\.([a-zA-Z0-9]+)$/);
        const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';
        const stamp = Date.now();
        const isVideo = (req.file.mimetype || '').startsWith('video/');

        // No-video (audio, etc.): se sube tal cual.
        if (!isVideo) {
            const key = `${folder}/${stamp}-${original}${ext}`;
            await putR2(key, req.file.buffer, req.file.mimetype || 'application/octet-stream');
            return res
                .status(201)
                .json({ url: r2PublicUrl(key), key, size: req.file.size, contentType: req.file.mimetype });
        }

        // Video: comprimir + sacar thumbnail antes de subir.
        const dir = await mkdtemp(path.join(os.tmpdir(), 'lofito-'));
        const inPath = path.join(dir, `in${ext || '.mp4'}`);
        const outPath = path.join(dir, 'out.mp4');
        const thumbPath = path.join(dir, 'thumb.jpg');
        try {
            await writeFile(inPath, req.file.buffer);
            await compressVideo(inPath, outPath);

            let thumbnailUrl = null;
            try {
                await makeThumbnail(inPath, thumbPath);
                const thumbBuf = await readFile(thumbPath);
                const thumbKey = `${folder}/thumbs/${stamp}-${original}.jpg`;
                await putR2(thumbKey, thumbBuf, 'image/jpeg');
                thumbnailUrl = r2PublicUrl(thumbKey);
            } catch (thumbErr) {
                console.warn('[upload] thumbnail falló:', thumbErr.message);
            }

            const compressed = await readFile(outPath);
            const videoKey = `${folder}/${stamp}-${original}.mp4`;
            await putR2(videoKey, compressed, 'video/mp4');

            res.status(201).json({
                url: r2PublicUrl(videoKey),
                key: videoKey,
                thumbnailUrl,
                contentType: 'video/mp4',
                originalSize: req.file.size,
                size: compressed.length,
                compressed: true,
            });
        } finally {
            await rm(dir, { recursive: true, force: true }).catch(() => {});
        }
    } catch (e) {
        next(e);
    }
});

// --- error handler ----------------------------------------------------------

app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    const code = err.code || 'internal/error';
    if (status >= 500) console.error(err);
    res.status(status).json({ code, message: err.message || code });
});

app.listen(Number(PORT), () => console.log(`API on http://localhost:${PORT}`));
