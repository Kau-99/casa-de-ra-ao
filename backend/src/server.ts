import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { connectDatabase } from './config/database';
import productsRouter from './routes/products';
import ordersRouter   from './routes/orders';
import contactRouter  from './routes/contact';
import authRouter     from './routes/auth';
import settingsRouter from './routes/settings';
import { Settings }   from './models';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

/* ---- Segurança ---- */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'"],
        styleSrc:    ["'self'", 'https://fonts.googleapis.com'],
        fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
        imgSrc:      ["'self'", 'data:', 'https://images.unsplash.com', 'https://plus.unsplash.com'],
        connectSrc:  ["'self'"],
      },
    },
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
  })
);

/* Aceita qualquer origem — segurança garantida pelo JWT nas rotas protegidas */
app.use(cors({ origin: true, credentials: true }));

/* ---- Parsing ---- */
app.use(express.json({ limit: '10kb' }));

/* ---- Rate limiting global ---- */
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
  })
);

/* ---- Health check ---- */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ---- Config pública — DB tem prioridade sobre env vars ---- */
app.get('/api/config', async (_req, res) => {
  try {
    const s = await Settings.findOne({});
    res.json({
      pixKey:     s?.pixKey       || process.env.STORE_PIX_KEY  || '',
      pixKeyType: s?.pixKeyType   || 'aleatoria',
      storeName:  s?.storeName    || process.env.STORE_NAME     || 'Helvinho Rações',
      storeCity:  s?.storeCity    || process.env.STORE_CITY     || 'São Paulo',
      storeHours: s?.storeHours   || 'Seg–Sex: 8h–20h | Sáb: 9h–18h',
      whatsapp:   s?.whatsapp     || process.env.STORE_WHATSAPP || '5511999999999',
      address:    s?.storeAddress || process.env.STORE_ADDRESS  || '',
    });
  } catch { res.json({}); }
});

/* ---- Rotas ---- */
app.use('/api/products', productsRouter);
app.use('/api/orders',   ordersRouter);
app.use('/api/contact',  contactRouter);
app.use('/api/auth',     authRouter);
app.use('/api/settings', settingsRouter);

/* ---- Erros ---- */
app.use(notFound);
app.use(errorHandler);

/* ---- Inicialização ---- */
const PORT = Number(process.env.PORT ?? 3001);

async function bootstrap(): Promise<void> {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`[API] Servidor rodando em http://localhost:${PORT}`);
    console.log(`[API] Ambiente: ${process.env.NODE_ENV ?? 'development'}`);
  });
}

bootstrap().catch((err) => {
  console.error('[API] Falha ao iniciar:', err);
  process.exit(1);
});

export default app;
