import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

// --- error handler ----------------------------------------------------------

app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    const code = err.code || 'internal/error';
    if (status >= 500) console.error(err);
    res.status(status).json({ code, message: err.message || code });
});

app.listen(Number(PORT), () => console.log(`API on http://localhost:${PORT}`));
