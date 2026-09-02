import { getPool } from '../config/database.js';
import { PaginationOptions, PaginationResult } from '../types/index.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export class BaseRepository<T extends Record<string, any>> {
  protected tableName: string;
  protected primaryKey = 'id';

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  protected getPool() {
    return getPool();
  }

  async findAll(
    filters?: Record<string, any>,
    pagination?: PaginationOptions
  ): Promise<PaginationResult> {
    const pool = this.getPool();
    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit || 20));
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];

    if (filters) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === '') continue;
        if (typeof value === 'object' && 'like' in value) {
          conditions.push(`${key} LIKE ?`);
          params.push(`%${value.like}%`);
        } else if (typeof value === 'object' && 'in' in value) {
          if (value.in.length > 0) {
            const placeholders = value.in.map(() => '?').join(',');
            conditions.push(`${key} IN (${placeholders})`);
            params.push(...value.in);
          }
        } else if (typeof value === 'object' && 'gt' in value) {
          conditions.push(`${key} > ?`);
          params.push(value.gt);
        } else if (typeof value === 'object' && 'lt' in value) {
          conditions.push(`${key} < ?`);
          params.push(value.lt);
        } else if (typeof value === 'object' && 'gte' in value) {
          conditions.push(`${key} >= ?`);
          params.push(value.gte);
        } else if (typeof value === 'object' && 'lte' in value) {
          conditions.push(`${key} <= ?`);
          params.push(value.lte);
        } else if (typeof value === 'object' && 'ne' in value) {
          conditions.push(`${key} != ?`);
          params.push(value.ne);
        } else {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      }
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }

    const countParams = [...params];
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`,
      countParams
    );
    const total = countRows[0].total as number;
    const totalPages = Math.ceil(total / limit);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY ${this.primaryKey} DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      data: rows as T[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findById(id: number): Promise<T | null> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`,
      [id]
    );
    if (rows.length === 0) return null;
    return rows[0] as T;
  }

  async create(data: Record<string, any>): Promise<T> {
    const pool = this.getPool();
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.join(', ');

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`,
      values
    );

    return this.findById(result.insertId) as Promise<T>;
  }

  async update(id: number, data: Record<string, any>): Promise<T | null> {
    const pool = this.getPool();
    const keys = Object.keys(data);
    if (keys.length === 0) return this.findById(id);

    const setClause = keys.map((key) => `${key} = ?`).join(', ');
    const values = Object.values(data);

    await pool.query(
      `UPDATE ${this.tableName} SET ${setClause}, updated_at = NOW() WHERE ${this.primaryKey} = ?`,
      [...values, id]
    );

    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const pool = this.getPool();
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }

  async count(filters?: Record<string, any>): Promise<number> {
    const pool = this.getPool();
    let whereClause = '';
    const params: any[] = [];

    if (filters) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === '') continue;
        conditions.push(`${key} = ?`);
        params.push(value);
      }
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`,
      params
    );
    return rows[0].total as number;
  }

  async findByField(field: string, value: any): Promise<T | null> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM ${this.tableName} WHERE ${field} = ? LIMIT 1`,
      [value]
    );
    if (rows.length === 0) return null;
    return rows[0] as T;
  }

  async rawQuery(sql: string, params?: any[]): Promise<RowDataPacket[]> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    return rows;
  }
}