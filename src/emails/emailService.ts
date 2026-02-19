import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.GOOGLE_EMAIL_USER,
    pass: env.GOOGLE_EMAIL_PASS,
  },
});

export const sendEmail = async (
  templateName: string,
  to: string,
  variables: Record<string, unknown>,
  subject?: string
) => {
  if (!env.GOOGLE_EMAIL_USER || !env.GOOGLE_EMAIL_PASS) {
    throw new Error('Email credentials are missing. Set GOOGLE_EMAIL_USER and GOOGLE_EMAIL_PASS.');
  }

  const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
  const source = fs.readFileSync(templatePath, 'utf8');
  const compiledTemplate = handlebars.compile(source);
  const html = compiledTemplate(variables);

  await transporter.sendMail({
    from: `"House Rental" <${env.GOOGLE_EMAIL_USER}>`,
    to,
    subject: subject || 'Notification from House Rental',
    html,
  });
};
