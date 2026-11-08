import type { MemberRegistration } from '@/types/database';
import { PARQ_QUESTIONS, applicationKindLabel } from '@/lib/registration-options';

/**
 * Registration email templates. Kept free of business logic so the delivery
 * layer (`sendEmail`) and the workflow actions can evolve independently.
 */

const GYM_ADDRESS = 'Balapokuna Road, Colombo 5, Sri Lanka';
const LOGO_URL = 'https://evofitness.site/evofitness-logo.webp';

function escapeHtml(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shell(options: { heading: string; preheader: string; body: string }): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(options.heading)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; color: #18181b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e4e4e7; }
    .header { background: #09090b; padding: 24px 20px; text-align: center; border-bottom: 3px solid #e5b842; }
    .header img { max-width: 168px; height: auto; display: block; margin: 0 auto; }
    .body { padding: 30px 26px; }
    h1 { font-size: 19px; margin: 0 0 6px; color: #09090b; }
    p { font-size: 14px; line-height: 1.6; color: #3f3f46; margin: 0 0 14px; }
    .table { width: 100%; border-collapse: collapse; margin: 18px 0 6px; }
    .table td { padding: 9px 8px; border-bottom: 1px solid #f0f0f2; font-size: 13px; vertical-align: top; }
    .table td:first-child { color: #71717a; width: 42%; }
    .table td:last-child { color: #18181b; font-weight: 600; }
    .badge { display: inline-block; padding: 5px 12px; background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 700; border-radius: 999px; letter-spacing: 0.3px; }
    .flag { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 10px; padding: 12px 14px; font-size: 13px; margin: 16px 0; }
    .cta { display: inline-block; margin: 10px 0 4px; padding: 13px 22px; background: linear-gradient(135deg, #f5d061 0%, #e5b842 50%, #c69214 100%); color: #09090b !important; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 10px; }
    .muted { font-size: 12px; color: #71717a; line-height: 1.6; }
    .footer { background: #f4f4f5; padding: 18px; text-align: center; font-size: 11px; color: #71717a; }
  </style>
</head>
<body>
  <span style="display:none;visibility:hidden;opacity:0">${escapeHtml(options.preheader)}</span>
  <div class="container">
    <div class="header">
      <img src="${LOGO_URL}" alt="EVO FITNESS" width="168" />
    </div>
    <div class="body">
      <h1>${escapeHtml(options.heading)}</h1>
      ${options.body}
    </div>
    <div class="footer">
      <p style="margin:0 0 4px"><strong>EVO FITNESS</strong> &bull; STRONGER PEOPLE HAPPIER LIVES</p>
      <p style="margin:0">${GYM_ADDRESS}</p>
    </div>
  </div>
</body>
</html>`;
}

function detailsTable(rows: Array<[string, string | null | undefined]>): string {
  const cells = rows
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(
      ([label, value]) =>
        `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(String(value))}</td></tr>`
    )
    .join('');
  return `<table class="table">${cells}</table>`;
}

interface ApplicationPerson {
  role: string;
  name: string;
  gender: string;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  parq_answers: Record<string, boolean> | undefined;
  parq_details: string | null;
}

/** Every person on the application, primary first, then applicants by position. */
function peopleOnApplication(registration: MemberRegistration): ApplicationPerson[] {
  const primary: ApplicationPerson = {
    role: 'Primary',
    name: registration.full_name,
    gender: registration.gender,
    date_of_birth: registration.date_of_birth,
    phone: registration.phone,
    email: registration.email,
    parq_answers: registration.parq_answers,
    parq_details: registration.parq_details,
  };

  const additional = (registration.applicants ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((person) => ({
      role: `Person ${person.position}`,
      name: person.full_name,
      gender: person.gender,
      date_of_birth: person.date_of_birth,
      phone: person.mobile,
      email: person.email,
      parq_answers: person.parq_answers,
      parq_details: person.parq_details,
    }));

  return [primary, ...additional];
}

/** "Family - 4 people" line summarising the application. */
function peopleSummary(registration: MemberRegistration): string {
  const people = peopleOnApplication(registration);
  return `${applicationKindLabel(registration.application_kind)} - ${people.length} ${
    people.length === 1 ? 'person' : 'people'
  }`;
}

/** One row per person so both emails list everyone on the application. */
function applicantListTable(registration: MemberRegistration): string {
  const rows = peopleOnApplication(registration)
    .map((person) => {
      const contact = [
        person.gender,
        person.date_of_birth ? `DOB ${person.date_of_birth}` : null,
        person.phone,
        person.email,
      ]
        .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')
        .join(' \u00b7 ');
      const sub = contact ? `<br><span class="muted">${escapeHtml(contact)}</span>` : '';
      return `<tr><td>${escapeHtml(person.role)}</td><td><strong>${escapeHtml(person.name)}</strong>${sub}</td></tr>`;
    })
    .join('');
  return `<table class="table">${rows}</table>`;
}

/** Health screening flag covering every person who answered yes to anything. */
function healthFlagBlock(registration: MemberRegistration): string {
  const flagged = peopleOnApplication(registration)
    .map((person) => ({
      person,
      answers: PARQ_QUESTIONS.filter((question) => person.parq_answers?.[question.key]).map(
        (question) => question.label
      ),
    }))
    .filter((entry) => entry.answers.length > 0);

  if (flagged.length === 0) return '';

  const sections = flagged
    .map(({ person, answers }) => {
      const details = person.parq_details
        ? `<br><em>Provided details:</em> ${escapeHtml(person.parq_details)}`
        : '';
      const list = answers.map((answer) => `&bull; ${escapeHtml(answer)}`).join('<br>');
      return `<strong>${escapeHtml(person.role)} - ${escapeHtml(person.name)}</strong><br>${list}${details}`;
    })
    .join('<br><br>');

  return `<div class="flag"><strong>Health screening attention required</strong><br>${sections}</div>`;
}

export function buildAdminRegistrationAlert(
  registration: MemberRegistration,
  options: { appUrl: string; planPrice?: number | null; pendingCount?: number }
): { subject: string; html: string } {
  const reviewUrl = `${options.appUrl}/registrations/${registration.id}`;
  const people = peopleOnApplication(registration);
  const extraPeople = Math.max(people.length - 1, 0);

  const body = `
    <p>A new membership application was submitted through the public registration form.</p>
    <div><span class="badge">PENDING REVIEW${options.pendingCount ? ` &bull; ${options.pendingCount} WAITING` : ''}</span></div>
    ${detailsTable([
      ['Application', peopleSummary(registration)],
      ['Preferred plan', registration.preferred_plan],
      ['Plan price', options.planPrice != null ? `LKR ${options.planPrice.toLocaleString()}` : null],
      ['Heard about us', registration.how_did_you_hear?.join(', ')],
      ['Reasons for joining', registration.reasons_for_joining?.join(', ')],
      ['Emergency contact', `${registration.emergency_contact_name} (${registration.emergency_contact_relationship}) ${registration.emergency_contact_phone}`],
      ['Submitted', new Date(registration.submitted_at).toLocaleString('en-GB')],
    ])}
    <p style="margin-bottom:4px"><strong>People on this application</strong></p>
    ${applicantListTable(registration)}
    ${healthFlagBlock(registration)}
    <p><a class="cta" href="${reviewUrl}">Review registration</a></p>
    <p class="muted">Open the registration in the dashboard to add every person as a member, create the membership with a payment, or reject the application with a reason.</p>
  `;

  return {
    subject: `New registration: ${registration.full_name}${
      extraPeople ? ` +${extraPeople}` : ''
    } (${registration.preferred_plan || 'plan not selected'})`,
    html: shell({
      heading: 'New membership application',
      preheader: `${registration.full_name}${
        extraPeople ? ` and ${extraPeople} other${extraPeople === 1 ? '' : 's'}` : ''
      } applied for a membership`,
      body,
    }),
  };
}

export function buildApplicantAcknowledgement(
  registration: MemberRegistration,
  options: { planPrice?: number | null }
): { subject: string; html: string } {
  const reference = registration.id.slice(0, 8).toUpperCase();

  const body = `
    <p>Dear <strong>${escapeHtml(registration.first_name)}</strong>,</p>
    <p>Thank you for applying to join EVO Fitness. We have received your application and our front desk team will review it and contact you shortly to complete your enrolment.</p>
    ${detailsTable([
      ['Reference', reference],
      ['Application', peopleSummary(registration)],
      ['Preferred plan', registration.preferred_plan],
      ['Plan price', options.planPrice != null ? `LKR ${options.planPrice.toLocaleString()}` : null],
      ['Mobile on file', registration.phone],
    ])}
    <p style="margin-bottom:4px"><strong>People covered by this application</strong></p>
    ${applicantListTable(registration)}
    <p class="muted">Please keep this reference handy. If you need to correct any detail you submitted, reply to this email or speak to our team at the front desk.</p>
    <p class="muted">${GYM_ADDRESS}</p>
  `;

  return {
    subject: `We received your EVO Fitness application (${reference})`,
    html: shell({
      heading: 'Application received',
      preheader: `Your EVO Fitness application reference is ${reference}`,
      body,
    }),
  };
}
