import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { Admin } from '../models';
import { requireAuth } from '../middleware/auth';
import { validateBody, loginSchema } from '../middleware/validation';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/* Limite agressivo no login para mitigar brute force */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function signToken(payload: { adminId: string; email: string; role: string }): string {
  const secret  = process.env.JWT_SECRET;
  const expires = process.env.JWT_EXPIRES_IN ?? '7d';

  if (!secret) throw new AppError('JWT_SECRET não configurado.', 500);

  return jwt.sign(payload, secret, { expiresIn: expires } as jwt.SignOptions);
}

/* POST /api/auth/login */
router.post('/login', loginLimiter, validateBody(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    /* Inclui o hash explicitamente — toJSON o remove por padrão */
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      /* Mensagem genérica para não revelar se o e-mail existe */
      return next(new AppError('Credenciais inválidas.', 401));
    }

    if (!admin.password) return next(new AppError('Credenciais inválidas.', 401));
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return next(new AppError('Credenciais inválidas.', 401));

    const token = signToken({
      adminId: admin._id.toString(),
      email:   admin.email,
      role:    admin.role,
    });

    res.json({
      token,
      admin: { id: admin._id, email: admin.email, role: admin.role },
    });
  } catch (err) {
    next(err);
  }
});

/* GET /api/auth/me — retorna o admin logado */
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const admin = await Admin.findById(req.admin?.adminId);
    if (!admin) return next(new AppError('Admin não encontrado.', 404));
    res.json(admin);
  } catch (err) {
    next(err);
  }
});

/* POST /api/auth/register — cria primeiro admin (somente em dev ou se não houver admin) */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await Admin.countDocuments();

    /* Bloqueia em produção após o primeiro admin estar criado */
    if (count > 0 && process.env.NODE_ENV === 'production') {
      return next(new AppError('Registro de admins desabilitado em produção.', 403));
    }

    const { email, password, role } = req.body as {
      email:    string;
      password: string;
      role?:    string;
    };

    if (!email || !password || password.length < 8) {
      return next(new AppError('Email e senha (mínimo 8 caracteres) são obrigatórios.', 400));
    }

    const hash  = await bcrypt.hash(password, 12);
    const admin = await Admin.create({
      email,
      password: hash,
      role:     count === 0 ? 'super' : (role ?? 'admin'),
    });

    const token = signToken({ adminId: admin._id.toString(), email: admin.email, role: admin.role });
    res.status(201).json({ token, admin: { id: admin._id, email: admin.email, role: admin.role } });
  } catch (err) {
    next(err);
  }
});

export default router;
