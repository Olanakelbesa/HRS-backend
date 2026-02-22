import { Request, Response } from 'express';
import * as propertyService from './service';

export async function list(req: Request, res: Response) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;

  const search = req.query.search as string | undefined;

  const lat = req.query.lat ? Number(req.query.lat) : undefined;
  const lng = req.query.lng ? Number(req.query.lng) : undefined;
  const radius = req.query.radius ? Number(req.query.radius) : undefined;

  const result = await propertyService.listProperties({
    page,
    limit,
    minPrice,
    maxPrice,
    search,
    lat,
    lng,
    radius,
  });

  return res.status(200).json({ status: 'success', data: result });
}
export async function getById(req: Request, res: Response) {
  const property = await propertyService.getPropertyById(String(req.params.id));
  return res.status(200).json({ status: 'success', data: { property } });
}
