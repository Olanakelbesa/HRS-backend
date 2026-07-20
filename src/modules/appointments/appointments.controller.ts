import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppointmentsApiService } from './appointments.api.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  listMyAppointmentsQuerySchema,
  updateAppointmentNoteSchema,
  updateAppointmentStatusSchema,
  type CreateAppointmentInput,
  type ListAppointmentsQuery,
  type ListMyAppointmentsQuery,
  type UpdateAppointmentNoteInput,
  type UpdateAppointmentStatusInput,
} from './schema';

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsApiService) {}

  @Post()
  @Roles('renter')
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(createAppointmentSchema, 'body'))
  async book(@CurrentUser() user: AuthUser, @Body() body: CreateAppointmentInput) {
    const appointment = await this.appointmentsService.bookAppointment(
      user.userId,
      user.role,
      body,
    );
    return {
      status: 'success',
      message: 'Appointment request created successfully',
      data: { appointment },
    };
  }

  @Get('availability')
  async getAvailability(
    @Query('propertyId') propertyId?: string,
    @Query('ownerId') ownerId?: string,
    @Query('from') fromRaw?: string,
    @Query('to') toRaw?: string,
  ) {
    if (!propertyId && !ownerId) {
      throw new BadRequestException('propertyId or ownerId is required');
    }

    const from = fromRaw ? new Date(fromRaw) : undefined;
    const to = toRaw ? new Date(toRaw) : undefined;

    if (from && Number.isNaN(from.getTime())) {
      throw new BadRequestException('Invalid `from` datetime');
    }
    if (to && Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid `to` datetime');
    }

    const busy = await this.appointmentsService.getAvailability({
      propertyId,
      ownerId,
      from,
      to,
    });

    return {
      status: 'success',
      message: 'Availability fetched',
      data: { busy },
    };
  }

  @Get('me')
  @Roles('renter')
  @UsePipes(new ZodValidationPipe(listMyAppointmentsQuerySchema, 'query'))
  async listMine(
    @CurrentUser() user: AuthUser,
    @Query() query: ListMyAppointmentsQuery,
  ) {
    const appointments = await this.appointmentsService.listMyAppointmentsForRenter(
      user.userId,
      user.role,
      query,
    );
    return {
      status: 'success',
      message: 'Appointments fetched successfully',
      data: { appointments },
    };
  }

  @Get()
  @UsePipes(new ZodValidationPipe(listAppointmentsQuerySchema, 'query'))
  async list(@CurrentUser() user: AuthUser, @Query() query: ListAppointmentsQuery) {
    const appointments = await this.appointmentsService.listAppointments(
      user.userId,
      user.role,
      query,
    );
    return {
      status: 'success',
      message: 'Appointments fetched successfully',
      data: { appointments },
    };
  }

  @Patch(':id/cancel')
  @Roles('renter')
  async cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const appointment = await this.appointmentsService.cancelRenterAppointment(
      user.userId,
      user.role,
      id,
    );
    return {
      status: 'success',
      message: 'Appointment cancelled successfully',
      data: { appointment },
    };
  }

  @Patch(':id/status')
  @UsePipes(new ZodValidationPipe(updateAppointmentStatusSchema, 'body'))
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateAppointmentStatusInput,
  ) {
    const appointment = await this.appointmentsService.updateAppointmentStatus(
      user.userId,
      user.role,
      id,
      body,
    );
    return {
      status: 'success',
      message: 'Appointment status updated successfully',
      data: { appointment },
    };
  }

  @Patch(':id/note')
  @UsePipes(new ZodValidationPipe(updateAppointmentNoteSchema, 'body'))
  async updateNote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateAppointmentNoteInput,
  ) {
    const appointment = await this.appointmentsService.updateAppointmentNote(
      user.userId,
      user.role,
      id,
      body,
    );
    return {
      status: 'success',
      message: 'Appointment note updated successfully',
      data: { appointment },
    };
  }

  @Get(':id')
  async getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const role = String(user.role).trim().toLowerCase();
    const appointment =
      role === 'renter'
        ? await this.appointmentsService.getRenterAppointmentById(user.userId, user.role, id)
        : await this.appointmentsService.getAppointmentById(user.userId, user.role, id);

    return {
      status: 'success',
      message: 'Appointment fetched successfully',
      data: { appointment },
    };
  }

  @Patch(':id')
  @UsePipes(new ZodValidationPipe(updateAppointmentStatusSchema, 'body'))
  async patchById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateAppointmentStatusInput,
  ) {
    const appointment = await this.appointmentsService.updateAppointmentStatus(
      user.userId,
      user.role,
      id,
      body,
    );
    return {
      status: 'success',
      message: 'Appointment status updated successfully',
      data: { appointment },
    };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.appointmentsService.deleteAppointment(
      user.userId,
      user.role,
      id,
    );
    return {
      status: 'success',
      message: 'Appointment deleted successfully',
      data: result,
    };
  }
}
