// Sube ./assets-download/** al bucket R2 conservando la estructura como key.
// Correr:  node --env-file=.env upload_r2.mjs
import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error('Faltan vars R2 en el entorno'); process.exit(1);
}

const ROOT = path.resolve('../assets-download');
const CONC = 6;

const s3 = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const CT = {
    '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
};

async function walk(dir) {
    const out = [];
    for (const e of await readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...(await walk(p)));
        else out.push(p);
    }
    return out;
}

async function main() {
    // check de conexión
    try {
        await s3.send(new HeadBucketCommand({ Bucket: R2_BUCKET }));
        console.log(`✅ conectado al bucket "${R2_BUCKET}"`);
    } catch (e) {
        console.error(`❌ no pude acceder al bucket: ${e.name} ${e.message}`); process.exit(1);
    }

    const files = await walk(ROOT);
    console.log(`${files.length} archivos a subir desde ${ROOT}`);

    let done = 0, failed = 0;
    const queue = [...files];
    async function worker() {
        while (queue.length) {
            const f = queue.pop();
            const key = path.relative(ROOT, f).split(path.sep).join('/');
            const ext = path.extname(f).toLowerCase();
            try {
                const Body = await readFile(f);
                await s3.send(new PutObjectCommand({
                    Bucket: R2_BUCKET, Key: key, Body,
                    ContentType: CT[ext] || 'application/octet-stream',
                }));
                done++;
                if (done % 20 === 0) console.log(`  ${done}/${files.length}...`);
            } catch (e) {
                failed++;
                console.error(`  FAIL ${key}: ${e.name}`);
            }
        }
    }
    await Promise.all(Array.from({ length: CONC }, worker));
    console.log(`=== LISTO: subidos ${done}, fallidos ${failed} ===`);
}
main();
