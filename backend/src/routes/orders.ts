import { Router, Request, Response, NextFunction } from 'express';
import { Order, Product } from '../models';
import { requireAuth } from '../middleware/auth';
import {
  validateBody,
  createOrderSchema,
  updateOrderStatusSchema,
} from '../middleware/validation';
import { AppError } from '../middleware/errorHandler';
import { sendOrderWhatsApp } from '../utils/notifications';

const router = Router();

/* POST /api/orders
   Valida estoque, calcula total no servidor e cria o pedido */
router.post('/', validateBody(createOrderSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, customer, deliveryType, address, payment, notes } = req.body as {
      items: Array<{ productId: string; name: string; price: number; qty: number }>;
      customer: { name: string; phone: string };
      deliveryType: 'delivery' | 'pickup';
      address?: string;
      payment: 'Pix' | 'Cartão' | 'Dinheiro';
      notes?: string;
    };

    /* Valida estoque e recalcula preços usando valores do banco — nunca confiamos no cliente */
    const productIds = items.map((i) => i.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds }, active: true });

    if (dbProducts.length !== productIds.length) {
      return next(new AppError('Um ou mais produtos não estão disponíveis.', 400));
    }

    const validatedItems = items.map((item) => {
      const dbProduct = dbProducts.find((p) => p._id.toString() === item.productId);
      if (!dbProduct) throw new AppError(`Produto ${item.productId} não encontrado.`, 400);
      if (dbProduct.stock < item.qty) {
        throw new AppError(`Estoque insuficiente para "${dbProduct.name}".`, 409);
      }
      return {
        productId: dbProduct._id,
        name:      dbProduct.name,
        price:     dbProduct.price, // preço oficial do banco
        qty:       item.qty,
      };
    });

    const total = validatedItems.reduce((s, i) => s + i.price * i.qty, 0);

    const order = await Order.create({
      items: validatedItems,
      total,
      customer,
      deliveryType,
      address: address ?? null,
      payment,
      notes: notes ?? null,
    });

    /* Dispara notificação WhatsApp sem bloquear a resposta */
    sendOrderWhatsApp(order).catch((err: Error) =>
      console.error('[Notifications] Falha ao enviar WhatsApp:', err.message)
    );

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

/* GET /api/orders — somente admin */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page  = Number(req.query.page  ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const status = req.query.status as string | undefined;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

/* GET /api/orders/:id */
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError('Pedido não encontrado.', 404));
    res.json(order);
  } catch (err) {
    next(err);
  }
});

/* PATCH /api/orders/:id/status — somente admin */
router.patch(
  '/:id/status',
  requireAuth,
  validateBody(updateOrderStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true, runValidators: true }
      );
      if (!order) return next(new AppError('Pedido não encontrado.', 404));
      res.json(order);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
