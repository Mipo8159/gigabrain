import { test, before } from 'node:test';
import assert from 'node:assert/strict';

let createUploadUrl: (i: { userId: string; fileName: string; contentType: string }) => Promise<{ url: string; key: string }>;

before(async () => {
  Object.assign(process.env, {
    AWS_ACCESS_KEY_ID: 'AKIDEXAMPLE', AWS_SECRET_ACCESS_KEY: 'secret', AWS_REGION: 'eu-west-1',
    UPLOADS_BUCKET: 'acme-uploads', AWS_CONFIG_FILE: '/nonexistent', AWS_SHARED_CREDENTIALS_FILE: '/nonexistent',
  });
  delete process.env.AWS_PROFILE;
  delete process.env.AWS_REQUEST_CHECKSUM_CALCULATION;
  ({ createUploadUrl } = await import('../src/uploads.ts'));
});

const params = async (contentType = 'image/png') => {
  const { url, key } = await createUploadUrl({ userId: 'u1', fileName: 'avatar.png', contentType });
  return { url: new URL(url), key, q: new URL(url).searchParams };
};

test('key layout and bucket', async () => {
  const { url, key } = await params();
  assert.ok(key.startsWith('uploads/u1/') && key.endsWith('avatar.png'), key);
  assert.ok(url.hostname.includes('acme-uploads') || url.pathname.startsWith('/acme-uploads/'), url.href);
  assert.ok(decodeURIComponent(url.pathname).endsWith(key), url.pathname);
});

test('rejects content types that are not allowed', async () => {
  await assert.rejects(() => params('text/html'));
});

test('valid for 10 minutes', async () => {
  const { q } = await params();
  assert.equal(q.get('X-Amz-Expires'), '600');
});

test('a browser PUT with a real body is not pinned to a precomputed checksum', async () => {
  const { q } = await params();
  const checksumParams = [...q.keys()].filter(k => /^x-amz-(checksum-|sdk-checksum-algorithm)/i.test(k));
  assert.deepEqual(checksumParams, [], `URL pins a checksum the browser upload cannot match: ${checksumParams.join(', ')}`);
});

test('Content-Type is part of the signature, so S3 rejects a different one', async () => {
  const { q } = await params('application/pdf');
  const signed = (q.get('X-Amz-SignedHeaders') ?? '').toLowerCase().split(';');
  assert.ok(signed.includes('content-type'), `signed headers: ${signed.join(';')}`);
});
