import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import { Product, Order } from '../src/models';

let productId: string;

const PRODUCT_FIXTURE = {
  name:     'Ração para Testes',
  price:    89.90,
  category: 'Ração',
  rating:   4.8,
  reviews:  100,
  img:      'https://images.unsplash.com/photo-test',
  desc:     'Produto criado apenas para testes de pedido.',
  stock:    10,
};

beforeEach(async () => {
  const product = await Product.create(PRODUCT_FIXTURE);
  productId = product._id.toString();
});

describe('POST /api/orders', () => {
  it('cria pedido de retirada com dados válidos', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        items:        [{ productId, name: 'Ração para Testes', price: 89.90, qty: 2 }],
        deliveryType: 'pickup',
        payment:      'Pix',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.total).toBe(89.90 * 2);
    expect(res.body.status).toBe('pending');
  });

  it('cria pedido de entrega com endereço', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        items:        [{ productId, name: 'Ração para Testes', price: 89.90, qty: 1 }],
        deliveryType: 'delivery',
        address:      'Rua das Flores, 123 — Jardins, SP, CEP 01000-000',
        payment:      'Cartão',
      });

    expect(res.status).toBe(201);
    expect(res.body.deliveryType).toBe('delivery');
  });

  it('retorna 400 sem itens', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [], deliveryType: 'pickup', payment: 'Pix' });
    expect(res.status).toBe(400);
  });

  it('retorna 400 para entrega sem endereço', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        items:        [{ productId, name: 'Ração', price: 89.90, qty: 1 }],
        deliveryType: 'delivery',
        payment:      'Pix',
        /* address propositalmente ausente */
      });
    expect(res.status).toBe(400);
  });

  it('retorna 409 quando estoque insuficiente', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        items:        [{ productId, name: 'Ração', price: 89.90, qty: 999 }],
        deliveryType: 'pickup',
        payment:      'Pix',
      });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/estoque/i);
  });

  it('usa o preço do banco, não o preço enviado pelo cliente', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        items:        [{ productId, name: 'Ração', price: 1.00, qty: 1 }], // preço adulterado
        deliveryType: 'pickup',
        payment:      'Pix',
      });

    expect(res.status).toBe(201);
    expect(res.body.total).toBe(PRODUCT_FIXTURE.price); // total calculado com preço real
  });
});

describe('GET /api/orders (sem auth)', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/orders/:id/status (sem auth)', () => {
  it('retorna 401 sem token', async () => {
    const order = await Order.create({
      items:        [{ productId, name: 'Ração', price: 89.90, qty: 1 }],
      total:        89.90,
      deliveryType: 'pickup',
      payment:      'Pix',
    });

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(401);
  });
});
