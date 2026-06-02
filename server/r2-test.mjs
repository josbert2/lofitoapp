import 'dotenv/config';
import { HeadBucketCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2, r2Enabled, R2_BUCKET_NAME, r2PublicUrl } from './r2.js';

const log = (...a) => console.log(...a);

if (!r2Enabled) {
    log('R2 NO configurado (faltan envs)');
    process.exit(1);
}

const key = `_conntest/${Date.now()}.txt`;
const body = `lofito r2 ok ${new Date().toISOString()}`;

try {
    log('1) HeadBucket', R2_BUCKET_NAME, '...');
    await r2.send(new HeadBucketCommand({ Bucket: R2_BUCKET_NAME }));
    log('   OK — bucket accesible');

    log('2) PutObject', key, '...');
    await r2.send(
        new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: body, ContentType: 'text/plain' })
    );
    log('   OK — subido');

    const url = r2PublicUrl(key);
    log('3) GET público', url, '...');
    const res = await fetch(url);
    const text = await res.text();
    log('   HTTP', res.status, '| body match:', text === body);

    log('4) ListObjectsV2 (primeros 5) ...');
    const list = await r2.send(new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, MaxKeys: 5 }));
    log('   objetos en bucket:', list.KeyCount ?? 0);

    log('5) DeleteObject (limpieza) ...');
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    log('   OK — borrado');

    log('\nR2 CONECTADO Y FUNCIONANDO');
} catch (e) {
    log('ERROR:', e.name, '-', e.message);
    process.exit(2);
}
