import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Rutas de ejemplo
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(3001, () => console.log('API on http://localhost:3001'));