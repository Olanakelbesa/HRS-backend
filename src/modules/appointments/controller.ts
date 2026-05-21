import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../types/request';
import { AppError } from '../../core/AppError';
import * as appointmentService from './service';
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  listMyAppointmentsQuerySchema,
  updateAppointmentNoteSchema,
  updateAppointmentStatusSchema,
} from './schema';

function handleError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      data: null,
    });
  }
  return next(error);
}

/** POST /appointments — renter books a visit */
export async function book(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req as AuthenticatedRequest;
    const parsed = createAppointmentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        data: null,
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const appointment = await appointmentService.bookAppointment(
      auth.userId,
      auth.userRole,
      parsed.data
    );

    return res.status(201).json({
      message: 'Appointment request created successfully',
      data: { appointment },
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

/** GET /appointments/me — renter's appointments */
export async function listMine(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req as AuthenticatedRequest;
    const parsed = listMyAppointmentsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        data: null,
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const appointments = await appointmentService.listMyAppointmentsForRenter(
      auth.userId,
      auth.userRole,
      parsed.data
    );

    return res.status(200).json({
      message: 'Appointments fetched successfully',
      data: { appointments },
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

/** GET /appointments/:id — appointment detail (renter must own; owner/admin via access rules) */
export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req as AuthenticatedRequest;
    const appointmentId = String(req.params.id);

    const appointment =
      auth.userRole === 'renter'
        ? await appointmentService.getRenterAppointmentById(
            auth.userId,
            auth.userRole,
            appointmentId
          )
        : await appointmentService.getAppointmentById(
            auth.userId,
            auth.userRole,
            appointmentId
          );

    return res.status(200).json({
      message: 'Appointment fetched successfully',
      data: { appointment },
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

/** PATCH /appointments/:id/cancel — renter cancels own appointment */
export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req as AuthenticatedRequest;
    const appointmentId = String(req.params.id);

    const appointment = await appointmentService.cancelRenterAppointment(
      auth.userId,
      auth.userRole,
      appointmentId
    );

    return res.status(200).json({
      message: 'Appointment cancelled successfully',
      data: { appointment },
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

/** GET /appointments — role-scoped list (owner / renter / admin) */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req as AuthenticatedRequest;
    const parsed = listAppointmentsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        data: null,
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const appointments = await appointmentService.listAppointments(
      auth.userId,
      auth.userRole,
      parsed.data
    );

    return res.status(200).json({
      message: 'Appointments fetched successfully',
      data: { appointments },
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

/** PATCH /appointments/:id — update status (approve / reject / cancel) */
export async function patchById(req: Request, res: Response, next: NextFunction) {
  return updateStatus(req, res, next);
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req as AuthenticatedRequest;
    const appointmentId = String(req.params.id);
    const parsed = updateAppointmentStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        data: null,
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const appointment = await appointmentService.updateAppointmentStatus(
      auth.userId,
      auth.userRole,
      appointmentId,
      parsed.data
    );

    return res.status(200).json({
      message: 'Appointment status updated successfully',
      data: { appointment },
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req as AuthenticatedRequest;
    const appointmentId = String(req.params.id);

    const result = await appointmentService.deleteAppointment(
      auth.userId,
      auth.userRole,
      appointmentId
    );

    return res.status(200).json({
      message: 'Appointment deleted successfully',
      data: result,
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

export async function updateNote(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req as AuthenticatedRequest;
    const appointmentId = String(req.params.id);
    const parsed = updateAppointmentNoteSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: 'Validation failed',
        data: null,
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const appointment = await appointmentService.updateAppointmentNote(
      auth.userId,
      auth.userRole,
      appointmentId,
      parsed.data
    );

    return res.status(200).json({
      message: 'Appointment note updated successfully',
      data: { appointment },
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}
