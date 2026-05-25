import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/* Helper que transforma erros Joi em AppError 400 */
function validate(schema: Joi.ObjectSchema, target: 'body' | 'query' | 'params') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req[target], { abortEarly: false });
    if (error) {
      const details = error.details.map((d) => d.message).join('; ');
      return next(new AppError(`Validação falhou: ${details}`, 400));
    }
    next();
  };
}

/* ---- Schemas de Produto ---- */

export const createProductSchema = Joi.object({
  name:          Joi.string().trim().min(3).max(120).required(),
  price:         Joi.number().positive().required(),
  originalPrice: Joi.number().positive().greater(Joi.ref('price')).optional().allow(null),
  category:      Joi.string().valid('Ração', 'Acessórios', 'Higiene', 'Medicamentos').required(),
  rating:        Joi.number().min(0).max(5).required(),
  reviews:       Joi.number().integer().min(0).default(0),
  badge:         Joi.string().max(30).optional().allow(null),
  img:           Joi.string().uri().required(),
  desc:          Joi.string().min(10).max(500).required(),
  stock:         Joi.number().integer().min(0).default(0),
  active:        Joi.boolean().default(true),
});

export const updateProductSchema = createProductSchema.fork(
  ['name', 'price', 'category', 'rating', 'img', 'desc'],
  (field) => field.optional()
);

export const productQuerySchema = Joi.object({
  category: Joi.string().valid('Ração', 'Acessórios', 'Higiene', 'Medicamentos').optional(),
  search:   Joi.string().trim().max(80).optional(),
  active:   Joi.boolean().optional(),
  page:     Joi.number().integer().min(1).default(1),
  limit:    Joi.number().integer().min(1).max(50).default(20),
  sort:     Joi.string().valid('price_asc', 'price_desc', 'rating', 'newest').default('newest'),
});

/* ---- Schemas de Pedido ---- */

export const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().length(24).hex().required(),
        name:      Joi.string().required(),
        price:     Joi.number().positive().required(),
        qty:       Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
  customer: Joi.object({
    name:  Joi.string().max(80).default(''),
    phone: Joi.string().max(20).default(''),
  }).default({}),
  deliveryType: Joi.string().valid('delivery', 'pickup').required(),
  address:      Joi.when('deliveryType', {
    is:        'delivery',
    then:      Joi.string().trim().min(10).max(200).required(),
    otherwise: Joi.string().optional().allow(null, ''),
  }),
  payment: Joi.string().valid('Pix', 'Cartão', 'Dinheiro').required(),
  notes:   Joi.string().max(300).optional().allow(null, ''),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'processing', 'delivered', 'cancelled')
    .required(),
});

/* ---- Schemas de Contato ---- */

export const contactSchema = Joi.object({
  name:    Joi.string().trim().min(2).max(80).required(),
  email:   Joi.string().email().lowercase().trim().required(),
  phone:   Joi.string().max(20).optional().allow(null, ''),
  message: Joi.string().trim().min(10).max(1000).required(),
});

/* ---- Schemas de Newsletter ---- */

export const newsletterSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

/* ---- Schemas de Auth ---- */

export const loginSchema = Joi.object({
  email:    Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).required(),
});

/* ---- Middlewares exportados ---- */

export const validateBody  = (s: Joi.ObjectSchema) => validate(s, 'body');
export const validateQuery = (s: Joi.ObjectSchema) => validate(s, 'query');
export const validateParams = (s: Joi.ObjectSchema) => validate(s, 'params');
