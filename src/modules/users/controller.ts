import { Request, Response } from 'express';
import { updateProfileSchema } from './schema';
import * as userService from './service';

export async function getProfile(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId;
  if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  const user = await userService.getProfile(userId);
  return res.status(200).json({ status: 'success', data: { user } });
}

export async function updateProfile(req: Request, res: Response) {
  const userId = (req as { userId?: string }).userId;
  if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  const parsed = updateProfileSchema.safeParse({ body: req.body });
  if (!parsed.success) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    });
  }
  const user = await userService.updateProfile(userId, parsed.data.body);
  return res.status(200).json({ status: 'success', data: { user } });
}
