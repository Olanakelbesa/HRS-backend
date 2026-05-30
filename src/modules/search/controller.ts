import { Request, Response } from 'express';
import { searchProperties } from './service';
import { propertySearchSchema } from './schema';

/**
 * Endpoint controller to handle semantic properties search.
 * Expects GET query: /api/v1/search?query=cheap+apartment+near+bole&page=1&limit=12
 */
export const searchPropertiesController = async (req: Request, res: Response) => {
  const parsed = propertySearchSchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { query, page, limit, currency } = parsed.data;

  try {
    const result = await searchProperties(query, page, limit, currency);
    return res.status(200).json({
      status: 'success',
      message: 'Semantic search completed successfully',
      data: result,
    });
  } catch (err: any) {
    console.error('Semantic search request failed:', err);
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Internal server error during search',
    });
  }
};
