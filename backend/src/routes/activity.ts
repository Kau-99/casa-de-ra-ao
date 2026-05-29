import { Router, Request, Response, NextFunction } from 'express';
import { ActivityLog } from '../models';
import { requireAuth } from '../middleware/auth';

const router = Router();

/* GET /api/activity — últimas 100 atividades (somente admin) */
router.get('/', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) { next(err); }
});

export default router;
