import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import { Resend } from 'resend';
import { env } from '../config/env';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export const sendEmail = async (
  templateName: string,
  to: string,
  variables: Record<string, unknown>,
  subject?: string
) => {
  if (!resend) {
    throw new Error('Email provider is not configured. Set RESEND_API_KEY.');
  }

  const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
  const source = fs.readFileSync(templatePath, 'utf8');
  const compiledTemplate = handlebars.compile(source);
  const html = compiledTemplate(variables);

  const message = {
    from: env.EMAIL_FROM,
    to,
    subject: subject || 'Notification from House Rental',
    html,
  };

  const { error } = await resend.emails.send(message);
  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }
};
