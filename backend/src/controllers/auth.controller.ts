import { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import * as otpService from '../services/otp.service.js';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    const message = (err as Error).message;
    const status = message.includes('désactivé') ? 403 : 401;
    res.status(status).json({ success: false, error: message });
  }
}

export async function requestOtp(req: Request, res: Response): Promise<void> {
  try {
    const { phone, matricule, childMatricule } = req.body;
    const result = await otpService.requestOtp({ phone, matricule, childMatricule });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const { phone, matricule, childMatricule, code } = req.body;
    const result = await otpService.verifyOtp({ phone, matricule, childMatricule }, code);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    await authService.logout(user.userId);
    res.status(200).json({ success: true, message: 'Déconnexion réussie.' });
  } catch {
    res.status(500).json({ success: false, error: 'Erreur lors de la déconnexion.' });
  }
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const profile = await authService.getProfile(user.userId);
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    res.status(404).json({ success: false, error: (err as Error).message });
  }
}
