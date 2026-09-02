import rateLimit from 'express-rate-limit';

export const otpRequestRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Trop de demandes OTP. Veuillez réessayer plus tard.' },
});

export const otpVerifyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Trop de tentatives de vérification. Veuillez réessayer plus tard.' },
});
