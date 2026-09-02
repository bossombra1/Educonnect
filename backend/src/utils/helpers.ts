import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  const cleaned = phone.replace(/\s+/g, '');
  const digits = cleaned.replace(/[^0-9]/g, '');

  if (digits.length === 0) return phone;

  // For CI numbers: +225 07 XX XX XX 89
  if (digits.length >= 10) {
    const lastTwo = digits.slice(-2);
    const middleMasked = 'XX XX XX ';
    const firstTwo = digits.slice(0, 2);
    return `+225 ${firstTwo} ${middleMasked}${lastTwo}`;
  }

  // For shorter numbers, mask middle characters
  if (digits.length >= 4) {
    const first = digits.slice(0, 2);
    const last = digits.slice(-2);
    const masked = 'X'.repeat(digits.length - 4);
    return `${first} ${masked} ${last}`;
  }

  // Too short to meaningfully mask, return as is
  return phone;
}

export function generateMatricule(role: string, establishmentId: number): string {
  const rolePrefixes: Record<string, string> = {
    SUPER_ADMIN: 'SAD',
    ADMIN: 'ADM',
    PARENT: 'PAR',
    STUDENT: 'ELE',
    STAFF: 'PER',
  };

  const prefix = rolePrefixes[role.toUpperCase()] || 'USR';
  const year = new Date().getFullYear();
  const unique = uuidv4().slice(0, 4).toUpperCase();

  return `${prefix}-${year}-${unique}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function parseExcelDate(value: any): string | null {
  if (value === null || value === undefined) return null;

  // Already a string that looks like a date
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;

    // Try ISO format: 2024-01-15 or 2024-01-15T10:30:00
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 19).replace('T', ' ');
    }

    // Try French format: 15/01/2024
    const frMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (frMatch) {
      const day = parseInt(frMatch[1], 10);
      const month = parseInt(frMatch[2], 10) - 1;
      const year = parseInt(frMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 19).replace('T', ' ');
    }

    // Try general parse as last resort
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 19).replace('T', ' ');

    return null;
  }

  // Excel serial date number (days since 1900-01-01, with the Excel leap year bug)
  if (typeof value === 'number') {
    // Excel epoch is 1899-12-30 (accounting for the 1900 leap year bug)
    const excelEpoch = new Date(1899, 11, 30);
    const msPerDay = 24 * 60 * 60 * 1000;
    const date = new Date(excelEpoch.getTime() + value * msPerDay);
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 19).replace('T', ' ');
    return null;
  }

  // Date object
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }

  return null;
}

export function generateOtpCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function hashPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  const cleaned = phone.replace(/\s+/g, '').replace(/[-\(\)]/g, '');
  return crypto.createHash('sha256').update(cleaned).digest('hex');
}
