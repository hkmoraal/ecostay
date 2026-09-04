import crypto from 'crypto';

// Signed direct uploads to Cloudinary — the browser uploads the file straight
// to Cloudinary, so evidence photos never pass through our Render instance.
// The server only signs the upload parameters.
//
// Required env vars (from your Cloudinary dashboard):
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET
// Optional:
//   CLOUDINARY_FOLDER   (default 'ecostay/audits')

export const CLOUD_NAME   = process.env.CLOUDINARY_CLOUD_NAME  || '';
export const API_KEY      = process.env.CLOUDINARY_API_KEY     || '';
export const API_SECRET   = process.env.CLOUDINARY_API_SECRET  || '';
export const BASE_FOLDER  = process.env.CLOUDINARY_FOLDER      || 'ecostay/audits';

export function cloudinaryConfigured() {
  return Boolean(CLOUD_NAME && API_KEY && API_SECRET);
}

// Cloudinary signature = sha1( sorted "k=v&k=v" of signed params + api_secret ).
// We sign only the params the browser will also send (folder + timestamp).
export function signUpload(params) {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + API_SECRET).digest('hex');
}
