import { BaseRepository } from '../repositories/base.repository.js';
import { Class, PaginationOptions, PaginationResult } from '../types/index.js';
import { RowDataPacket } from 'mysql2/promise';

export class ClassModel extends BaseRepository<Class> {
  constructor() {
    super('classes');
  }

  async findByEstablishment(
    establishmentId: number,
    pagination?: PaginationOptions
  ): Promise<PaginationResult> {
    return this.findAll(
      { establishment_id: establishmentId, is_active: 1 },
      pagination
    );
  }

  async findByLevel(level: string, establishmentId: number): Promise<Class[]> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM classes
       WHERE level = ? AND establishment_id = ? AND is_active = 1
       ORDER BY name ASC`,
      [level, establishmentId]
    );
    return rows as Class[];
  }

  async findWithStudentCount(
    establishmentId: number,
    pagination?: PaginationOptions
  ): Promise<PaginationResult> {
    const pool = this.getPool();
    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit || 20));
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM classes
       WHERE establishment_id = ? AND is_active = 1`,
      [establishmentId]
    );
    const total = countRows[0].total as number;
    const totalPages = Math.ceil(total / limit);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.*,
              (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') as student_count
       FROM classes c
       WHERE c.establishment_id = ? AND c.is_active = 1
       ORDER BY c.level, c.name
       LIMIT ? OFFSET ?`,
      [establishmentId, limit, offset]
    );

    return { data: rows as Class[], total, page, limit, totalPages };
  }

  async getLevels(establishmentId: number): Promise<string[]> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT level
       FROM classes
       WHERE establishment_id = ? AND is_active = 1
       ORDER BY level ASC`,
      [establishmentId]
    );
    return rows.map((r) => r.level as string);
  }
}
