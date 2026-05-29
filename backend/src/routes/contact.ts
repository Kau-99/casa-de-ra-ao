import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { Contact, Newsletter } from '../models';
import { requireAuth } from '../middleware/auth';
import {
  validateBody,
  contactSchema,
  newsletterSchema,
} from '../middleware/validation';

const router = Router();

/* Rate limiter mais restritivo para formulários de contato e newsletter */
const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: { error: 'Muitas mensagens enviadas. Tente novamente em 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/* POST /api/contact */
router.post('/', formLimiter, validateBody(contactSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contact = await Contact.create(req.body);
    res.status(201).json({
      message: 'Mensagem recebida! Retornaremos em até 24 horas.',
      id: contact._id,
    });
  } catch (err) {
    next(err);
  }
});

/* GET /api/contact — somente admin */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page    = Number(req.query.page    ?? 1);
    const limit   = Number(req.query.limit   ?? 20);
    const replied = req.query.replied !== undefined
      ? req.query.replied === 'true'
      : undefined;

    const filter: Record<string, unknown> = {};
    if (replied !== undefined) filter.replied = replied;

    const [messages, total] = await Promise.all([
      Contact.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Contact.countDocuments(filter),
    ]);

    res.json({ messages, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

/* PATCH /api/contact/:id/replied — somente admin */
router.patch('/:id/replied', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { replied: true },
      { new: true }
    );
    if (!contact) {
      res.status(404).json({ error: 'Mensagem não encontrada.' });
      return;
    }
    res.json(contact);
  } catch (err) {
    next(err);
  }
});

/* GET /api/contact/newsletter — lista assinantes (somente admin) */
router.get('/newsletter', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page  = Number(req.query.page  ?? 1);
    const limit = Number(req.query.limit ?? 500);
    const [subscribers, total] = await Promise.all([
      Newsletter.find().sort({ subscribedAt: -1 }).skip((page - 1) * limit).limit(limit),
      Newsletter.countDocuments(),
    ]);
    res.json({ subscribers, pagination: { total, page, limit } });
  } catch (err) { next(err); }
});

/* POST /api/contact/newsletter */
router.post('/newsletter', formLimiter, validateBody(newsletterSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body as { email: string };

    /* Reativa se já estava cadastrado */
    const existing = await Newsletter.findOne({ email });
    if (existing) {
      if (existing.active) {
        res.json({ message: 'Este e-mail já está cadastrado nas novidades!' });
        return;
      }
      await Newsletter.updateOne({ email }, { active: true, unsubscribedAt: null });
      res.json({ message: 'Cadastro reativado com sucesso!' });
      return;
    }

    await Newsletter.create({ email });
    res.status(201).json({ message: 'Cadastrado com sucesso! Novidades em breve.' });
  } catch (err) {
    next(err);
  }
});

export default router;
