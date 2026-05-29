import { Router, Request, Response, NextFunction } from 'express';
import { Expense } from '../models';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logActivity } from '../utils/activity';

const router = Router();

const CATEGORIES = [
  'Compra de mercadoria','Aluguel','Salários','Contas (água/luz/internet)',
  'Impostos e taxas','Marketing','Manutenção','Transporte/Frete','Outros',
];

/* GET /api/expenses — lista com filtro opcional por ano/mês (somente admin) */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, month, limit } = req.query as { year?: string; month?: string; limit?: string };
    const filter: Record<string, unknown> = {};

    if (year) {
      const y = Number(year);
      const m = month ? Number(month) - 1 : null;
      const start = m !== null ? new Date(y, m, 1) : new Date(y, 0, 1);
      const end   = m !== null ? new Date(y, m + 1, 0, 23, 59, 59) : new Date(y, 11, 31, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    }

    const expenses = await Expense.find(filter).sort({ date: -1 }).limit(Number(limit ?? 1000));
    res.json(expenses);
  } catch (err) { next(err); }
});

/* POST /api/expenses — cria despesa */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { description, category, amount, date, notes } = req.body as {
      description: string; category: string; amount: number; date: string; notes?: string;
    };
    if (!description || !category || !amount || !date) {
      return next(new AppError('Descrição, categoria, valor e data são obrigatórios.', 400));
    }
    if (!CATEGORIES.includes(category)) return next(new AppError('Categoria inválida.', 400));
    if (Number(amount) <= 0) return next(new AppError('Valor deve ser maior que zero.', 400));

    const expense = await Expense.create({
      description, category, amount: Number(amount),
      date: new Date(date), notes: notes ?? '', adminEmail: req.admin?.email ?? '',
    });
    logActivity(req.admin?.email ?? '', 'Despesa registrada', `${description} — R$${Number(amount).toFixed(2)}`);
    res.status(201).json(expense);
  } catch (err) { next(err); }
});

/* PUT /api/expenses/:id — edita despesa */
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowed = ['description','category','amount','date','notes'];
    const body: Record<string, unknown> = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) body[k] = req.body[k]; });
    if (body.date) body.date = new Date(body.date as string);
    if (body.amount !== undefined) body.amount = Number(body.amount);

    const expense = await Expense.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!expense) return next(new AppError('Despesa não encontrada.', 404));
    logActivity(req.admin?.email ?? '', 'Despesa editada', expense.description);
    res.json(expense);
  } catch (err) { next(err); }
});

/* DELETE /api/expenses/:id — remove despesa */
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return next(new AppError('Despesa não encontrada.', 404));
    logActivity(req.admin?.email ?? '', 'Despesa removida', expense.description);
    res.json({ message: 'Despesa removida.', id: expense._id });
  } catch (err) { next(err); }
});

export default router;
