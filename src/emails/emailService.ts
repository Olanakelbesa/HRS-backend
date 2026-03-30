import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import dns from 'dns';
import handlebars from 'handlebars';
import { env } from '../config/env';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // No-op for older runtimes that don't support this API.
}

function createTransport(host: string, port: number, secure: boolean) {
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: env.GOOGLE_EMAIL_USER,
      pass: env.GOOGLE_EMAIL_PASS,
    },
    tls: {
      // Keep certificate validation tied to Gmail hostname if we connect by IPv4 literal.
      servername: env.SMTP_HOST,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
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
    from: env.EMAIL_FROM || `"House Rental" <${env.GOOGLE_EMAIL_USER}>`,
    to,
    subject: subject || 'Notification from House Rental',
    html,
  };

  const attemptConfigs: Array<{ host: string; port: number; secure: boolean; label: string }> = [
    {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      label: 'primary smtp config',
    },
    {
      host: env.SMTP_HOST,
      port: env.SMTP_FALLBACK_PORT,
      secure: env.SMTP_FALLBACK_PORT === 465,
      label: 'fallback smtp port',
    },
  ];

  // Add IPv4 fallback for hosts where IPv6 route to SMTP is unavailable.
  try {
    const [ipv4Host] = await dns.promises.resolve4(env.SMTP_HOST);
    attemptConfigs.push({
      host: ipv4Host,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      label: 'ipv4 resolved smtp host',
    });
  } catch {
    // DNS IPv4 resolution failed; rely on hostname attempts.
  }

  let lastError: unknown;
  for (const attempt of attemptConfigs) {
    try {
      const transport = createTransport(attempt.host, attempt.port, attempt.secure);
      await transport.sendMail(message);
      return;
    } catch (error) {
      lastError = error;
      if (!isIpv6NetworkUnreachable(error)) {
        console.warn(`Email send failed using ${attempt.label}: ${(error as Error).message}`);
      }
    }
  }

  throw lastError;
};
