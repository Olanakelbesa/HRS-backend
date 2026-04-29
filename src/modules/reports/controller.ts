import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/request';
import * as service from './service';
import {
  getOwnerReportsQuerySchema,
  reportIdParamSchema,
  submitOwnerResponseSchema,
} from './schema';

/**
 * GET /api/v1/reports
 * Returns all reports filed against the authenticated owner (or their properties),
 * with summary counts (total, open, resolved) and paginated items.
 */
export async function listOwnerReports(req: Request, res: Response) {
  try {
    const auth = req as AuthenticatedRequest;
    const query = getOwnerReportsQuerySchema.parse(req.query);
    const result = await service.getReportsAgainstOwner(auth.userId, query);
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ status: 'error', message });
  }
}

/**
 * GET /api/v1/reports/:reportId
 * Returns the full detail of a single report, verified to be against the owner.
 */
export async function getOwnerReport(req: Request, res: Response) {
  try {
    const auth = req as AuthenticatedRequest;
    const { reportId } = reportIdParamSchema.parse(req.params);
    const report = await service.getOwnerReportById(auth.userId, reportId);

    if (!report) {
      return res.status(404).json({ status: 'error', message: 'Report not found' });
    }

    return res.status(200).json({ status: 'success', data: report });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ status: 'error', message });
  }
}

/**
 * POST /api/v1/reports/:reportId/response
 * Lets the owner submit (or update) their written response to a report.
 */
export async function submitResponse(req: Request, res: Response) {
  try {
    const auth = req as AuthenticatedRequest;
    const { reportId } = reportIdParamSchema.parse(req.params);
    const { response } = submitOwnerResponseSchema.parse(req.body);

    const result = await service.submitOwnerResponse(auth.userId, reportId, response);

    if ('error' in result) {
      if (result.error === 'not_found') {
        return res.status(404).json({ status: 'error', message: 'Report not found' });
      }
      if (result.error === 'already_closed') {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot respond to a report that is already resolved or dismissed',
        });
      }
    }

    return res.status(200).json({
      status: 'success',
      message: 'Response submitted successfully',
      data: (result as { data: unknown }).data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ status: 'error', message });
  }
}
