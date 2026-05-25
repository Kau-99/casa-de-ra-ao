import { Request, Response, NextFunction } from 'express';

/* Erro operacional com status HTTP explícito */
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/* 404 para rotas não encontradas */
export function notFound(req: Request, res: Response, next: NextFunction): void {
  next(new AppError(`Rota não encontrada: ${req.method} ${req.originalUrl}`, 404));
}

/* Handler centralizado — diferencia erros operacionais de bugs inesperados */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  /* Erros de validação do Mongoose */
  if (err.name === 'ValidationError') {
    res.status(400).json({ error: 'Dados inválidos.', details: err.message });
    return;
  }

  /* Chave única duplicada no MongoDB (e.g. email já cadastrado) */
  if ('code' in err && (err as NodeJS.ErrnoException).code === '11000') {
    res.status(409).json({ error: 'Registro já existe.' });
    return;
  }

  /* JWT inválido ou expirado */
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  /* Erro inesperado — não expõe detalhes em produção */
  const isProd = process.env.NODE_ENV === 'production';
  console.error('[ERROR]', err);

  res.status(500).json({
    error: 'Erro interno do servidor.',
    ...(isProd ? {} : { details: err.message, stack: err.stack }),
  });
}
