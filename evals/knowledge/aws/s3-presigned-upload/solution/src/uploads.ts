import { randomUUID } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, bucket } from './s3.ts';

const ALLOWED = new Set(['image/png', 'image/jpeg', 'application/pdf']);

// Since client-s3 3.729.0 a default client bakes a CRC32 of the *empty* body into presigned PUT URLs.
// The browser uploads a real body, so only add checksums when an operation requires them.
const presignS3 = new S3Client({ requestChecksumCalculation: 'WHEN_REQUIRED' });

/** Short-lived link for the browser to download a file we stored earlier. */
export async function createDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: 300 });
}

export async function createUploadUrl(input: {
  userId: string;
  fileName: string;
  contentType: string;
}): Promise<{ url: string; key: string }> {
  if (!ALLOWED.has(input.contentType)) throw new Error(`content type not allowed: ${input.contentType}`);
  const key = `uploads/${input.userId}/${randomUUID()}-${input.fileName}`;
  const cmd = new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: input.contentType });
  // Sign Content-Type so S3 rejects an upload that sends a different one.
  const url = await getSignedUrl(presignS3, cmd, { expiresIn: 600, signableHeaders: new Set(['content-type']) });
  return { url, key };
}
