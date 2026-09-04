import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getPool } from '../config/database.js';

function getActor(req: Request): any {
  return req.user as any;
}

/**
 * Réactive un utilisateur désactivé sans créer un nouveau compte.
 */
export async function reactivateUser(req: Request, res: Response): Promise<void> {
  try {
    const userId = Number(req.params.id);
    const actor = getActor(req);

    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({ success: false, error: 'ID utilisateur invalide.' });
      return;
    }

    const pool = getPool();
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.is_active, u.first_name, u.last_name, u.matricule, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? AND u.establishment_id = ?`,
      [userId, actor.establishmentId]
    );

    if (!users.length) {
      res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
      return;
    }

    const target = users[0];
    if (Number(target.is_active) === 1) {
      res.status(409).json({ success: false, error: 'Cet utilisateur est déjà actif.' });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE users SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND establishment_id = ?',
      [userId, actor.establishmentId]
    );

    if (!result.affectedRows) {
      res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Utilisateur réactivé avec succès.',
      data: { ...target, is_active: 1 },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
}

/**
 * Suppression définitive sécurisée.
 *
 * La suppression n'est autorisée que pour un utilisateur déjà inactif,
 * jamais pour un compte administrateur ni pour le compte de l'acteur courant.
 * Les FKs CASCADE/SET NULL sont laissées à MySQL. Les relations RESTRICT
 * sont détectées avant le DELETE afin de ne jamais casser l'intégrité.
 */
export async function permanentlyDeleteUser(req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const actor = getActor(req);
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({ success: false, error: 'ID utilisateur invalide.' });
    return;
  }

  if (userId === Number(actor.id)) {
    res.status(403).json({ success: false, error: 'Vous ne pouvez pas supprimer définitivement votre propre compte.' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [users] = await conn.query<RowDataPacket[]>(
      `SELECT u.id, u.is_active, u.first_name, u.last_name, u.matricule, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? AND u.establishment_id = ?
       FOR UPDATE`,
      [userId, actor.establishmentId]
    );

    if (!users.length) {
      await conn.rollback();
      res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
      return;
    }

    const target = users[0];
    if (Number(target.is_active) === 1) {
      await conn.rollback();
      res.status(409).json({ success: false, error: 'Désactivez d’abord cet utilisateur avant de le supprimer définitivement.' });
      return;
    }

    const [administrators] = await conn.query<RowDataPacket[]>(
      'SELECT id, role_type FROM administrators WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (administrators.length) {
      await conn.rollback();
      res.status(403).json({
        success: false,
        error: 'Un compte administrateur ne peut pas être supprimé définitivement depuis ce module.',
      });
      return;
    }

    // Vérifie uniquement les relations dont la règle de suppression est restrictive.
    // Les identifiants de table/colonne proviennent d'INFORMATION_SCHEMA, jamais de l'utilisateur.
    const [foreignKeys] = await conn.query<RowDataPacket[]>(
      `SELECT TABLE_NAME, COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
         AND REFERENCED_TABLE_NAME = 'users'
         AND REFERENCED_COLUMN_NAME = 'id'`
    );

    const blockers: Array<{ table: string; column: string; count: number }> = [];
    for (const fk of foreignKeys) {
      const tableName = String(fk.TABLE_NAME);
      const columnName = String(fk.COLUMN_NAME);
      const [rules] = await conn.query<RowDataPacket[]>(
        `SELECT DELETE_RULE
         FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
         WHERE CONSTRAINT_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND REFERENCED_TABLE_NAME = 'users'
         LIMIT 1`,
        [tableName]
      );
      const deleteRule = String(rules[0]?.DELETE_RULE || '').toUpperCase();
      if (!['RESTRICT', 'NO ACTION'].includes(deleteRule)) continue;

      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM \`${tableName.replace(/`/g, '``')}\` WHERE \`${columnName.replace(/`/g, '``')}\` = ?`,
        [userId]
      );
      const count = Number(rows[0]?.total || 0);
      if (count > 0) blockers.push({ table: tableName, column: columnName, count });
    }

    if (blockers.length) {
      await conn.rollback();
      res.status(409).json({
        success: false,
        error: 'Suppression définitive impossible : des données protégées dépendent encore de cet utilisateur.',
        blockers,
      });
      return;
    }

    // L'acteur est conservé comme auteur de la trace d'audit ; entity_id pointe vers l'utilisateur supprimé.
    await conn.query<ResultSetHeader>(
      `INSERT INTO audit_logs
       (establishment_id, user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES (?, ?, 'DELETE_USER_PERMANENT', 'user', ?, ?, ?, ?)`,
      [
        actor.establishmentId,
        actor.id,
        userId,
        JSON.stringify({ role: target.role_name, matricule: target.matricule, name: `${target.first_name} ${target.last_name}` }),
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );

    const [deleted] = await conn.query<ResultSetHeader>(
      'DELETE FROM users WHERE id = ? AND establishment_id = ? AND is_active = 0',
      [userId, actor.establishmentId]
    );

    if (!deleted.affectedRows) {
      await conn.rollback();
      res.status(409).json({ success: false, error: 'L’utilisateur n’a pas pu être supprimé.' });
      return;
    }

    await conn.commit();
    res.status(200).json({
      success: true,
      message: 'Utilisateur supprimé définitivement de la base de données.',
      data: { id: userId },
    });
  } catch (err) {
    await conn.rollback();
    const mysqlError = err as any;
    if (mysqlError?.code === 'ER_ROW_IS_REFERENCED_2' || mysqlError?.code === 'ER_ROW_IS_REFERENCED') {
      res.status(409).json({
        success: false,
        error: 'Suppression impossible : des données liées protègent encore cet utilisateur.',
      });
      return;
    }
    res.status(500).json({ success: false, error: mysqlError?.message || 'Erreur lors de la suppression définitive.' });
  } finally {
    conn.release();
  }
}
