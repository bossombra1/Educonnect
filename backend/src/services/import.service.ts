import XLSX from 'xlsx';
import { getPool } from '../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { ImportResult } from '../types/index.js';

interface ExcelRow {
  'Nom': string;
  'Prénom': string;
  'Matricule': string;
  'Classe': string;
  'Date d’admission'?: unknown;
  'admission_date'?: unknown;
  'E-mail élève': string;
  'Téléphone élève': string;
  'Nom complet Parent 1'?: string;
  'Tél Parent 1'?: string;
  'Nom complet Parent 2'?: string;
  'Tél Parent 2'?: string;
  'Nom complet Père'?: string;
  'Tél Père'?: string;
  'Nom complet Mère'?: string;
  'Tél Mère'?: string;
}

const DEFAULT_SCHOOL_YEAR = '2025-2026';
const REQUIRED_COLUMNS = ['Nom', 'Prénom', 'Matricule', 'Classe'] as const;
const TEMPLATE_EXAMPLE_MATRICULE = 'EXEMPLE';

function normalizeHeader(value: unknown): string {
  return String(value ?? '').replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim();
}

function findHeaderRow(sheet: XLSX.WorkSheet): number {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const required = new Set(REQUIRED_COLUMNS);
  const headerIndex = matrix.findIndex((row) => {
    const headers = new Set((row || []).map(normalizeHeader));
    return [...required].every((column) => headers.has(column));
  });
  if (headerIndex < 0) throw new Error('En-têtes introuvables. Le fichier doit contenir les colonnes : Nom, Prénom, Matricule, Classe.');
  return headerIndex;
}

function normalizeParentColumns<T extends Record<string, any>>(row: T): T & Record<string, any> {
  return {
    ...row,
    'Nom complet Parent 1': row['Nom complet Parent 1'] ?? row['Nom complet Père'] ?? '',
    'Tél Parent 1': row['Tél Parent 1'] ?? row['Tél Père'] ?? '',
    'Nom complet Parent 2': row['Nom complet Parent 2'] ?? row['Nom complet Mère'] ?? '',
    'Tél Parent 2': row['Tél Parent 2'] ?? row['Tél Mère'] ?? '',
  };
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const normalized = fullName.trim().replace(/\s+/g, ' ');
  if (!normalized) return { firstName: '', lastName: '' };
  const [firstName, ...rest] = normalized.split(' ');
  return { firstName, lastName: rest.join(' ') || firstName };
}

function parseAdmissionDate(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error('Date d’admission invalide.');
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed || !parsed.y || !parsed.m || !parsed.d) throw new Error('Date d’admission Excel invalide.');
    const date = `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    const check = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(check.getTime()) || check.toISOString().slice(0, 10) !== date) throw new Error('Date d’admission Excel invalide.');
    return date;
  }
  const text = String(value).trim();
  if (!text) return null;
  const normalized = text.replace(/\//g, '-').replace(/\s+/g, ' ');
  const isoMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const date = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    const check = new Date(`${date}T00:00:00Z`);
    if (!Number.isNaN(check.getTime()) && check.toISOString().slice(0, 10) === date) return date;
  }
  const frMatch = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (frMatch) {
    const date = `${frMatch[3]}-${frMatch[2].padStart(2, '0')}-${frMatch[1].padStart(2, '0')}`;
    const check = new Date(`${date}T00:00:00Z`);
    if (!Number.isNaN(check.getTime()) && check.toISOString().slice(0, 10) === date) return date;
  }
  throw new Error('Date d’admission invalide. Utilisez AAAA-MM-JJ ou JJ-MM-AAAA.');
}

function normalizePhone(value: unknown): string {
  return String(value ?? '').trim();
}

function errorForRow(errors: ImportResult['errors'], row: number): boolean {
  return errors.some((error) => error.row === row);
}

async function findParentByPhone(conn: any, establishmentId: number, phone: string): Promise<{ parentId: number; userId: number } | null> {
  if (!phone) return null;
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT p.id AS parent_id, u.id AS user_id
     FROM parents p
     JOIN users u ON u.id = p.user_id
     WHERE p.establishment_id = ?
       AND u.establishment_id = ?
       AND u.is_active = 1
       AND u.phone = ?
     LIMIT 1`,
    [establishmentId, establishmentId, phone]
  );
  return rows.length ? { parentId: Number(rows[0].parent_id), userId: Number(rows[0].user_id) } : null;
}

