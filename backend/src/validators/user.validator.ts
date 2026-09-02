export function validateCreateUser(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Les données doivent être un objet.');
    return { valid: false, errors };
  }

  if (data.first_name === undefined || data.first_name === null) {
    errors.push('Le prénom est requis.');
  } else if (typeof data.first_name !== 'string' || data.first_name.trim() === '') {
    errors.push('Le prénom ne doit pas être vide.');
  } else if (data.first_name.trim().length > 100) {
    errors.push('Le prénom ne doit pas dépasser 100 caractères.');
  }

  if (data.last_name === undefined || data.last_name === null) {
    errors.push('Le nom est requis.');
  } else if (typeof data.last_name !== 'string' || data.last_name.trim() === '') {
    errors.push('Le nom ne doit pas être vide.');
  } else if (data.last_name.trim().length > 100) {
    errors.push('Le nom ne doit pas dépasser 100 caractères.');
  }

  if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
    if (typeof data.phone !== 'string') {
      errors.push('Le téléphone doit être une chaîne de caractères.');
    } else if (!/^[+]?[0-9\s\-]{8,20}$/.test(data.phone.trim())) {
      errors.push('Le format du téléphone est invalide.');
    }
  }

  if (data.email !== undefined && data.email !== null && data.email !== '') {
    if (typeof data.email !== 'string') {
      errors.push('L\'email doit être une chaîne de caractères.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errors.push('Le format de l\'email est invalide.');
    }
  }

  if (data.role_id === undefined || data.role_id === null) {
    errors.push('Le rôle (role_id) est requis.');
  } else if (typeof data.role_id !== 'number' || data.role_id <= 0) {
    errors.push('Le rôle (role_id) doit être un nombre entier positif.');
  }

  if (data.establishment_id === undefined || data.establishment_id === null) {
    errors.push('L\'établissement (establishment_id) est requis.');
  } else if (typeof data.establishment_id !== 'number' || data.establishment_id <= 0) {
    errors.push('L\'établissement (establishment_id) doit être un nombre entier positif.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateUpdateUser(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Les données doivent être un objet.');
    return { valid: false, errors };
  }

  // At least one updatable field must be present
  const updatableFields = ['first_name', 'last_name', 'phone', 'email', 'role_id', 'is_active', 'avatar_url'];
  const hasField = updatableFields.some((f) => data[f] !== undefined && data[f] !== null);
  if (!hasField) {
    errors.push(`Au moins un des champs suivants est requis : ${updatableFields.join(', ')}.`);
    return { valid: false, errors };
  }

  if (data.first_name !== undefined && data.first_name !== null) {
    if (typeof data.first_name !== 'string' || data.first_name.trim() === '') {
      errors.push('Le prénom ne doit pas être vide.');
    } else if (data.first_name.trim().length > 100) {
      errors.push('Le prénom ne doit pas dépasser 100 caractères.');
    }
  }

  if (data.last_name !== undefined && data.last_name !== null) {
    if (typeof data.last_name !== 'string' || data.last_name.trim() === '') {
      errors.push('Le nom ne doit pas être vide.');
    } else if (data.last_name.trim().length > 100) {
      errors.push('Le nom ne doit pas dépasser 100 caractères.');
    }
  }

  if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
    if (typeof data.phone !== 'string') {
      errors.push('Le téléphone doit être une chaîne de caractères.');
    } else if (!/^[+]?[0-9\s\-]{8,20}$/.test(data.phone.trim())) {
      errors.push('Le format du téléphone est invalide.');
    }
  }

  if (data.email !== undefined && data.email !== null && data.email !== '') {
    if (typeof data.email !== 'string') {
      errors.push('L\'email doit être une chaîne de caractères.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errors.push('Le format de l\'email est invalide.');
    }
  }

  if (data.role_id !== undefined && data.role_id !== null) {
    if (typeof data.role_id !== 'number' || data.role_id <= 0) {
      errors.push('Le rôle (role_id) doit être un nombre entier positif.');
    }
  }

  if (data.is_active !== undefined && data.is_active !== null) {
    if (typeof data.is_active !== 'number' || ![0, 1].includes(data.is_active)) {
      errors.push('is_active doit être 0 ou 1.');
    }
  }

  if (data.avatar_url !== undefined && data.avatar_url !== null && data.avatar_url !== '') {
    if (typeof data.avatar_url !== 'string') {
      errors.push('L\'URL de l\'avatar doit être une chaîne de caractères.');
    } else if (data.avatar_url.length > 500) {
      errors.push('L\'URL de l\'avatar ne doit pas dépasser 500 caractères.');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateImportRow(row: any, rowIndex: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const prefix = `Ligne ${rowIndex + 1}`;

  if (!row || typeof row !== 'object') {
    errors.push(`${prefix} : les données doivent être un objet.`);
    return { valid: false, errors };
  }

  const firstName = (row.first_name || row.prenom || row.Prénom || row.FIRST_NAME || '').toString().trim();
  const lastName = (row.last_name || row.nom || row.Nom || row.LAST_NAME || '').toString().trim();
  const phone = (row.phone || row.téléphone || row.Telephone || row.PHONE || '').toString().trim();
  const email = (row.email || row.Email || row.EMAIL || '').toString().trim();

  if (firstName === '') {
    errors.push(`${prefix} : le prénom est requis.`);
  } else if (firstName.length > 100) {
    errors.push(`${prefix} : le prénom ne doit pas dépasser 100 caractères.`);
  }

  if (lastName === '') {
    errors.push(`${prefix} : le nom est requis.`);
  } else if (lastName.length > 100) {
    errors.push(`${prefix} : le nom ne doit pas dépasser 100 caractères.`);
  }

  if (phone === '') {
    errors.push(`${prefix} : le téléphone est requis.`);
  } else if (!/^[+]?[0-9\s\-]{8,20}$/.test(phone)) {
    errors.push(`${prefix} : le format du téléphone est invalide (${phone}).`);
  }

  if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(`${prefix} : le format de l\'email est invalide (${email}).`);
  }

  return { valid: errors.length === 0, errors };
}
