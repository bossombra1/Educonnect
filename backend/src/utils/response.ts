import { Response } from 'express';
import { PaginationResult } from '../types/index.js';

export function success(res: Response, data: any, statusCode: number = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
  });
}

export function error(res: Response, message: string, statusCode: number = 400): void {
  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

export function paginated(res: Response, result: PaginationResult): void {
  res.status(200).json({
    success: true,
    data: result.data,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
  });
}
