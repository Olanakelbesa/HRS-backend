import { Injectable } from '@nestjs/common';
import { sendEmail } from '../../emails/emailService';

@Injectable()
export class MailService {
  send(
    templateName: string,
    to: string,
    variables: Record<string, unknown>,
    subject?: string,
  ) {
    return sendEmail(templateName, to, variables, subject);
  }
}
