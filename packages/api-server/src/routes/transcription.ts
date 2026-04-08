import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authenticate.js';
import { transcriptionRateLimit } from '../middleware/rateLimit.js';
import { transcribeAudio } from '../services/whisperService.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}`));
    }
  },
});

// POST /api/v1/transcribe
router.post(
  '/',
  authenticate,
  transcriptionRateLimit,
  upload.single('audio'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No audio file provided' });
        return;
      }

      const result = await transcribeAudio(req.file.buffer, req.file.originalname);

      res.json({
        text: result.text,
        durationMs: result.durationMs,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