async function createParentIfNeeded(
  conn: any,
  establishmentId: number,
  parentRoleId: number,
  fullName: string,
  phone: string,
  fallbackLastName: string,
  matriculePrefix: string,
): Promise<{ parentId: number; userId: number }> {
  const existing = await findParentByPhone(conn, establishmentId, phone);
  if (existing) return existing;

  const name = splitFullName(fullName);
  const firstName = name.firstName || 'Parent';
  const lastName = name.lastName || fallbackLastName;
  let matricule = `${matriculePrefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  let attempt = 0;
  while (attempt < 10) {
    const [duplicates] = await conn.query<RowDataPacket[]>('SELECT id FROM users WHERE matricule = ? LIMIT 1', [matricule]);
    if (!duplicates.length) break;
    attempt += 1;
    matricule = `${matriculePrefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }
  const password = await bcrypt.hash(matricule, 10);
  const [userResult] = await conn.query<ResultSetHeader>(
    'INSERT INTO users (establishment_id, role_id, matricule, first_name, last_name, phone, password_hash, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
    [establishmentId, parentRoleId, matricule, firstName, lastName, phone || null, password]
  );
  const [parentResult] = await conn.query<ResultSetHeader>(
    'INSERT INTO parents (user_id, establishment_id, profession, is_primary_contact) VALUES (?, ?, ?, ?)',
    [userResult.insertId, establishmentId, null, 1]
  );
  return { parentId: parentResult.insertId, userId: userResult.insertId };
}

async function linkParentStudent(conn: any, parentId: number, studentId: number, priority: 'parent1' | 'parent2'): Promise<void> {
  const [existing] = await conn.query<RowDataPacket[]>(
    'SELECT id FROM parent_student WHERE parent_id = ? AND student_id = ? LIMIT 1',
    [parentId, studentId]
  );
  if (existing.length) {
    await conn.query(
      'UPDATE parent_student SET priority = ?, is_emergency_contact = ? WHERE id = ?',
      [priority, priority === 'parent1' ? 1 : 0, existing[0].id]
    );
    return;
  }
  await conn.query(
    'INSERT INTO parent_student (parent_id, student_id, priority, is_emergency_contact) VALUES (?, ?, ?, ?)',
    [parentId, studentId, priority, priority === 'parent1' ? 1 : 0]
  );
}

