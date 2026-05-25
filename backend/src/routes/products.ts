import { Router, Request, Response, NextFunction } from 'express';
import { type SortOrder } from 'mongoose';
import { Product } from '../models';
import { requireAuth } from '../middleware/auth';
import {
  validateBody,
  validateQuery,
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '../middleware/validation';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/* GET /api/products
   Suporta filtros por categoria, busca por texto, paginação e ordenação */
router.get('/', validateQuery(productQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search, active, page, limit, sort } = req.query as unknown as {
      category?: string;
      search?:   string;
      active?:   boolean;
      page:      number;
      limit:     number;
      sort:      string;
    };

    const filter: Record<string, unknown> = {};

    /* Só retorna inativos para admins autenticados */
    filter.active = req.admin ? (active ?? true) : true;
    if (category) filter.category = category;
    if (search)   filter.$text = { $search: search };

    const sortMap: Record<string, Record<string, SortOrder>> = {
      price_asc:  { price: 1 },
      price_desc: { price: -1 },
      rating:     { rating: -1 },
      newest:     { createdAt: -1 },
    };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Product.find(filter).sort(sortMap[sort] ?? sortMap.newest).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    res.json({
      items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

/* GET /api/products/:id */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return next(new AppError('Produto não encontrado.', 404));
    res.json(product);
  } catch (err) {
    next(err);
  }
});

/* POST /api/products — somente admin */
router.post('/', requireAuth, validateBody(createProductSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

/* PUT /api/products/:id — somente admin */
router.put('/:id', requireAuth, validateBody(updateProductSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return next(new AppError('Produto não encontrado.', 404));
    res.json(product);
  } catch (err) {
    next(err);
  }
});

/* DELETE /api/products/:id — soft delete (active = false) */
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );
    if (!product) return next(new AppError('Produto não encontrado.', 404));
    res.json({ message: 'Produto desativado com sucesso.', id: product._id });
  } catch (err) {
    next(err);
  }
});

export default router;
