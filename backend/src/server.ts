import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { connectDatabase } from './config/database';
import productsRouter from './routes/products';
import ordersRouter  from './routes/orders';
import contactRouter from './routes/contact';
import authRouter    from './routes/auth';
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

/* Em dev, aceita file:// (index.html aberto direto) e localhost em qualquer porta.
   Em produção, CORS_ORIGIN deve apontar para o domínio real. */
const isDev = (process.env.NODE_ENV ?? 'development') === 'development';
app.use(
  cors({
    origin: isDev
      ? (_origin: string | undefined, cb: (e: Error | null, ok?: boolean) => void) => cb(null, true)
      : process.env.CORS_ORIGIN,
    credentials: true,
  })
);

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

/* ---- Rotas ---- */
app.use('/api/products', productsRouter);
app.use('/api/orders',   ordersRouter);
app.use('/api/contact',  contactRouter);
app.use('/api/auth',     authRouter);

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
