import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { VerificationService } from './verification.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  updateVerificationStatusSchema,
  type UpdateVerificationStatusInput,
} from './schema';

const VERIFICATION_UPLOAD = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
};

@ApiTags('Verification')
@ApiBearerAuth()
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Roles('owner')
  @Post('documents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 },
        { name: 'livePhoto', maxCount: 1 },
      ],
      VERIFICATION_UPLOAD,
    ),
  )
  async uploadDocuments(
    @CurrentUser() user: AuthUser,
    @UploadedFiles()
    files?: {
      front?: Express.Multer.File[];
      back?: Express.Multer.File[];
      livePhoto?: Express.Multer.File[];
    },
  ) {
    const doc = await this.verificationService.uploadDocuments(user.userId, files || {});
    return {
      status: 'success',
      message: 'Verification documents uploaded successfully',
      data: doc,
    };
  }

  @Get('my-status')
  async myStatus(@CurrentUser() user: AuthUser) {
    const status = await this.verificationService.getMyStatus(user.userId);
    return {
      status: 'success',
      message: 'Verification status fetched successfully',
      data: status,
    };
  }

  @Roles('admin')
  @Get('pending')
  async pending(@CurrentUser() user: AuthUser) {
    const pending = await this.verificationService.getPending(user.userId);
    return {
      status: 'success',
      message: 'Pending verifications fetched successfully',
      data: pending,
    };
  }

  @Get('documents/:userId')
  async getDocuments(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    const doc = await this.verificationService.getDocuments(
      userId,
      user.userId,
      user.role,
    );
    return {
      status: 'success',
      message: 'Verification documents fetched successfully',
      data: doc,
    };
  }

  @Roles('admin')
  @Patch('documents/:userId/status')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(updateVerificationStatusSchema, 'body'))
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() body: UpdateVerificationStatusInput,
  ) {
    const updated = await this.verificationService.updateStatus(user.userId, userId, body);
    return {
      status: 'success',
      message: 'Verification status updated successfully',
      data: updated,
    };
  }
}
