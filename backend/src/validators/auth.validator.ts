export function validateLogin(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Les données doivent être un objet.');
    return { valid: false, errors };
  }

  if (data.matricule === undefined || data.matricule === null) {
    errors.push('Le matricule est requis.');
  } else if (typeof data.matricule !== 'string' || data.matricule.trim() === '') {
    errors.push('Le matricule ne doit pas être vide.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateOtp(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Les données doivent être un objet.');
    return { valid: false, errors };
  }

  if (data.matricule === undefined || data.matricule === null) {
    errors.push('Le matricule est requis.');
  } else if (typeof data.matricule !== 'string' || data.matricule.trim() === '') {
    errors.push('Le matricule ne doit pas être vide.');
  }

  if (data.code === undefined || data.code === null) {
    errors.push('Le code OTP est requis.');
  } else if (typeof data.code !== 'string') {
    errors.push('Le code OTP doit être une chaîne de caractères.');
  } else if (!/^[0-9]{6}$/.test(data.code)) {
    errors.push('Le code OTP doit comporter exactement 6 chiffres.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateRegister(data: any): { valid: boolean; errors: string[] } {
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

  if (data.phone === undefined || data.phone === null) {
    errors.push('Le téléphone est requis.');
  } else if (typeof data.phone !== 'string' || data.phone.trim() === '') {
    errors.push('Le téléphone ne doit pas être vide.');
  } else if (!/^[+]?[0-9\s\-]{8,20}$/.test(data.phone.trim())) {
    errors.push('Le format du téléphone est invalide.');
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

  if (data.matricule === undefined || data.matricule === null) {
    errors.push('Le matricule est requis.');
  } else if (typeof data.matricule !== 'string' || data.matricule.trim() === '') {
    errors.push('Le matricule ne doit pas être vide.');
  } else if (data.matricule.trim().length > 50) {
    errors.push('Le matricule ne doit pas dépasser 50 caractères.');
  }

  return { valid: errors.length === 0, errors };
}
