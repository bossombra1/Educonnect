const VALID_MESSAGE_TYPES = ['text', 'image', 'pdf', 'link', 'circular'];
const VALID_PRIORITIES = ['normal', 'important', 'urgent'];

export function validateCreateMessage(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Les données doivent être un objet.');
    return { valid: false, errors };
  }

  if (data.content === undefined || data.content === null) {
    errors.push('Le contenu du message est requis.');
  } else if (typeof data.content !== 'string' || data.content.trim() === '') {
    errors.push('Le contenu du message ne doit pas être vide.');
  } else if (data.content.trim().length > 5000) {
    errors.push('Le contenu du message ne doit pas dépasser 5000 caractères.');
  }

  if (data.title !== undefined && data.title !== null) {
    if (typeof data.title !== 'string') {
      errors.push('Le titre doit être une chaîne de caractères.');
    } else if (data.title.trim().length > 255) {
      errors.push('Le titre ne doit pas dépasser 255 caractères.');
    }
  }

  if (data.message_type !== undefined && data.message_type !== null) {
    if (!VALID_MESSAGE_TYPES.includes(data.message_type)) {
      errors.push(`Le type de message doit être l'un des suivants : ${VALID_MESSAGE_TYPES.join(', ')}.`);
    }
  }

  if (data.priority !== undefined && data.priority !== null) {
    if (!VALID_PRIORITIES.includes(data.priority)) {
      errors.push(`La priorité doit être l'une des suivantes : ${VALID_PRIORITIES.join(', ')}.`);
    }
  }

  if (data.recipient_group_ids !== undefined && data.recipient_group_ids !== null) {
    if (!Array.isArray(data.recipient_group_ids)) {
      errors.push('recipient_group_ids doit être un tableau.');
    } else if (data.recipient_group_ids.length === 0) {
      errors.push('Au moins un groupe de destinataires est requis.');
    } else {
      for (const id of data.recipient_group_ids) {
        if (typeof id !== 'number' || id <= 0) {
          errors.push('Chaque identifiant de groupe doit être un nombre entier positif.');
          break;
        }
      }
    }
  }

  if (data.scheduled_at !== undefined && data.scheduled_at !== null && data.scheduled_at !== '') {
    if (typeof data.scheduled_at !== 'string') {
      errors.push('La date de programmation doit être une chaîne de caractères.');
    } else {
      const scheduledDate = new Date(data.scheduled_at);
      if (isNaN(scheduledDate.getTime())) {
        errors.push('La date de programmation est invalide.');
      } else if (scheduledDate <= new Date()) {
        errors.push('La date de programmation doit être dans le futur.');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateUpdateMessage(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Les données doivent être un objet.');
    return { valid: false, errors };
  }

  // At least one updatable field must be present
  const updatableFields = ['content', 'title', 'message_type', 'priority', 'status'];
  const hasField = updatableFields.some((f) => data[f] !== undefined && data[f] !== null);
  if (!hasField) {
    errors.push(`Au moins un des champs suivants est requis : ${updatableFields.join(', ')}.`);
    return { valid: false, errors };
  }

  if (data.content !== undefined && data.content !== null) {
    if (typeof data.content !== 'string' || data.content.trim() === '') {
      errors.push('Le contenu du message ne doit pas être vide.');
    } else if (data.content.trim().length > 5000) {
      errors.push('Le contenu du message ne doit pas dépasser 5000 caractères.');
    }
  }

  if (data.title !== undefined && data.title !== null) {
    if (typeof data.title !== 'string') {
      errors.push('Le titre doit être une chaîne de caractères.');
    } else if (data.title.trim().length > 255) {
      errors.push('Le titre ne doit pas dépasser 255 caractères.');
    }
  }

  if (data.message_type !== undefined && data.message_type !== null) {
    if (!VALID_MESSAGE_TYPES.includes(data.message_type)) {
      errors.push(`Le type de message doit être l'un des suivants : ${VALID_MESSAGE_TYPES.join(', ')}.`);
    }
  }

  if (data.priority !== undefined && data.priority !== null) {
    if (!VALID_PRIORITIES.includes(data.priority)) {
      errors.push(`La priorité doit être l'une des suivantes : ${VALID_PRIORITIES.join(', ')}.`);
    }
  }

  if (data.status !== undefined && data.status !== null) {
    const validStatuses = ['draft', 'scheduled', 'sent', 'archived'];
    if (!validStatuses.includes(data.status)) {
      errors.push(`Le statut doit être l'un des suivants : ${validStatuses.join(', ')}.`);
    }
  }

  return { valid: errors.length === 0, errors };
}
