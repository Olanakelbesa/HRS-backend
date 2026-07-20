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
  UploadedFile,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { MessagingService } from './messaging.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createConversationSchema,
  createMessageSchema,
  listMessagesQuerySchema,
  sendAttachmentSchema,
  type CreateConversationInput,
  type CreateMessageInput,
  type ListMessagesQuery,
  type SendAttachmentInput,
} from './schema';

const MESSAGE_ATTACHMENT_UPLOAD = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
};

@ApiTags('Messaging')
@ApiBearerAuth()
@Roles('owner', 'renter')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get()
  async listConversations(@CurrentUser() user: AuthUser) {
    const conversations = await this.messagingService.listConversations(user.userId);
    return { status: 'success', data: { conversations } };
  }

  @Post()
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(createConversationSchema, 'body'))
  async createConversation(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateConversationInput,
  ) {
    const conversation = await this.messagingService.createConversation(user.userId, body);
    return { status: 'success', data: { conversation } };
  }

  @Get(':id')
  async getMetadata(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const conversation = await this.messagingService.getConversationMetadata(id, user.userId);
    return { status: 'success', data: { conversation } };
  }

  @Delete(':id')
  async deleteConversation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.messagingService.deleteConversation(id, user.userId);
    return { status: 'success', data: result };
  }

  @Get(':id/messages')
  @UsePipes(new ZodValidationPipe(listMessagesQuerySchema, 'query'))
  async listMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: ListMessagesQuery,
  ) {
    const result = await this.messagingService.listMessages(id, user.userId, query);
    return { status: 'success', data: result };
  }

  @Post(':id/messages')
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(createMessageSchema, 'body'))
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: CreateMessageInput,
  ) {
    const result = await this.messagingService.sendMessage(id, user.userId, body);
    return { status: 'success', data: { message: result.message } };
  }

  @Patch(':id/read')
  async markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.messagingService.markConversationAsRead(id, user.userId);
    return { status: 'success', data: result };
  }

  @Post(':id/attachments')
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', MESSAGE_ATTACHMENT_UPLOAD))
  async sendAttachment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body(new ZodValidationPipe(sendAttachmentSchema, 'body')) body: SendAttachmentInput,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const result = await this.messagingService.sendAttachment(id, user.userId, file, body);
    return { status: 'success', data: { message: result.message } };
  }
}
