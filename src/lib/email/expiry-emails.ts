/** Membership expiry reminder template (kept free of delivery/business logic). */

const GYM_ADDRESS = 'Balapokuna Road, Colombo 5, Sri Lanka';
const LOGO_URL = 'https://evofitness.site/evofitness-logo.webp';

function esc(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatEmailDate(isoDate: string): string {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export interface ExpiryEmailData {
  memberName: string;
  planName: string;
  endDate: string;
  daysRemaining?: number | null;
  invoiceNumber?: string | null;
}

export function expiryReminderSubject(endDate: string): string {
  return `Your EVO Fitness membership expires on ${formatEmailDate(endDate)}`;
}

export function expiryReminderHtml(data: ExpiryEmailData): string {
  const when = formatEmailDate(data.endDate);
  const lead =
    typeof data.daysRemaining === 'number' && data.daysRemaining > 0
      ? `Your membership ends in <strong>${data.daysRemaining} day${data.daysRemaining === 1 ? '' : 's'}</strong>, on <strong>${esc(when)}</strong>.`
      : `Your membership ends on <strong>${esc(when)}</strong>.`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f4f4f5;margin:0;padding:20px;color:#18181b">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e4e4e7">
    <div style="background:#09090b;padding:24px 20px;text-align:center;border-bottom:3px solid #e5b842">
      <img src="${LOGO_URL}" alt="EVO FITNESS" width="168" style="max-width:168px;height:auto" />
    </div>
    <div style="padding:30px 26px">
      <h1 style="font-size:19px;margin:0 0 12px;color:#09090b">Your membership is expiring soon</h1>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 14px">Hi ${esc(data.memberName)},</p>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 14px">${lead}</p>
      <table style="width:100%;border-collapse:collapse;margin:14px 0">
        <tr><td style="padding:9px 8px;border-bottom:1px solid #f0f0f2;font-size:13px;color:#71717a;width:42%">Plan</td><td style="padding:9px 8px;border-bottom:1px solid #f0f0f2;font-size:13px;font-weight:600">${esc(data.planName)}</td></tr>
        <tr><td style="padding:9px 8px;border-bottom:1px solid #f0f0f2;font-size:13px;color:#71717a">Expires on</td><td style="padding:9px 8px;border-bottom:1px solid #f0f0f2;font-size:13px;font-weight:600">${esc(when)}</td></tr>
        ${data.invoiceNumber ? `<tr><td style="padding:9px 8px;border-bottom:1px solid #f0f0f2;font-size:13px;color:#71717a">Invoice</td><td style="padding:9px 8px;border-bottom:1px solid #f0f0f2;font-size:13px;font-weight:600">${esc(data.invoiceNumber)}</td></tr>` : ''}
      </table>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 14px">To keep your access without a break, please visit the front desk to renew before this date. Once it expires you will no longer be able to use the gym.</p>
      <p style="font-size:12px;line-height:1.6;color:#71717a;margin:0">Already renewed? You can ignore this message.</p>
    </div>
    <div style="background:#f4f4f5;padding:18px;text-align:center;font-size:11px;color:#71717a">
      <p style="margin:0 0 4px"><strong>EVO FITNESS</strong> &bull; STRONGER PEOPLE HAPPIER LIVES</p>
      <p style="margin:0">${GYM_ADDRESS}</p>
    </div>
  </div>
</body></html>`;
}
