import { S3Client } from '@aws-sdk/client-s3';

const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL } = process.env;

export const r2Enabled = !!(R2_ENDPOINT && R2_BUCKET && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);

// Cliente S3-compatible apuntando a Cloudflare R2. region 'auto' es lo que pide R2.
export const r2 = r2Enabled
    ? new S3Client({
          region: 'auto',
          endpoint: R2_ENDPOINT,
          credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
      })
    : null;

export const R2_BUCKET_NAME = R2_BUCKET;

// URL pública de un objeto (vía dominio r2.dev o custom).
export const r2PublicUrl = (key) => `${(R2_PUBLIC_URL || '').replace(/\/+$/, '')}/${String(key).replace(/^\/+/, '')}`;
