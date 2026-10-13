import { S3Client } from '@aws-sdk/client-s3';

// One client per process; region and credentials come from the environment (Lambda / ECS task role).
export const s3 = new S3Client({});

export const bucket = () => {
  const b = process.env.UPLOADS_BUCKET;
  if (!b) throw new Error('UPLOADS_BUCKET is not set');
  return b;
};
