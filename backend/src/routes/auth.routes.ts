import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validator.js';

const router = Router();

const loginSchema = {
  email: { type: 'string', required: true, maxLength: 255 },
  password: { type: 'string', required: true, minLength: 1 },
};

const otpRequestSchema = {
  matricule: { type: 'string', required: true, maxLength: 50 },
  phone: { type: 'string', required: true, maxLength: 30 },
};

const otpVerifySchema = {
  matricule: { type: 'string', required: true, maxLength: 50 },
  code: { type: 'string', required: true, pattern: /^[0-9]{6}$/ },
};

router.post('/login', validateBody(loginSchema), authController.login);
router.post('/otp/request', validateBody(otpRequestSchema), authController.requestOtp);
router.post('/otp/verify', validateBody(otpVerifySchema), authController.verifyOtp);
router.post('/logout', authenticate, authController.logout);
router.get('/profile', authenticate, authController.getProfile);

export default router;
