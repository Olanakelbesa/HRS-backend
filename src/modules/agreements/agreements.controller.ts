import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AgreementsService } from './agreements.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createOwnerAgreementSchema,
  updateDraftAgreementSchema,
  sendAgreementSchema,
  cancelAgreementSchema,
  rejectAgreementSchema,
  listAgreementsQuerySchema,
  listOwnerAgreementsQuerySchema,
  type CreateOwnerAgreementInput,
  type ListAgreementsQuery,
  type ListOwnerAgreementsQuery,
} from './schema';
import { z } from 'zod';

type UpdateDraftAgreementInput = z.infer<typeof updateDraftAgreementSchema>;

@ApiTags('Agreements')
@ApiBearerAuth()
@Controller('agreements')
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  // ── Owner ─────────────────────────────────────────────────────────────────

  @Get()
  @Roles('owner', 'admin')
  @UsePipes(new ZodValidationPipe(listOwnerAgreementsQuerySchema, 'query'))
  async listOwner(
    @CurrentUser() user: AuthUser,
    @Query() query: ListOwnerAgreementsQuery,
  ) {
    const data = await this.agreementsService.listOwnerAgreements(user.userId, query);
    return { status: 'success', message: 'Agreements retrieved', data };
  }

  @Get('export')
  @Roles('owner', 'admin')
  async exportOwner(@CurrentUser() user: AuthUser, @Query() query: unknown, @Res() res: Response) {
    const csv = await this.agreementsService.exportOwnerAgreements(user.userId, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=agreements-${Date.now()}.csv`);
    return res.status(200).send(csv);
  }

  @Post()
  @Roles('owner', 'admin')
  @UsePipes(new ZodValidationPipe(createOwnerAgreementSchema, 'body'))
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateOwnerAgreementInput,
  ) {
    const agreement = await this.agreementsService.createOwnerAgreement(user.userId, body);
    return { status: 'success', message: 'Agreement created', data: { agreement } };
  }

  @Patch(':id')
  @Roles('owner', 'admin')
  @UsePipes(new ZodValidationPipe(updateDraftAgreementSchema, 'body'))
  async updateDraft(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateDraftAgreementInput,
  ) {
    const agreement = await this.agreementsService.updateDraftAgreement(id, user.userId, body);
    return { status: 'success', message: 'Agreement updated', data: { agreement } };
  }

  @Post(':id/send')
  @Roles('owner', 'admin')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(sendAgreementSchema, 'body'))
  async send(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { offerExpiresAt?: Date },
  ) {
    const agreement = await this.agreementsService.sendAgreement(
      id,
      user.userId,
      body?.offerExpiresAt,
    );
    return { status: 'success', message: 'Agreement sent', data: { agreement } };
  }

  @Post(':id/cancel')
  @Roles('owner', 'admin')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(cancelAgreementSchema, 'body'))
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const agreement = await this.agreementsService.cancelAgreement(id, user.userId, body?.reason);
    return { status: 'success', message: 'Agreement cancelled', data: { agreement } };
  }

  @Post(':id/terminate')
  @Roles('owner', 'admin')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(cancelAgreementSchema, 'body'))
  async terminate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const agreement = await this.agreementsService.terminateAgreement(
      id,
      user.userId,
      body?.reason,
    );
    return { status: 'success', message: 'Agreement terminated', data: { agreement } };
  }

  // ── Renter ────────────────────────────────────────────────────────────────

  @Get('me')
  @Roles('renter')
  @UsePipes(new ZodValidationPipe(listAgreementsQuerySchema, 'query'))
  async listMine(
    @CurrentUser() user: AuthUser,
    @Query() query: ListAgreementsQuery,
  ) {
    const data = await this.agreementsService.listRenterAgreements(user.userId, query);
    return { status: 'success', message: 'Agreements retrieved', data };
  }

  @Post(':id/accept')
  @Roles('renter')
  @HttpCode(200)
  async accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const agreement = await this.agreementsService.acceptAgreement(id, user.userId);
    return { status: 'success', message: 'Agreement accepted', data: { agreement } };
  }

  @Post(':id/reject')
  @Roles('renter')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(rejectAgreementSchema, 'body'))
  async reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const agreement = await this.agreementsService.rejectAgreement(id, user.userId, body?.reason);
    return { status: 'success', message: 'Agreement rejected', data: { agreement } };
  }

  @Post(':id/deposit/initiate')
  @Roles('renter')
  @HttpCode(200)
  async initiateDeposit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.agreementsService.initiateDeposit(id, user.userId);
    return { status: 'success', message: 'Deposit checkout ready', data };
  }

  @Get(':id/deposit/status')
  @Roles('renter')
  async depositStatus(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.agreementsService.getDepositStatus(id, user.userId);
    return { status: 'success', message: 'Deposit status retrieved', data };
  }

  // ── Shared (any authenticated party) ──────────────────────────────────────

  @Get(':id')
  async getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const agreement = await this.agreementsService.getAgreementDetail(id, user.userId);
    return { status: 'success', message: 'Agreement retrieved', data: { agreement } };
  }

  @Get(':id/payments')
  async listPayments(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.agreementsService.listAgreementPayments(id, user.userId);
    return { status: 'success', message: 'Payments retrieved', data };
  }
}