export function generateStudentsImportTemplate(): Buffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Modèle officiel — Import des élèves'],
    ['Nom', 'Prénom', 'Matricule', 'Classe', 'Date d’admission', 'E-mail élève', 'Téléphone élève', 'Nom complet Père', 'Tél Père', 'Nom complet Mère', 'Tél Mère'],
    ['YAPO', 'Jean', 'EXEMPLE', '3ème C', '2025-09-01', 'jean.yapo@gmail.com', '0748123456', 'Marie YAPO', '0708123456', 'Jean-Pierre YAPO', '0509123456'],
  ]);
  sheet['!cols'] = [{ wch: 24 }, { wch: 24 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 30 }, { wch: 22 }, { wch: 30 }, { wch: 20 }, { wch: 30 }, { wch: 20 }];
  sheet['!freeze'] = { xSplit: 0, ySplit: 2 };
  sheet['!autofilter'] = { ref: 'A2:K3' };
  for (const address of ['A2', 'B2', 'C2', 'D2']) sheet[address].c = [{ a: 'EduConnect', t: 'Champ obligatoire' }];
  sheet['E2'].c = [{ a: 'EduConnect', t: 'Champ facultatif — date réelle d’admission' }];
  for (const address of ['F2', 'G2']) sheet[address].c = [{ a: 'EduConnect', t: 'Champ facultatif — coordonnées de l’élève' }];
  for (const address of ['H2', 'I2']) sheet[address].c = [{ a: 'EduConnect', t: 'Champ facultatif — coordonnées du père' }];
  for (const address of ['J2', 'K2']) sheet[address].c = [{ a: 'EduConnect', t: 'Champ facultatif — coordonnées de la mère' }];
  const instructions = XLSX.utils.aoa_to_sheet([
    ['Instructions d’utilisation'],
    ['Colonnes obligatoires', 'Nom, Prénom, Matricule, Classe'],
    ['Colonnes facultatives', 'Date d’admission, E-mail élève, Téléphone élève, Nom complet Père, Tél Père, Nom complet Mère, Tél Mère'],
    ['Date d’admission', 'Utilisez AAAA-MM-JJ ou JJ-MM-AAAA. Une date Excel classique est également acceptée. Si la colonne est absente ou vide, la base conserve NULL.'],
    ['Ligne d’exemple', 'La ligne contenant le matricule EXEMPLE est ignorée automatiquement par EduConnect.'],
    ['Père et mère', 'Les colonnes Nom complet Père / Tél Père et Nom complet Mère / Tél Mère permettent d’enregistrer les coordonnées réelles. Le système conserve la distinction technique Parent 1 / Parent 2 en interne.'],
    ['Format', 'Conservez les noms exacts des colonnes et renseignez une ligne par élève.'],
  ]);
  instructions['!cols'] = [{ wch: 28 }, { wch: 110 }];
  XLSX.utils.book_append_sheet(workbook, sheet, 'Élèves');
  XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export async function importStudentsFromExcel(fileBuffer: Buffer, establishmentId: number, importedBy: number): Promise<ImportResult> {
  const pool = getPool();
  const result: ImportResult = { totalRows: 0, successCount: 0, failCount: 0, errors: [] };
  const [importer] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE id = ? AND establishment_id = ?', [importedBy, establishmentId]);
  if (!importer.length) throw new Error('Utilisateur importateur invalide pour cet établissement.');

  let workbook: XLSX.WorkBook;
  try { workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true }); }
  catch { throw new Error('Fichier Excel invalide ou corrompu.'); }
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Le fichier Excel ne contient aucune feuille.');
  const sheet = workbook.Sheets[sheetName];
  const headerRow = findHeaderRow(sheet);
  const rawRows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { range: headerRow, defval: '' });
  const rows = rawRows.map(normalizeParentColumns);
  const importRows = rows.filter((row) => String(row.Matricule || '').trim().toUpperCase() !== TEMPLATE_EXAMPLE_MATRICULE);
  result.totalRows = importRows.length;
  if (!importRows.length) throw new Error('Le fichier Excel ne contient aucune donnée élève après les en-têtes.');
  for (const col of REQUIRED_COLUMNS) if (!(col in importRows[0])) throw new Error(`Colonne manquante: ${col}`);

  const matriculeSet = new Set<string>();
  const duplicateRows = new Set<number>();
  for (let i = 0; i < importRows.length; i++) {
    const row = importRows[i];
    const rowNumber = rows.indexOf(row) + headerRow + 2;
    const matricule = String(row.Matricule || '').trim();
    if (!matricule) {
      result.errors.push({ row: rowNumber, message: 'Matricule manquant.' });
      duplicateRows.add(rowNumber);
      continue;
    }
    if (matriculeSet.has(matricule)) {
      result.errors.push({ row: rowNumber, message: `Matricule en double: ${matricule}` });
      duplicateRows.add(rowNumber);
      continue;
    }
    matriculeSet.add(matricule);
  }

  const uniqueMatricules = [...matriculeSet];
  const existingMatricules = new Set<string>();
  if (uniqueMatricules.length) {
    const placeholders = uniqueMatricules.map(() => '?').join(',');
    const [existingUsers] = await pool.query<RowDataPacket[]>(
      `SELECT matricule FROM users WHERE establishment_id = ? AND matricule IN (${placeholders})`,
      [establishmentId, ...uniqueMatricules]
    );
    for (const user of existingUsers) existingMatricules.add(String(user.matricule));
    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i];
      const rowNumber = rows.indexOf(row) + headerRow + 2;
      const matricule = String(row.Matricule || '').trim();
      if (existingMatricules.has(matricule) && !duplicateRows.has(rowNumber)) {
        result.errors.push({ row: rowNumber, message: `Matricule déjà existant: ${matricule}` });
        duplicateRows.add(rowNumber);
      }
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [studentRole] = await conn.query<RowDataPacket[]>("SELECT id FROM roles WHERE name = 'STUDENT' LIMIT 1");
    const studentRoleId = Number(studentRole[0]?.id);
    if (!studentRoleId) throw new Error('Rôle STUDENT non trouvé dans la base.');
    const [parentRole] = await conn.query<RowDataPacket[]>("SELECT id FROM roles WHERE name = 'PARENT' LIMIT 1");
    const parentRoleId = Number(parentRole[0]?.id);
    const parseClassName = (className: string) => {
      const match = className.match(/^(\d+[A-Za-z]?)(?:\s*[-–]\s*(\S+))?$/);
      return match ? { level: match[1], section: match[2] || null } : { level: className, section: null };
    };

    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i];
      const excelRowNumber = rows.indexOf(row) + headerRow + 2;
      if (errorForRow(result.errors, excelRowNumber)) continue;

      try {
        const lastName = String(row['Nom'] || '').trim();
        const firstName = String(row['Prénom'] || '').trim();
        const matricule = String(row['Matricule'] || '').trim();
        const className = String(row['Classe'] || '').trim();
        if (!lastName || !firstName || !matricule || !className) {
          throw new Error('Champs requis manquants (Nom, Prénom, Matricule, Classe).');
        }

        const admissionDate = parseAdmissionDate(row['Date d’admission'] ?? row['admission_date']);
        const studentEmail = String(row['E-mail élève'] || '').trim();
        const studentPhone = String(row['Téléphone élève'] || '').trim();
        const parent1FullName = String(row['Nom complet Parent 1'] || '').trim();
        const parent2FullName = String(row['Nom complet Parent 2'] || '').trim();
        const telParent1 = normalizePhone(row['Tél Parent 1']);
        const telParent2 = normalizePhone(row['Tél Parent 2']);

        const [classes] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM classes WHERE name = ? AND establishment_id = ? AND school_year = ?',
          [className, establishmentId, DEFAULT_SCHOOL_YEAR]
        );
        let classId: number;
        if (!classes.length) {
          const parsed = parseClassName(className);
          const [classResult] = await conn.query<ResultSetHeader>(
            'INSERT INTO classes (establishment_id, name, level, section, school_year) VALUES (?, ?, ?, ?, ?)',
            [establishmentId, className, parsed.level, parsed.section, DEFAULT_SCHOOL_YEAR]
          );
          classId = classResult.insertId;
        } else classId = Number(classes[0].id);

        const studentPassword = await bcrypt.hash(matricule, 10);
        const [studentUser] = await conn.query<ResultSetHeader>(
          'INSERT INTO users (establishment_id, role_id, matricule, first_name, last_name, email, phone, password_hash, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
          [establishmentId, studentRoleId, matricule, firstName, lastName, studentEmail || null, studentPhone || null, studentPassword]
        );
        const [studentResult] = await conn.query<ResultSetHeader>(
          "INSERT INTO students (user_id, class_id, establishment_id, matricule_scolaire, admission_date, status) VALUES (?, ?, ?, ?, ?, 'active')",
          [studentUser.insertId, classId, establishmentId, matricule, admissionDate]
        );
        const studentId = studentResult.insertId;

        if ((parent1FullName || telParent1 || parent2FullName || telParent2) && parentRoleId) {
          const parent1Exists = Boolean(parent1FullName || telParent1);
          const parent2Exists = Boolean(parent2FullName || telParent2);
          let parent1: { parentId: number; userId: number } | null = null;
          let parent2: { parentId: number; userId: number } | null = null;

          if (parent1Exists) {
            parent1 = await createParentIfNeeded(conn, establishmentId, parentRoleId, parent1FullName, telParent1, lastName, 'PAR');
            await linkParentStudent(conn, parent1.parentId, studentId, 'parent1');
          }

          if (parent2Exists) {
            const existingByPhone = telParent2 ? await findParentByPhone(conn, establishmentId, telParent2) : null;
            if (existingByPhone && parent1 && existingByPhone.parentId === parent1.parentId) {
              parent2 = existingByPhone;
            } else if (parent1 && telParent1 && telParent2 && telParent1 === telParent2) {
              parent2 = parent1;
            } else {
              parent2 = await createParentIfNeeded(conn, establishmentId, parentRoleId, parent2FullName, telParent2, lastName, 'PAR');
            }
            if (!parent1 || parent2.parentId !== parent1.parentId) {
              await linkParentStudent(conn, parent2.parentId, studentId, 'parent2');
            }
          }
        }
        result.successCount++;
      } catch (err) {
        result.errors.push({ row: excelRowNumber, message: `Erreur: ${(err as Error).message}` });
      }
    }

    result.failCount = result.totalRows - result.successCount;
    const importStatus = result.failCount === 0 ? 'completed' : 'failed';
    await conn.query<ResultSetHeader>(
      'INSERT INTO imports (establishment_id, filename, file_url, total_rows, imported_rows, failed_rows, status, error_log, imported_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [establishmentId, 'import.xlsx', `uploads/import-${Date.now()}.xlsx`, result.totalRows, result.successCount, result.failCount, importStatus, result.errors.length ? JSON.stringify(result.errors) : null, importedBy]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return result;
}

