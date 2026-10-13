import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, bucket } from './s3.ts';

/** Short-lived link for the browser to download a file we stored earlier. */
export async function createDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: 300 });
}

export async function createUploadUrl(input: {
  userId: string;
  fileName: string;
  contentType: string;
}): Promise<{ url: string; key: string }> {
  throw new Error('not implemented');
}
