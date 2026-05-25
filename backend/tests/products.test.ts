import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import { Product } from '../src/models';

const PRODUCT_FIXTURE = {
  name:     'Ração Teste 1kg',
  price:    49.90,
  category: 'Ração',
  rating:   4.5,
  reviews:  10,
  img:      'https://images.unsplash.com/photo-test',
  desc:     'Descrição do produto de teste com texto suficiente.',
  stock:    20,
};

describe('GET /api/products', () => {
  beforeEach(async () => {
    await Product.create(PRODUCT_FIXTURE);
  });

  it('retorna lista de produtos com paginação', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('filtra por categoria', async () => {
    await Product.create({ ...PRODUCT_FIXTURE, name: 'Shampoo Teste', category: 'Higiene' });

    const res = await request(app).get('/api/products?category=Higiene');
    expect(res.status).toBe(200);
    expect(res.body.items.every((p: { category: string }) => p.category === 'Higiene')).toBe(true);
  });

  it('retorna apenas produtos ativos por padrão', async () => {
    await Product.create({ ...PRODUCT_FIXTURE, name: 'Produto Inativo', active: false });

    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.items.every((p: { active: boolean }) => p.active)).toBe(true);
  });

  it('respeita paginação', async () => {
    await Product.create([
      { ...PRODUCT_FIXTURE, name: 'Produto 2' },
      { ...PRODUCT_FIXTURE, name: 'Produto 3' },
    ]);

    const res = await request(app).get('/api/products?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.pagination.total).toBe(3);
  });
});

describe('GET /api/products/:id', () => {
  it('retorna produto pelo id', async () => {
    const product = await Product.create(PRODUCT_FIXTURE);
    const res = await request(app).get(`/api/products/${product._id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe(PRODUCT_FIXTURE.name);
  });

  it('retorna 404 para id inexistente', async () => {
    const res = await request(app).get('/api/products/000000000000000000000000');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /api/products (sem auth)', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/products').send(PRODUCT_FIXTURE);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/products — validação', () => {
  it('retorna 400 com dados inválidos', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', 'Bearer token_invalido')
      .send({ name: 'X' }); // sem campos obrigatórios
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