export async function previewImport(fileBuffer: Buffer): Promise<{ totalRows: number; columns: string[]; sampleRows: Record<string, any>[] }> {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName!];
  const headerRow = findHeaderRow(sheet);
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { range: headerRow, defval: '' });
  const rows = rawRows.map(normalizeParentColumns);
  const filteredRows = rows.filter((row) => String(row.Matricule || '').trim().toUpperCase() !== TEMPLATE_EXAMPLE_MATRICULE);
  return { totalRows: filteredRows.length, columns: rows.length ? Object.keys(rows[0]) : [], sampleRows: filteredRows.slice(0, 5) };
}

export async function getImportHistory(establishmentId: number, pagination: { page?: number; limit?: number }): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
  const pool = getPool();
  const page = Math.max(1, pagination.page || 1);
  const limit = Math.min(100, Math.max(1, pagination.limit || 20));
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM imports WHERE establishment_id = ?', [establishmentId]);
  const total = Number(countRows[0].total);
  const [imports] = await pool.query<RowDataPacket[]>(
    'SELECT i.*, u.email as imported_by_email FROM imports i LEFT JOIN users u ON u.id = i.imported_by AND u.establishment_id = i.establishment_id WHERE i.establishment_id = ? ORDER BY i.created_at DESC LIMIT ? OFFSET ?',
    [establishmentId, limit, offset]
  );
  return { data: imports, total, page, limit, totalPages: Math.ceil(total / limit) };
}