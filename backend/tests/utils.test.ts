import { describe, it, expect } from 'vitest';
import Joi from 'joi';
import {
  createProductSchema,
  createOrderSchema,
  contactSchema,
  newsletterSchema,
  loginSchema,
} from '../src/middleware/validation';

/* ---- Produto ---- */
describe('createProductSchema', () => {
  const valid = {
    name:     'Ração Golden 15kg',
    price:    189.90,
    category: 'Ração',
    rating:   4.9,
    reviews:  312,
    img:      'https://images.unsplash.com/photo-test',
    desc:     'Descrição suficientemente longa para o schema.',
    stock:    50,
  };

  it('aceita produto válido', () => {
    const { error } = createProductSchema.validate(valid);
    expect(error).toBeUndefined();
  });

  it('rejeita preço negativo', () => {
    const { error } = createProductSchema.validate({ ...valid, price: -10 });
    expect(error).toBeDefined();
  });

  it('rejeita categoria inválida', () => {
    const { error } = createProductSchema.validate({ ...valid, category: 'Brinquedos' });
    expect(error).toBeDefined();
  });

  it('rejeita originalPrice menor que price', () => {
    const { error } = createProductSchema.validate({ ...valid, originalPrice: 100, price: 150 });
    expect(error).toBeDefined();
  });

  it('aceita originalPrice nulo', () => {
    const { error } = createProductSchema.validate({ ...valid, originalPrice: null });
    expect(error).toBeUndefined();
  });

  it('rejeita name com menos de 3 caracteres', () => {
    const { error } = createProductSchema.validate({ ...valid, name: 'AB' });
    expect(error).toBeDefined();
  });
});

/* ---- Pedido ---- */
describe('createOrderSchema', () => {
  const baseOrder = {
    items:        [{ productId: 'a'.repeat(24), name: 'Ração', price: 50, qty: 1 }],
    deliveryType: 'pickup',
    payment:      'Pix',
  };

  it('aceita pedido de retirada válido', () => {
    const { error } = createOrderSchema.validate(baseOrder);
    expect(error).toBeUndefined();
  });

  it('exige endereço em pedido de entrega', () => {
    const { error } = createOrderSchema.validate({ ...baseOrder, deliveryType: 'delivery' });
    expect(error).toBeDefined();
  });

  it('rejeita lista de itens vazia', () => {
    const { error } = createOrderSchema.validate({ ...baseOrder, items: [] });
    expect(error).toBeDefined();
  });

  it('rejeita forma de pagamento inválida', () => {
    const { error } = createOrderSchema.validate({ ...baseOrder, payment: 'Bitcoin' });
    expect(error).toBeDefined();
  });
});

/* ---- Contato ---- */
describe('contactSchema', () => {
  const valid = { name: 'João Silva', email: 'joao@email.com', message: 'Mensagem com tamanho suficiente para validar.' };

  it('aceita contato válido', () => {
    expect(contactSchema.validate(valid).error).toBeUndefined();
  });

  it('rejeita email inválido', () => {
    expect(contactSchema.validate({ ...valid, email: 'nao-e-email' }).error).toBeDefined();
  });

  it('rejeita mensagem muito curta', () => {
    expect(contactSchema.validate({ ...valid, message: 'oi' }).error).toBeDefined();
  });
});

/* ---- Newsletter ---- */
describe('newsletterSchema', () => {
  it('aceita email válido', () => {
    expect(newsletterSchema.validate({ email: 'pet@loja.com' }).error).toBeUndefined();
  });

  it('rejeita email inválido', () => {
    expect(newsletterSchema.validate({ email: 'invalido' }).error).toBeDefined();
  });
});

/* ---- Auth ---- */
describe('loginSchema', () => {
  it('aceita credenciais válidas', () => {
    expect(loginSchema.validate({ email: 'admin@helvinho.com', password: 'senha123' }).error).toBeUndefined();
  });

  it('rejeita senha curta', () => {
    expect(loginSchema.validate({ email: 'admin@helvinho.com', password: '123' }).error).toBeDefined();
  });

  it('rejeita email vazio', () => {
    expect(loginSchema.validate({ email: '', password: 'senha123' }).error).toBeDefined();
  });
});
