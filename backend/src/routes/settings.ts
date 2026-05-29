import { Router, Request, Response, NextFunction } from 'express';
import { Settings }    from '../models';
import { requireAuth } from '../middleware/auth';
import { logActivity } from '../utils/activity';

const router = Router();

/* GET /api/settings — retorna configurações (admin vê tudo) */
router.get('/', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const s = await Settings.findOne({}) ?? await Settings.create({});
    res.json(s);
  } catch (err) { next(err); }
});

/* PUT /api/settings — salva configurações */
router.put('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowed = ['storeName','storeAddress','storeCity','storeHours','pixKey','pixKeyType','whatsapp','imgbbKey'];
    const body: Record<string, unknown> = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) body[k] = req.body[k]; });

    const s = await Settings.findOneAndUpdate({}, body, { upsert: true, new: true });
    logActivity(req.admin?.email ?? '', 'Configurações atualizadas', '');
    res.json(s);
  } catch (err) { next(err); }
});

export default router;
