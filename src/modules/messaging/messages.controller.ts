import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  messageReactionSchema,
  updateMessageStatusSchema,
  type MessageReactionInput,
  type UpdateMessageStatusInput,
} from './schema';

@ApiTags('Messages')
@ApiBearerAuth()
@Roles('owner', 'renter')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagingService: MessagingService) {}

  @Patch(':id/status')
  @UsePipes(new ZodValidationPipe(updateMessageStatusSchema, 'body'))
  async updateMessageStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateMessageStatusInput,
  ) {
    const result = await this.messagingService.updateMessageStatus(id, user.userId, body);
    return { status: 'success', data: { message: result.message } };
  }

  @Post(':id/reactions')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(messageReactionSchema, 'body'))
  async addReaction(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: MessageReactionInput,
  ) {
    const message = await this.messagingService.addReaction(id, user.userId, body);
    return { status: 'success', data: { message } };
  }

  @Delete(':id/reactions')
  @UsePipes(new ZodValidationPipe(messageReactionSchema, 'body'))
  async removeReaction(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: MessageReactionInput,
  ) {
    const message = await this.messagingService.removeReaction(id, user.userId, body);
    return { status: 'success', data: { message } };
  }

  @Delete(':id')
  async deleteMessage(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.messagingService.deleteMessage(id, user.userId);
    return { status: 'success', data: result };
  }
}
