import { Response, NextFunction } from 'express';
import { RequestWithUser } from '../types/index.js';

export function requireRole(...allowedRoles: string[]) {
  return (req: RequestWithUser, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentification requise.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Accès refusé. Rôle insuffisant.' });
      return;
    }

    next();
  };
}

export function requireAdmin() {
  return requireRole('ADMIN', 'SUPER_ADMIN');
}

export function requireMobileUser() {
  return requireRole('PARENT', 'STUDENT', 'STAFF');
}
