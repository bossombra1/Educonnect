import { Request, Response, NextFunction, RequestHandler } from 'express';

export function requireRole(...allowedRoles: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
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

export function requireAdmin(): RequestHandler {
  return requireRole('ADMIN', 'SUPER_ADMIN');
}

export function requireMobileUser(): RequestHandler {
  return requireRole('PARENT', 'STUDENT', 'STAFF');
}
