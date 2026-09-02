import { Response, NextFunction } from 'express';
import { getPool } from '../config/database.js';
import { RequestWithUser } from '../types/index.js';

export function auditLog(action: string, entityType: string) {
  return async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    const originalEnd = res.end;
    const statusCode = res.statusCode;

    res.end = function (...args: any[]) {
      logAudit(req, action, entityType, res.statusCode).catch(() => {});
      return (originalEnd as any).apply(this, args);
    };

    next();
  };
}

async function logAudit(
  req: RequestWithUser,
  action: string,
  entityType: string,
  statusCode: number
): Promise<void> {
  if (statusCode >= 400) return;

  try {
    const pool = getPool();
    const entityId = req.params?.id ? parseInt(req.params.id, 10) : null;
    const userId = req.user?.userId || null;
    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId, action, entityType, entityId, ipAddress, userAgent]
    );
  } catch {
    // Audit logging should never break the request
  }
}
