import { Response, NextFunction } from 'express';
import { ValidationSchema } from '../types/index.js';

function validate(value: any, rules: ValidationSchema[string], field: string): string | null {
  if (rules.required && (value === undefined || value === null || value === '')) {
    return `Le champ '${field}' est requis.`;
  }

  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (rules.type === 'number') {
    const num = Number(value);
    if (isNaN(num)) {
      return `Le champ '${field}' doit être un nombre.`;
    }
    if (rules.min !== undefined && num < rules.min) {
      return `Le champ '${field}' doit être au moins ${rules.min}.`;
    }
    if (rules.max !== undefined && num > rules.max) {
      return `Le champ '${field}' ne peut pas dépasser ${rules.max}.`;
    }
  }

  if (rules.type === 'string' && typeof value !== 'string') {
    return `Le champ '${field}' doit être une chaîne de caractères.`;
  }

  if (typeof value === 'string') {
    if (rules.minLength !== undefined && value.length < rules.minLength) {
      return `Le champ '${field}' doit contenir au moins ${rules.minLength} caractères.`;
    }
    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      return `Le champ '${field}' ne peut pas dépasser ${rules.maxLength} caractères.`;
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      return `Le champ '${field}' a un format invalide.`;
    }
  }

  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
}

export function validateBody(schema: ValidationSchema) {
  return (req: any, res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    const body = req.body;

    for (const [field, rules] of Object.entries(schema)) {
      const error = validate(body[field], rules, field);
      if (error) errors.push(error);
    }

    if (errors.length > 0) {
      res.status(400).json({ success: false, error: 'Données invalides.', errors });
      return;
    }

    next();
  };
}

export function validateParams(schema: ValidationSchema) {
  return (req: any, res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    const params = req.params;

    for (const [field, rules] of Object.entries(schema)) {
      const error = validate(params[field], rules, field);
      if (error) errors.push(error);
    }

    if (errors.length > 0) {
      res.status(400).json({ success: false, error: 'Paramètres invalides.', errors });
      return;
    }

    next();
  };
}