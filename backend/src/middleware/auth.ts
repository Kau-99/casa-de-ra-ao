import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export interface AuthPayload {
  adminId: string;
  email:   string;
  role:    string;
}

/* Estende Request para carregar o payload do JWT após autenticação */
declare global {
  namespace Express {
    interface Request {
      admin?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Token de autenticação não fornecido.', 401));
  }

  const token = header.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return next(new AppError('Configuração de segurança inválida.', 500));
  }

  try {
    req.admin = jwt.verify(token, secret) as AuthPayload;
    next();
  } catch {
    next(new AppError('Token inválido ou expirado.', 401));
  }
}

export function requireSuper(req: Request, _res: Response, next: NextFunction): void {
  if (req.admin?.role !== 'super') {
    return next(new AppError('Permissão insuficiente.', 403));
  }
  next();
}
