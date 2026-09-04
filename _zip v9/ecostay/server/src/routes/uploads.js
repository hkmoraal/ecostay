/**
 * POST /api/uploads/sign
 *   Returns the parameters + signature the browser needs to upload one photo
 *   directly to Cloudinary. Body: { folder? }.
 *   The file itself is uploaded by the browser, not by this server.
 */

import { Router } from 'express';
import { requireAuditor } from '../auth.js';
import {
  cloudinaryConfigured, signUpload,
  CLOUD_NAME, API_KEY, BASE_FOLDER,
} from '../cloudinary.js';

const router = Router();

router.post('/sign', requireAuditor, (req, res) => {
  if (!cloudinaryConfigured()) {
    return res.status(503).json({
      error: 'Foto-uploads zijn nog niet geconfigureerd (Cloudinary env vars ontbreken).',
    });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const sub = String(req.body?.folder || '').replace(/[^a-zA-Z0-9/_-]/g, '');
  const folder = sub ? `${BASE_FOLDER}/${sub}` : BASE_FOLDER;

  // Sign exactly the params the browser will send alongside the file.
  const signature = signUpload({ folder, timestamp });

  res.json({
    cloudName: CLOUD_NAME,
    apiKey:    API_KEY,
    timestamp,
    folder,
    signature,
  });
});

/**
 * POST /api/uploads/sign-stay
 *   Public sign endpoint for a stay's own photo, used during registration and
 *   from the owner dashboard (no auditor key). Uploads land in a 'stays' folder.
 */
router.post('/sign-stay', (req, res) => {
  if (!cloudinaryConfigured()) {
    return res.status(503).json({
      error: 'Foto-uploads zijn nog niet geconfigureerd (Cloudinary env vars ontbreken).',
    });
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `${BASE_FOLDER}/stays`;
  const signature = signUpload({ folder, timestamp });
  res.json({ cloudName: CLOUD_NAME, apiKey: API_KEY, timestamp, folder, signature });
});

export default router;
