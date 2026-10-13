import { randomUUID } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, bucket } from './s3.ts';

const ALLOWED_CONTENT_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf']);
const UPLOAD_URL_TTL_SECONDS = 10 * 60;

/** Short-lived link for the browser to download a file we stored earlier. */
export async function createDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: 300 });
}

/** Presigned PUT the browser uploads to directly. */
export async function createUploadUrl(input: {
  userId: string;
  fileName: string;
  contentType: string;
}): Promise<{ url: string; key: string }> {
  if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
    throw new Error(`content type not allowed: ${input.contentType}`);
  }
  const key = `uploads/${input.userId}/${randomUUID()}-${input.fileName}`;
  const command = new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: input.contentType });
  const url = await getSignedUrl(s3, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
  return { url, key };
}
