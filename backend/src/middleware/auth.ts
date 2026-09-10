import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { JwtPayload } from '../types/index.js';
import { getPool } from '../config/database.js';

export const authenticate: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Token manquant. Veuillez vous authentifier.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
    void getPool().query('SELECT u.id, u.establishment_id, u.is_active, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ? LIMIT 1', [decoded.userId])
      .then(([rows]) => {
        const user = (rows as Array<{ id: number; establishment_id: number; is_active: number; role: string }>)[0];
        if (!user || !user.is_active) {
          res.status(401).json({ success: false, error: 'Compte désactivé ou session invalide.' });
          return;
        }
        req.user = { ...decoded, role: user.role, establishmentId: user.establishment_id, email: req.user?.email ?? '' };
        next();
      })
      .catch(() => res.status(401).json({ success: false, error: "Erreur d'authentification." }));
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token expiré. Veuillez vous reconnecter.' });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Token invalide.' });
      return;
    }
    res.status(401).json({ success: false, error: "Erreur d'authentification." });
  }
};

export const optionalAuth: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
    req.user = { ...decoded, email: req.user?.email ?? '' };
  } catch {
    // Ignore invalid token for optional auth
  }
  next();
};
