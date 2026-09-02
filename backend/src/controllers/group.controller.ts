import { Request, Response } from 'express';
import * as groupService from '../services/group.service.js';

const VALID_GROUP_TYPES = ['class', 'level', 'role', 'custom', 'all_school'];

export async function getGroups(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await groupService.getGroups(user.establishmentId, { page, limit });
    res.status(200).json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getGroupById(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const groupId = parseInt(req.params.id);
    if (isNaN(groupId)) { res.status(400).json({ success: false, error: 'ID de groupe invalide.' }); return; }
    const group = await groupService.getGroupById(groupId, user.establishmentId);
    if (!group) { res.status(404).json({ success: false, error: 'Groupe non trouvé.' }); return; }
    res.status(200).json({ success: true, data: group });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function createGroup(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const { name, group_type, description, filters, user_ids } = req.body;
    if (!name || !group_type) { res.status(400).json({ success: false, error: 'Nom et type de groupe sont requis.' }); return; }
    if (!VALID_GROUP_TYPES.includes(group_type)) { res.status(400).json({ success: false, error: `Type de groupe invalide. Types acceptés: ${VALID_GROUP_TYPES.join(', ')}` }); return; }
    const group = await groupService.createGroup({ name, group_type, description, filters, user_ids }, user.establishmentId);
    res.status(201).json({ success: true, data: group, message: 'Groupe créé avec succès.' });
  } catch (err) { res.status(400).json({ success: false, error: (err as Error).message }); }
}

export async function updateGroup(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const groupId = parseInt(req.params.id);
    if (isNaN(groupId)) { res.status(400).json({ success: false, error: 'ID de groupe invalide.' }); return; }
    const { name, group_type, description, filters, user_ids } = req.body;
    if (group_type && !VALID_GROUP_TYPES.includes(group_type)) { res.status(400).json({ success: false, error: `Type de groupe invalide. Types acceptés: ${VALID_GROUP_TYPES.join(', ')}` }); return; }
    const group = await groupService.updateGroup(groupId, { name, group_type, description, filters, user_ids }, user.establishmentId);
    if (!group) { res.status(404).json({ success: false, error: 'Groupe non trouvé.' }); return; }
    res.status(200).json({ success: true, data: group, message: 'Groupe mis à jour.' });
  } catch (err) { res.status(400).json({ success: false, error: (err as Error).message }); }
}

export async function deleteGroup(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const groupId = parseInt(req.params.id);
    if (isNaN(groupId)) { res.status(400).json({ success: false, error: 'ID de groupe invalide.' }); return; }
    const deleted = await groupService.deleteGroup(groupId, user.establishmentId);
    if (!deleted) { res.status(404).json({ success: false, error: 'Groupe non trouvé.' }); return; }
    res.status(200).json({ success: true, message: 'Groupe supprimé.' });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}

export async function getGroupMembers(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as any;
    const groupId = parseInt(req.params.id);
    if (isNaN(groupId)) { res.status(400).json({ success: false, error: 'ID de groupe invalide.' }); return; }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await groupService.getGroupMembers(groupId, user.establishmentId, { page, limit });
    res.status(200).json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (err) { res.status(500).json({ success: false, error: (err as Error).message }); }
}
