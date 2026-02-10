import { Request, Response } from 'express';
import * as propertyService from './service';

export async function list(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await propertyService.listProperties({ page, limit });
  return res.status(200).json({ status: 'success', data: result });
}

export async function getById(req: Request, res: Response) {
  const property = await propertyService.getPropertyById(String(req.params.id));
  return res.status(200).json({ status: 'success', data: { property } });
}
