import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AdminAgreementsService } from './admin-agreements.service';
import {
  createAgreementSchema,
  paginationQuerySchema,
  paramIdSchema,
  updateAgreementStatusSchema,
} from './schema';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminAgreementsController {
  constructor(private readonly agreementsService: AdminAgreementsService) {}

  @Get('agreements')
  @UsePipes(new ZodValidationPipe(paginationQuerySchema, 'query'))
  async list(
    @Query() query: { page: number; limit: number; search?: string },
  ) {
    const data = await this.agreementsService.getAgreements(query);
    return { status: 'success', data };
  }

  @Post('agreements')
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(createAgreementSchema, 'body'))
  async create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const data = await this.agreementsService.createAgreement(user.userId, body);
    return { status: 'success', data };
  }

  @Get('agreements/:id/risk-assessment')
  async riskAssessment(@Param('id') id: string) {
    paramIdSchema.parse({ id });
    const data = await this.agreementsService.getAgreementRiskAssessment(id);
    if (!data) throw new NotFoundException('Agreement not found');
    return { status: 'success', data };
  }

  @Get('agreements/:id/payment-summary')
  async paymentSummary(@Param('id') id: string) {
    paramIdSchema.parse({ id });
    const data = await this.agreementsService.getAgreementPaymentSummary(id);
    if (!data) throw new NotFoundException('Agreement not found');
    return { status: 'success', data };
  }

  @Get('agreements/:id/payments')
  async payments(@Param('id') id: string) {
    paramIdSchema.parse({ id });
    const data = await this.agreementsService.listAgreementPayments(id);
    if (data === null) throw new NotFoundException('Agreement not found');
    return { status: 'success', data };
  }

  @Get('agreements/:id')
  async get(@Param('id') id: string) {
    paramIdSchema.parse({ id });
    const data = await this.agreementsService.getAgreementById(id);
    if (!data) throw new NotFoundException('Not found');
    return { status: 'success', data };
  }

  @Patch('agreements/:id/status')
  @UsePipes(new ZodValidationPipe(updateAgreementStatusSchema, 'body'))
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    paramIdSchema.parse({ id });
    const data = await this.agreementsService.updateAgreementStatus(
      user.userId,
      id,
      body.status,
    );
    return { status: 'success', data };
  }

  @Get('payments/:id/proof')
  async paymentProof(@Param('id') id: string) {
    paramIdSchema.parse({ id });
    const data = await this.agreementsService.getPaymentProof(id);
    if (!data) throw new NotFoundException('Payment not found');
    return { status: 'success', data };
  }
}
