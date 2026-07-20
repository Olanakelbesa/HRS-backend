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
  UploadedFile,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { env } from '../../config/env';
import {
  listPaymentsQuerySchema,
  exportPaymentsQuerySchema,
  chapaVerifySchema,
  type ListPaymentsQuery,
  type ExportPaymentsQuery,
} from './schema';

const PAYMENT_PROOF_UPLOAD = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
};

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('chapa/webhook')
  @HttpCode(200)
  async chapaWebhook(@Body() body: Record<string, unknown>) {
    const data = await this.paymentsService.handleChapaWebhook(body);
    return { status: 'success', message: 'Webhook processed', data };
  }

  @Public()
  @Get('chapa/callback')
  async chapaCallback(
    @Query('tx_ref') txRefQuery: string | undefined,
    @Query('txRef') txRefAlt: string | undefined,
    @Res() res: Response,
  ) {
    const txRef = String(txRefQuery || txRefAlt || '');
    try {
      await this.paymentsService.processChapaTxRef(txRef);
      const redirect = `${env.FRONTEND_URL}/agreements/payment/return?tx_ref=${encodeURIComponent(txRef)}&status=success`;
      return res.redirect(302, redirect);
    } catch {
      const redirect = `${env.FRONTEND_URL}/agreements/payment/return?tx_ref=${encodeURIComponent(txRef)}&status=failed`;
      return res.redirect(302, redirect);
    }
  }

  @ApiBearerAuth()
  @Get()
  @UsePipes(new ZodValidationPipe(listPaymentsQuerySchema, 'query'))
  async list(@CurrentUser() user: AuthUser, @Query() query: ListPaymentsQuery) {
    const data = await this.paymentsService.listPayments(user.userId, query);
    return { status: 'success', data };
  }

  @ApiBearerAuth()
  @Get('summary')
  async summary(@CurrentUser() user: AuthUser) {
    const data = await this.paymentsService.getPaymentSummary(user.userId);
    return { status: 'success', data };
  }

  @ApiBearerAuth()
  @Get('export')
  @UsePipes(new ZodValidationPipe(exportPaymentsQuerySchema, 'query'))
  async export(
    @CurrentUser() user: AuthUser,
    @Query() query: ExportPaymentsQuery,
    @Res() res: Response,
  ) {
    const csv = await this.paymentsService.exportPaymentsCsv(user.userId, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=payments-export-${Date.now()}.csv`,
    );
    return res.status(200).send(csv);
  }

  @ApiBearerAuth()
  @Post('chapa/verify')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(chapaVerifySchema, 'body'))
  async chapaVerify(@Body() body: { tx_ref: string }) {
    const data = await this.paymentsService.processChapaTxRef(body.tx_ref);
    return { status: 'success', message: 'Verification complete', data };
  }

  @ApiBearerAuth()
  @Get(':id/proof')
  async getProof(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.paymentsService.getPaymentProof(id, user.userId);
    return { status: 'success', data };
  }

  @ApiBearerAuth()
  @Post(':id/proof')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadProof(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const buffer = this.paymentsService.requireFileBuffer(file);
    const payment = await this.paymentsService.uploadPaymentProof(id, user.userId, buffer);
    return { status: 'success', data: { payment } };
  }

  @ApiBearerAuth()
  @Patch(':id/confirm')
  async confirm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const payment = await this.paymentsService.confirmPayment(id, user.userId);
    return { status: 'success', data: { payment } };
  }
}
