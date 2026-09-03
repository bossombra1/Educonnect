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
  'Tél Parent 1': string;
  'Tél Parent 2': string;
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

  if (headerIndex < 0) {
    throw new Error('En-têtes introuvables. Le fichier doit contenir les colonnes : Nom, Prénom, Matricule, Classe.');
  }

  return headerIndex;
}

/**
 * Génère le modèle Excel officiel utilisé par l'import des élèves.
 * Les 4 premières colonnes sont obligatoires. Les deux téléphones parentaux sont facultatifs.
 */
export function generateStudentsImportTemplate(): Buffer {
  const workbook = XLSX.utils.book_new();

  const sheet = XLSX.utils.aoa_to_sheet([
    ['Modèle officiel — Import des élèves'],
    ['Nom', 'Prénom', 'Matricule', 'Classe', 'Tél Parent 1', 'Tél Parent 2'],
    ['YAPO', 'Jean', 'EXEMPLE', '3ème C', '0700000000', '0500000000'],
  ]);

  sheet['!cols'] = [
    { wch: 24 },
    { wch: 24 },
    { wch: 20 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
  ];
  sheet['!freeze'] = { xSplit: 0, ySplit: 2 };
  sheet['!autofilter'] = { ref: 'A2:F3' };

  // Commentaires explicites sur les colonnes obligatoires.
  for (const address of ['A2', 'B2', 'C2', 'D2']) {
    sheet[address].c = [{ a: 'EduConnect', t: 'Champ obligatoire' }];
  }
  for (const address of ['E2', 'F2']) {
    sheet[address].c = [{ a: 'EduConnect', t: 'Champ facultatif — téléphone du parent' }];
  }

  const instructions = XLSX.utils.aoa_to_sheet([
    ['Instructions d’utilisation'],
    ['Colonnes obligatoires', 'Nom, Prénom, Matricule, Classe'],
    ['Colonnes facultatives', 'Tél Parent 1, Tél Parent 2'],
    ['Ligne d’exemple', 'La ligne contenant le matricule EXEMPLE est ignorée automatiquement par EduConnect.'],
    ['Format', 'Conservez les noms exacts des colonnes et renseignez une ligne par élève.'],
  ]);
  instructions['!cols'] = [{ wch: 28 }, { wch: 95 }];

  XLSX.utils.book_append_sheet(workbook, sheet, 'Élèves');
  XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export async function importStudentsFromExcel(fileBuffer: Buffer, establishmentId: number, importedBy: number): Promise<ImportResult> {
  const pool = getPool();
  const result: ImportResult = { totalRows: 0, successCount: 0, failCount: 0, errors: [] };

  const [importer] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM users WHERE id = ? AND establishment_id = ?',
    [importedBy, establishmentId]
  );
  if (importer.length === 0) throw new Error('Utilisateur importateur invalide pour cet établissement.');

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  } catch {
    throw new Error('Fichier Excel invalide ou corrompu.');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Le fichier Excel ne contient aucune feuille.');
  const sheet = workbook.Sheets[sheetName];
  const headerRow = findHeaderRow(sheet);
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { range: headerRow, defval: '' });

  // Le modèle officiel contient une ligne d'exemple volontairement ignorée.
  const importRows = rows.filter((row) => String(row.Matricule || '').trim().toUpperCase() !== TEMPLATE_EXAMPLE_MATRICULE);
  result.totalRows = importRows.length;

  if (importRows.length === 0) {
    throw new Error('Le fichier Excel ne contient aucune donnée élève après les en-têtes.');
  }

  for (const col of REQUIRED_COLUMNS) {
    if (!(col in importRows[0])) throw new Error(`Colonne manquante: ${col}`);
  }

  const matriculeSet = new Set<string>();
  for (let i = 0; i < importRows.length; i++) {
    const matricule = String(importRows[i].Matricule || '').trim();
    const excelRowNumber = rows.indexOf(importRows[i]) + headerRow + 2;

    if (!matricule) {
      result.errors.push({ row: excelRowNumber, message: 'Matricule manquant.' });
      result.failCount++;
      continue;
    }
    if (matriculeSet.has(matricule)) {
      result.errors.push({ row: excelRowNumber, message: `Matricule en double: ${matricule}` });
      result.failCount++;
      continue;
    }
    matriculeSet.add(matricule);
  }

  const uniqueMatricules = [...matriculeSet];
  if (uniqueMatricules.length > 0) {
    const placeholders = uniqueMatricules.map(() => '?').join(',');
    const [existingUsers] = await pool.query<RowDataPacket[]>(
      `SELECT matricule FROM users WHERE establishment_id = ? AND matricule IN (${placeholders})`,
      [establishmentId, ...uniqueMatricules]
    );
    const existingMatricules = new Set(existingUsers.map((u) => String(u.matricule)));

    for (let i = 0; i < importRows.length; i++) {
      const matricule = String(importRows[i].Matricule || '').trim();
      if (existingMatricules.has(matricule)) {
        result.errors.push({ row: rows.indexOf(importRows[i]) + headerRow + 2, message: `Matricule déjà existant: ${matricule}` });
      }
    }
    result.failCount += importRows.filter((row) => existingMatricules.has(String(row.Matricule || '').trim())).length;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [studentRole] = await conn.query<RowDataPacket[]>("SELECT id FROM roles WHERE name = 'STUDENT' LIMIT 1");
    const studentRoleId = studentRole[0]?.id;
    if (!studentRoleId) throw new Error('Rôle STUDENT non trouvé dans la base.');

    const [parentRole] = await conn.query<RowDataPacket[]>("SELECT id FROM roles WHERE name = 'PARENT' LIMIT 1");
    const parentRoleId = parentRole[0]?.id;

    const parseClassName = (className: string) => {
      const match = className.match(/^(\d+[A-Za-z]?)(?:\s*[-–]\s*(\S+))?$/);
      return match ? { level: match[1], section: match[2] || null } : { level: className, section: null };
    };

    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i];
      const excelRowNumber = rows.indexOf(row) + headerRow + 2;
      const lastName = String(row['Nom'] || '').trim();
      const firstName = String(row['Prénom'] || '').trim();
      const matricule = String(row['Matricule'] || '').trim();
      const className = String(row['Classe'] || '').trim();
      const telParent1 = String(row['Tél Parent 1'] || '').trim();
      const telParent2 = String(row['Tél Parent 2'] || '').trim();

      if (!lastName || !firstName || !matricule || !className) {
        result.errors.push({ row: excelRowNumber, message: 'Champs requis manquants (Nom, Prénom, Matricule, Classe).' });
        result.failCount++;
        continue;
      }

      if (result.errors.some((e) => e.row === excelRowNumber && (e.message.includes('double') || e.message.includes('déjà')))) continue;

      try {
        const [classes] = await conn.query<RowDataPacket[]>(
          'SELECT id FROM classes WHERE name = ? AND establishment_id = ? AND school_year = ?',
          [className, establishmentId, DEFAULT_SCHOOL_YEAR]
        );

        let classId: number;
        if (classes.length === 0) {
          const parsed = parseClassName(className);
          const [classResult] = await conn.query<ResultSetHeader>(
            'INSERT INTO classes (establishment_id, name, level, section, school_year) VALUES (?, ?, ?, ?, ?)',
            [establishmentId, className, parsed.level, parsed.section, DEFAULT_SCHOOL_YEAR]
          );
          classId = classResult.insertId;
        } else {
          classId = classes[0].id;
        }

        const studentPassword = await bcrypt.hash(matricule, 10);
        const [studentUser] = await conn.query<ResultSetHeader>(
          'INSERT INTO users (establishment_id, role_id, matricule, first_name, last_name, phone, password_hash, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
          [establishmentId, studentRoleId, matricule, firstName, lastName, null, studentPassword]
        );
        const [studentResult] = await conn.query<ResultSetHeader>(
          "INSERT INTO students (user_id, class_id, establishment_id, matricule_scolaire, admission_date, status) VALUES (?, ?, ?, ?, '2025-09-01', 'active')",
          [studentUser.insertId, classId, establishmentId, matricule]
        );
        const studentId = studentResult.insertId;

        if ((telParent1 || telParent2) && parentRoleId) {
          const parentPassword = await bcrypt.hash(`P-${matricule}`, 10);
          const [parentUser] = await conn.query<ResultSetHeader>(
            'INSERT INTO users (establishment_id, role_id, matricule, first_name, last_name, phone, password_hash, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
            [establishmentId, parentRoleId, `P-${matricule}`, 'Parent', lastName, telParent1 || null, parentPassword]
          );
          const [parent] = await conn.query<ResultSetHeader>(
            'INSERT INTO parents (user_id, establishment_id, profession, is_primary_contact) VALUES (?, ?, ?, ?)',
            [parentUser.insertId, establishmentId, null, 1]
          );
          await conn.query(
            "INSERT INTO parent_student (parent_id, student_id, priority, is_emergency_contact) VALUES (?, ?, 'parent1', 1)",
            [parent.insertId, studentId]
          );

          if (telParent2 && telParent2 !== telParent1) {
            const parent2Password = await bcrypt.hash(`P2-${matricule}`, 10);
            const [parent2User] = await conn.query<ResultSetHeader>(
              'INSERT INTO users (establishment_id, role_id, matricule, first_name, last_name, phone, password_hash, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
              [establishmentId, parentRoleId, `P2-${matricule}`, 'Parent', lastName, telParent2, parent2Password]
            );
            const [parent2] = await conn.query<ResultSetHeader>(
              'INSERT INTO parents (user_id, establishment_id, profession, is_primary_contact) VALUES (?, ?, ?, ?)',
              [parent2User.insertId, establishmentId, null, 0]
            );
            await conn.query(
              "INSERT INTO parent_student (parent_id, student_id, priority, is_emergency_contact) VALUES (?, ?, 'parent2', 0)",
              [parent2.insertId, studentId]
            );
          }
        }

        result.successCount++;
      } catch (err) {
        result.errors.push({ row: excelRowNumber, message: `Erreur: ${(err as Error).message}` });
        result.failCount++;
      }
    }

    const importStatus = result.failCount === 0 ? 'completed' : 'failed';
    await conn.query<ResultSetHeader>(
      'INSERT INTO imports (establishment_id, filename, file_url, total_rows, imported_rows, failed_rows, status, error_log, imported_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [establishmentId, 'import.xlsx', `uploads/import-${Date.now()}.xlsx`, result.totalRows, result.successCount, result.failCount, importStatus, result.errors.length > 0 ? JSON.stringify(result.errors) : null, importedBy]
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
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName!];
  const headerRow = findHeaderRow(sheet);
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { range: headerRow, defval: '' });
  const filteredRows = rows.filter((row) => String(row.Matricule || '').trim().toUpperCase() !== TEMPLATE_EXAMPLE_MATRICULE);
  return {
    totalRows: filteredRows.length,
    columns: rows.length > 0 ? Object.keys(rows[0]) : [],
    sampleRows: filteredRows.slice(0, 5),
  };
}

export async function getImportHistory(establishmentId: number, pagination: { page?: number; limit?: number }): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
  const pool = getPool();
  const page = Math.max(1, pagination.page || 1);
  const limit = Math.min(100, Math.max(1, pagination.limit || 20));
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM imports WHERE establishment_id = ?', [establishmentId]);
  const total = countRows[0].total as number;
  const [imports] = await pool.query<RowDataPacket[]>(
    `SELECT i.*, u.email as imported_by_email FROM imports i LEFT JOIN users u ON u.id = i.imported_by AND u.establishment_id = i.establishment_id WHERE i.establishment_id = ? ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
    [establishmentId, limit, offset]
  );
  return { data: imports, total, page, limit, totalPages: Math.ceil(total / limit) };
}
