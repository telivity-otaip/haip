import { Injectable, Logger } from '@nestjs/common';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface EmailResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email transport service.
 *
 * Configurable via env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
 * If SMTP is not configured, emails are drafted only (suggest mode forced).
 *
 * Future: SendGrid, Mailgun, SES adapters.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transport: any = null;

  constructor() {
    this.initTransport();
  }

  private initTransport() {
    const host = process.env['SMTP_HOST'];
    const port = process.env['SMTP_PORT'];
    const user = process.env['SMTP_USER'];
    const pass = process.env['SMTP_PASS'];

    if (!host || !port) {
      this.logger.log('SMTP not configured — emails will be drafted only (suggest mode)');
      return;
    }

    try {
      // Dynamic import to avoid hard dependency on nodemailer
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodemailer = require('nodemailer');
      this.transport = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure: parseInt(port, 10) === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
      this.logger.log(`SMTP transport configured: ${host}:${port}`);
    } catch {
      this.logger.warn('nodemailer not available — emails will be drafted only');
    }
  }

  isConfigured(): boolean {
    return this.transport !== null;
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    if (!this.transport) {
      return { sent: false, error: 'SMTP not configured' };
    }

    try {
      const from = message.from ?? process.env['SMTP_FROM'] ?? 'noreply@haip.dev';
      const info = await this.transport.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });

      this.logger.log(`Email sent to ${message.to}: ${info.messageId}`);
      return { sent: true, messageId: info.messageId };
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${message.to}: ${error.message}`);
      return { sent: false, error: error.message };
    }
  }
}
