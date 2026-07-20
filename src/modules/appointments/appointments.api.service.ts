import { Injectable } from '@nestjs/common';
import * as appointmentService from './service';
import type {
  CreateAppointmentInput,
  ListAppointmentsQuery,
  ListMyAppointmentsQuery,
  UpdateAppointmentNoteInput,
  UpdateAppointmentStatusInput,
} from './schema';

@Injectable()
export class AppointmentsApiService {
  bookAppointment(userId: string, userRole: string, input: CreateAppointmentInput) {
    return appointmentService.bookAppointment(userId, userRole, input);
  }

  listMyAppointmentsForRenter(
    userId: string,
    userRole: string,
    query: ListMyAppointmentsQuery,
  ) {
    return appointmentService.listMyAppointmentsForRenter(userId, userRole, query);
  }

  getRenterAppointmentById(userId: string, userRole: string, appointmentId: string) {
    return appointmentService.getRenterAppointmentById(userId, userRole, appointmentId);
  }

  getAppointmentById(userId: string, userRole: string, appointmentId: string) {
    return appointmentService.getAppointmentById(userId, userRole, appointmentId);
  }

  cancelRenterAppointment(userId: string, userRole: string, appointmentId: string) {
    return appointmentService.cancelRenterAppointment(userId, userRole, appointmentId);
  }

  listAppointments(userId: string, userRole: string, query: ListAppointmentsQuery) {
    return appointmentService.listAppointments(userId, userRole, query);
  }

  updateAppointmentStatus(
    userId: string,
    userRole: string,
    appointmentId: string,
    input: UpdateAppointmentStatusInput,
  ) {
    return appointmentService.updateAppointmentStatus(userId, userRole, appointmentId, input);
  }

  deleteAppointment(userId: string, userRole: string, appointmentId: string) {
    return appointmentService.deleteAppointment(userId, userRole, appointmentId);
  }

  updateAppointmentNote(
    userId: string,
    userRole: string,
    appointmentId: string,
    input: UpdateAppointmentNoteInput,
  ) {
    return appointmentService.updateAppointmentNote(userId, userRole, appointmentId, input);
  }

  getAvailability(options: {
    propertyId?: string;
    ownerId?: string;
    from?: Date;
    to?: Date;
  }) {
    return appointmentService.getAvailability(options);
  }
}
