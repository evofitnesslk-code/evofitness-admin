import { Resend } from 'resend';
import { generateInvoicePdfBuffer, type InvoicePdfData } from './invoice-pdf';

let resendInstance: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY || process.env.RESEND_API_KET;
  if (!apiKey || apiKey.startsWith('placeholder')) {
    console.warn('Resend API key not configured or is placeholder.');
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export interface SendInvoiceEmailParams extends InvoicePdfData {
  to: string;
}

export function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || 'EVO Fitness <billing@evofitness.site>';
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Human-readable text for a failed send. Resend returns structured error
 * objects (`{ name, message, statusCode }`), so plain `String(error)` would
 * store "[object Object]" in the notification row and lose the diagnosis.
 */
export function formatEmailError(error: unknown): string {
  if (!error) return 'Send failed';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const candidate = record.message ?? record.error ?? record.name;
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
    try {
      return JSON.stringify(error);
    } catch {
      return 'Send failed';
    }
  }
  return String(error);
}

/**
 * Generic transactional sender used by non-invoice flows (e.g. registration
 * alerts). Invoice/receipt delivery keeps its own helper so the PDF
 * attachment pipeline stays intact.
 */
export async function sendEmail({ to, subject, html, replyTo }: SendEmailParams) {
  const resend = getResendClient();
  if (!resend) {
    console.warn('Skipping email delivery: Resend client not initialized.');
    return { success: false as const, reason: 'Resend API key not configured' };
  }

  const recipients = (Array.isArray(to) ? to : [to])
    .map((address) => address?.trim())
    .filter((address): address is string => Boolean(address));

  if (recipients.length === 0) {
    return { success: false as const, reason: 'No recipient email address provided' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: recipients,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false as const, error };
    }
    return { success: true as const, data };
  } catch (err) {
    console.error('Failed to send email:', err);
    return { success: false as const, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendInvoiceEmail(params: SendInvoiceEmailParams) {
  const resend = getResendClient();
  if (!resend) {
    console.log('Skipping email delivery: Resend client not initialized.');
    return { success: false, reason: 'Resend API key not configured' };
  }

  // Generate crisp printable PDF attachment
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = generateInvoicePdfBuffer(params);
  } catch (pdfErr) {
    console.error('Failed to generate PDF attachment:', pdfErr);
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px; color: #1a1a1a; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .header { background: #09090b; padding: 26px 20px; text-align: center; border-bottom: 3px solid #e5b842; }
        .header-logo { max-width: 170px; height: auto; display: block; margin: 0 auto; }
        .body { padding: 32px 28px; }
        .badge { display: inline-block; padding: 5px 12px; background: #fef3c7; color: #92400e; font-size: 12px; font-weight: bold; border-radius: 6px; letter-spacing: 0.5px; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th { text-align: left; padding: 10px; background: #f3f4f6; font-size: 12px; color: #4b5563; }
        .table td { padding: 12px 10px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        .total-row { font-weight: bold; background: #fafafa; }
        .total-val { color: #b45309; font-size: 16px; font-weight: bold; }
        .attachment-note { background: #fdf6e2; border: 1px solid #f9d976; border-radius: 8px; padding: 12px 16px; margin-top: 20px; font-size: 12px; color: #7c5204; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 11px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://evofitness.site/evofitness-logo.webp" alt="EVO FITNESS" class="header-logo" width="170" />
        </div>
        <div class="body">
          <p>Dear <strong>${params.memberName}</strong>,</p>
          <p>Thank you for choosing EVO Fitness! Please find your official payment receipt and membership invoice details below:</p>
          
          <div style="margin: 16px 0;">
            <span class="badge">Invoice #: ${params.invoiceNumber}</span>
          </div>

          <table class="table">
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Details / Amount</th>
            </tr>
            <tr>
              <td><strong>Membership Plan</strong></td>
              <td style="text-align: right;">${params.planName}</td>
            </tr>
            ${
              params.trainerName
                ? `<tr>
                    <td><strong>Personal Training</strong></td>
                    <td style="text-align: right;">Trainer: ${params.trainerName}</td>
                   </tr>`
                : ''
            }
            <tr>
              <td><strong>Validity Period</strong></td>
              <td style="text-align: right;">${params.startDate} to ${params.endDate}</td>
            </tr>
            <tr>
              <td><strong>Total Membership Due</strong></td>
              <td style="text-align: right;">LKR ${params.totalDue.toLocaleString()}</td>
            </tr>
            <tr>
              <td><strong>Amount Paid</strong></td>
              <td style="text-align: right; color: #059669; font-weight: bold;">LKR ${params.amountPaid.toLocaleString()}</td>
            </tr>
            <tr class="total-row">
              <td><strong>Outstanding Balance</strong></td>
              <td style="text-align: right;" class="total-val">LKR ${params.outstandingBalance.toLocaleString()}</td>
            </tr>
          </table>

          <div class="attachment-note">
            &#128206; <strong>Official Invoice / Receipt Attached:</strong> A formal PDF copy of your invoice (<code>${params.invoiceNumber}.pdf</code>) is attached to this email for your records.
          </div>

          <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin-top: 20px;">
            Please retain this email as your official digital receipt. For any inquiries, feel free to contact gym staff or visit our front desk.
          </p>
        </div>
        <div class="footer">
          <p><strong>EVO FITNESS GYM</strong> &bull; STRONGER PEOPLE HAPPIER LIVES</p>
          <p>Balapokuna Road, Colombo 5, Sri Lanka</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const fromAddress = getFromAddress();

    const emailPayload: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      attachments?: Array<{ filename: string; content: Buffer }>;
    } = {
      from: fromAddress,
      to: [params.to],
      subject: `Official Receipt: Invoice ${params.invoiceNumber} - EVO Fitness`,
      html: html,
    };

    if (pdfBuffer) {
      emailPayload.attachments = [
        {
          filename: `${params.invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      ];
    }

    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error('Failed to send email:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

