import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import dns from 'dns';
import handlebars from 'handlebars';
import { env } from '../config/env';

function createTransport(host?: string) {
  return nodemailer.createTransport({
    host: host ?? 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: env.GOOGLE_EMAIL_USER,
      pass: env.GOOGLE_EMAIL_PASS,
    },
    tls: {
      // Keep certificate validation tied to Gmail hostname if we connect by IPv4 literal.
      servername: 'smtp.gmail.com',
    },
  });
}

function isIpv6NetworkUnreachable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes('ENETUNREACH');
}

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

  const message = {
    from: `"House Rental" <${env.GOOGLE_EMAIL_USER}>`,
    to,
    subject: subject || 'Notification from House Rental',
    html,
  };

  const primaryTransport = createTransport();

  try {
    await primaryTransport.sendMail(message);
  } catch (error) {
    if (!isIpv6NetworkUnreachable(error)) {
      throw error;
    }

    // Some hosting networks cannot reach Gmail over IPv6.
    const [ipv4Host] = await dns.promises.resolve4('smtp.gmail.com');
    const fallbackTransport = createTransport(ipv4Host);
    await fallbackTransport.sendMail(message);
  }
};
