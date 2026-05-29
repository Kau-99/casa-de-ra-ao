import { Router, Request, Response, NextFunction } from 'express';
import { type SortOrder } from 'mongoose';
import { Product, StockMovement } from '../models';
import { requireAuth } from '../middleware/auth';
import {
  validateBody,
  validateQuery,
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '../middleware/validation';
import { AppError } from '../middleware/errorHandler';
import { logActivity } from '../utils/activity';

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

    /* Admin sem filtro explícito vê todos os produtos; público sempre vê só ativos */
    if (!req.admin) {
      filter.active = true;
    } else if (active !== undefined) {
      filter.active = active;
    }
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
    logActivity(req.admin?.email ?? '', 'Produto criado', product.name);
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
    logActivity(req.admin?.email ?? '', 'Produto editado', product.name);
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

/* GET /api/products/stock/movements — histórico de movimentações (admin) */
router.get('/stock/movements', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit ?? 100);
    const productId = req.query.productId as string | undefined;
    const filter: Record<string, unknown> = {};
    if (productId) filter.productId = productId;
    const movements = await StockMovement.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json(movements);
  } catch (err) { next(err); }
});

/* POST /api/products/:id/stock — ajuste manual de estoque com motivo */
router.post('/:id/stock', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, quantity, reason } = req.body as {
      type: 'entrada' | 'saida'; quantity: number; reason: string;
    };
    const qty = Math.abs(parseInt(String(quantity)));
    if (!qty || !type || !reason) {
      return next(new AppError('Tipo, quantidade e motivo são obrigatórios.', 400));
    }

    const product = await Product.findById(req.params.id);
    if (!product) return next(new AppError('Produto não encontrado.', 404));

    const delta    = type === 'entrada' ? qty : -qty;
    const newStock = Math.max(0, product.stock + delta);

    await Product.findByIdAndUpdate(product._id, { stock: newStock });
    await StockMovement.create({
      productId:    product._id,
      productName:  product.name,
      type, quantity: qty, reason,
      previousStock: product.stock,
      newStock,
      adminEmail:   req.admin?.email ?? '',
    });

    logActivity(
      req.admin?.email ?? '',
      'Ajuste de estoque',
      `${product.name}: ${type === 'entrada' ? '+' : '-'}${qty} un. — ${reason}`
    );

    res.json({ previousStock: product.stock, newStock, delta });
  } catch (err) { next(err); }
});

export default router;
