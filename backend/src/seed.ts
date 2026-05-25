/**
 * Popula o banco com os 15 produtos do catálogo original.
 * Executa com: npm run seed
 */
import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { Product } from './models';

const PRODUCTS = [
  {
    name: 'Ração Golden Adulto Cães 15kg', price: 189.90, originalPrice: 229.90, category: 'Ração',
    rating: 4.9, reviews: 312, badge: 'Oferta', stock: 50,
    img: 'https://images.unsplash.com/photo-1589924691195-41432c84c161?auto=format&fit=crop&w=400&q=80',
    desc: 'Ração completa para cães adultos de raças médias e grandes. Rica em proteínas e vitaminas essenciais para saúde e energia diária.',
  },
  {
    name: 'Ração Premium Gatos Adultos 3kg', price: 89.90, category: 'Ração',
    rating: 4.8, reviews: 187, badge: null, stock: 40,
    img: 'https://images.unsplash.com/photo-1541943869728-4bd4f450c8f5?auto=format&fit=crop&w=400&q=80',
    desc: 'Formulada especialmente para gatos adultos. Com taurina e ômega-3 para saúde ocular e pelagem brilhante.',
  },
  {
    name: 'Petisco Natural Bifinho 250g', price: 24.90, category: 'Ração',
    rating: 4.9, reviews: 428, badge: 'Top', stock: 80,
    img: 'https://images.unsplash.com/photo-1623366302587-b38b1ddaefd9?auto=format&fit=crop&w=400&q=80',
    desc: 'Petisco saboroso e natural para cães. Ideal para recompensar no adestramento. Sem corantes artificiais.',
  },
  {
    name: 'Ração Filhotes Cães 10kg', price: 149.90, originalPrice: 179.90, category: 'Ração',
    rating: 4.8, reviews: 203, badge: 'Promoção', stock: 35,
    img: 'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?auto=format&fit=crop&w=400&q=80',
    desc: 'Nutrição balanceada para filhotes em fase de crescimento. Com DHA para desenvolvimento cerebral.',
  },
  {
    name: 'Coleira Ajustável Nylon P/M/G', price: 39.90, category: 'Acessórios',
    rating: 4.7, reviews: 156, badge: null, stock: 60,
    img: 'https://plus.unsplash.com/premium_photo-1675802528760-49652a265696?auto=format&fit=crop&w=400&q=80',
    desc: 'Coleira resistente em nylon com fivela de metal. Disponível em vários tamanhos e cores.',
  },
  {
    name: 'Cama Pelúcia Antialérgica M', price: 119.90, originalPrice: 159.90, category: 'Acessórios',
    rating: 4.8, reviews: 94, badge: 'Promoção', stock: 20,
    img: 'https://images.unsplash.com/photo-1591946614720-90a587da4a36?auto=format&fit=crop&w=400&q=80',
    desc: 'Cama confortável com enchimento antialérgico. Lavável na máquina. Tamanho médio ideal para cães de até 12kg.',
  },
  {
    name: 'Comedouro Inox Duplo', price: 59.90, category: 'Acessórios',
    rating: 4.7, reviews: 211, badge: 'Destaque', stock: 45,
    img: 'https://images.unsplash.com/photo-1551717743-49959800b1f6?auto=format&fit=crop&w=400&q=80',
    desc: 'Comedouro e bebedouro em inox com suporte antiderrapante. Fácil de limpar e higiênico.',
  },
  {
    name: 'Guia Retátil 5 Metros', price: 69.90, category: 'Acessórios',
    rating: 4.6, reviews: 143, badge: null, stock: 30,
    img: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=400&q=80',
    desc: 'Guia retátil com trava de segurança e cabo de nylon reforçado. Suporta até 25kg.',
  },
  {
    name: 'Shampoo Hipoalergênico 500ml', price: 34.90, originalPrice: 49.90, category: 'Higiene',
    rating: 4.8, reviews: 267, badge: 'Oferta', stock: 55,
    img: 'https://images.unsplash.com/photo-1631729372330-23405dd6263d?auto=format&fit=crop&w=400&q=80',
    desc: 'Shampoo suave para cães e gatos com pele sensível. Sem parabenos, sulfatos ou corantes artificiais.',
  },
  {
    name: 'Condicionador Pet Neutro 300ml', price: 29.90, category: 'Higiene',
    rating: 4.6, reviews: 89, badge: 'Novo', stock: 40,
    img: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=400&q=80',
    desc: 'Condicionador que desembaraça e hidrata a pelagem. Deixa o pelo macio e com brilho natural.',
  },
  {
    name: 'Escova de Dentes Pet + Pasta', price: 22.90, category: 'Higiene',
    rating: 4.5, reviews: 112, badge: null, stock: 35,
    img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
    desc: 'Kit completo com escova e pasta dental pet. Sabor frango. Previne tártaro e mal hálito.',
  },
  {
    name: 'Antipulgas e Carrapatos — Coleira 8 meses', price: 89.90, originalPrice: 119.90, category: 'Medicamentos',
    rating: 4.9, reviews: 445, badge: 'Oferta', stock: 25,
    img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=400&q=80',
    desc: 'Coleira antiparasitária de longa duração. Protege contra pulgas e carrapatos por até 8 meses.',
  },
  {
    name: 'Vermífugo Oral Cães — 4 comp.', price: 28.90, category: 'Medicamentos',
    rating: 4.8, reviews: 389, badge: null, stock: 60,
    img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
    desc: 'Vermífugo de amplo espectro para cães. Combate os principais tipos de vermes intestinais.',
  },
  {
    name: 'Suplemento Vitamínico Cães 30 comp.', price: 54.90, category: 'Medicamentos',
    rating: 4.7, reviews: 178, badge: null, stock: 30,
    img: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=400&q=80',
    desc: 'Suplemento multivitamínico para cães adultos. Fortalece imunidade, articulações e pelagem.',
  },
  {
    name: 'Antipulgas Spot-on Gatos — 3 pipetas', price: 64.90, category: 'Medicamentos',
    rating: 4.8, reviews: 223, badge: 'Novo', stock: 20,
    img: 'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?auto=format&fit=crop&w=400&q=80',
    desc: 'Antipulgas em pipeta de aplicação tópica para gatos. Ação rápida e proteção de até 4 semanas.',
  },
] as const;

async function seed(): Promise<void> {
  await connectDatabase();

  const existing = await Product.countDocuments();
  if (existing > 0) {
    console.log(`[Seed] Banco já contém ${existing} produto(s). Pulando seed.`);
    await disconnectDatabase();
    return;
  }

  await Product.insertMany(PRODUCTS);
  console.log(`[Seed] ${PRODUCTS.length} produtos inseridos com sucesso.`);
  await disconnectDatabase();
}

seed().catch((err) => {
  console.error('[Seed] Erro:', err);
  process.exit(1);
});
