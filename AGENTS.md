# AGENTS.md
# EVO Fitness Membership Management Platform

## 1. Purpose

This document is the technical source of truth for AI coding agents working on the EVO Fitness Membership Management Platform.

The application is an internal gym management platform for:

- Member registration and management
- Membership plan management
- Membership lifecycle tracking
- Payments and partial payments
- Discounts
- Cancellations and refunds
- Email notifications
- PDF invoice generation and email delivery
- Revenue and membership reporting
- Admin/staff access control

The system must remain lean and maintainable. Do not introduce unnecessary infrastructure, services, abstractions, microservices, message brokers, Kubernetes, or separate backend servers.

---

## 2. Technology Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- React
- Apple Human Interface Guidelines (HIG)-inspired UI
- Responsive desktop, tablet, and mobile layouts
- Progressive Web App (PWA) architecture (installable, Web App Manifest, Service Worker for offline caching, Apple mobile web app capability)
- Strict Dark Mode Only UI (no light theme toggle)

### Backend / Data

- Supabase
  - PostgreSQL
  - Supabase Auth
  - Row Level Security (RLS)
  - Supabase Edge Functions where server-side privileged operations are required
  - Database migrations
  - SQL views for reporting

### Hosting / Deployment

- Cloudflare
- Deploy the Next.js application through the Cloudflare-compatible deployment setup used by the project
- Use the project's configured Cloudflare deployment/build configuration
- Do not introduce another hosting provider or application server

### Email

- Resend
- Resend is the email provider for the current implementation
- Email functionality must be implemented so business logic is not tightly coupled to UI components

### Database Operations

**Use the Supabase MCP whenever performing database-related work.**

AI agents must use Supabase MCP for:

- Inspecting the database schema
- Creating or modifying tables
- Creating or modifying columns
- Creating indexes
- Creating functions
- Creating triggers
- Creating views
- Creating RLS policies
- Inspecting existing data/schema when required
- Running database queries that are part of development/debugging
- Applying database migrations when the MCP supports the operation

Do not invent the current database schema from assumptions. Inspect the Supabase project through MCP before making schema-dependent changes.

---

## 3. Environment Configuration

Connection details are provided through the project's `.env` / environment files.

These environment files contain the configured:

- Supabase project URL
- Supabase API keys
- Supabase-related configuration
- Resend API keys
- Other required environment-specific values

### Rules

- Never hard-code Supabase URLs or API keys in source code.
- Never hard-code Resend API keys.
- Never commit secrets to Git.
- Never expose the Supabase service-role key to browser/client-side code.
- Client-side Supabase access must use the appropriate public/anon key.
- Server-side privileged operations must use secure server-side environment variables.
- Follow the existing `.env.example` / environment naming conventions if present.
- Do not create duplicate environment-variable naming schemes without a reason.

If an environment value is missing, inspect the existing project configuration before creating a new variable.

---

# 4. System Architecture

## 4.1 Overall Architecture

The platform is a single Next.js application backed by Supabase.

```text
┌──────────────────────────────────────────┐
│              Staff / Admin               │
│        Desktop / Tablet / Mobile         │
└────────────────────┬─────────────────────┘
                     │ HTTPS
                     ▼
┌──────────────────────────────────────────┐
│                Next.js App                │
│                                          │
│  Apple-HIG UI                            │
│  Tailwind CSS                            │
│  shadcn/ui                               │
│  Authenticated application UI            │
└───────────────┬──────────────┬───────────┘
                │              │
                │              │ Server-side
                │              ▼
                │       ┌───────────────┐
                │       │ Edge Functions│
                │       │ / Server Ops  │
                │       └───────┬───────┘
                │               │
                ▼               ▼
        ┌──────────────────────────────┐
        │           Supabase           │
        │                              │
        │ PostgreSQL                   │
        │ Auth                         │
        │ RLS / RBAC                   │
        │ SQL Views                    │
        │ Scheduled operations         │
        └──────────────┬───────────────┘
                       │
                       ▼
                ┌─────────────┐
                │   Resend    │
                │    Email    │
                └─────────────┘

Deployment:
Next.js → Cloudflare
Database/Auth/Functions → Supabase
Email → Resend
```

The frontend is responsible for presentation and normal authenticated CRUD operations.

Supabase is the authoritative source for application data and authorization.

Privileged server-side actions must never rely solely on frontend checks.

---

# 5. Core Functional Requirements

## 5.1 Authentication

Use Supabase Auth.

Requirements:

- Email/password authentication
- No public self-registration
- Accounts are created by an Admin
- Authenticated users access the internal application
- Unauthenticated users are redirected to the login flow
- Session state must be handled securely
- Logout must invalidate the application session appropriately

---

## 5.2 User Management

Admin users can:

- Create staff users
- View users
- Manage user roles
- Disable/remove access according to the implemented account-management model

Staff users cannot create new application users.

Privileged user creation must happen server-side through a secure Supabase operation/Edge Function using the service-role credential.

The service-role credential must never reach the browser.

---

# 6. RBAC

There are two application roles.

## Admin

Admin has full operational access.

Admin can:

- Manage staff users
- Register/manage members
- Manage memberships and orders
- Manage trainers (register trainers, contact details, remarks, default charges, archive)
- Manually edit/override the end number sequence of invoice numbers (`EFXXXX`)
- View and manage payments
- Apply percentage or fixed-amount discounts (unrestricted authority)
- Cancel memberships
- Record cancellation/refund information
- View reports
- Adjust membership plan pricing
- Perform administrative operations

## Shop Staff

Staff can:

- Register members
- View/manage permitted member information
- Create memberships and orders
- Add personal training option and select trainers with editable fees
- Record payments
- Record partial payments
- View payment history
- View daily operational reports
- Apply discounts within permitted staff threshold

Staff cannot:

- Create application users
- Register or modify trainer master profiles
- Manually edit or override invoice numbers (strictly auto-incremented for staff)
- Delete records
- Perform unrestricted administrative actions
- Change membership plan pricing
- Perform unrestricted cancellation/refund operations
- Apply discounts above the permitted threshold

If a discount threshold/business rule exists, enforce the rule in both the UI and database authorization layer where practical.

### RBAC Security Rule

Frontend route guards and UI hiding are usability controls, not the security boundary.

Postgres RLS is the authoritative authorization boundary.

Every protected table must have appropriate RLS policies.

Never assume that because a button is hidden, an operation is secure.

---

# 7. Core Data Model

The following entities are the expected foundation.

## profiles

Purpose:

- Application user profile
- Links to `auth.users`
- Stores application role

Expected conceptual fields:

- `id`
- `role`
- profile/user metadata as required

Roles:

- `admin`
- `staff`

## members

Purpose:

- Stores gym member information

Must support:

- Personal/member details
- Gender
- Join date
- Contact information required for notifications
- Membership relationship

Gender is relevant because certain membership plans have gender-specific pricing.

## membership_plans

Reference/seed data for available plans.

Official rates and durations verified from official gym collateral (`poster.jpeg` - Balapokuna Road, Colombo 5):

| Plan Name | Duration | Target Group | Official Rate (LKR) | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Day Pass** | 1 Day | General | **LKR 3,000** | 1 Day Access |
| **Monthly** | 1 Month | General | **LKR 10,999** | 1 Month Membership |
| **Gents 6 Months** | 6 Months | Gents | **LKR 49,999** | 6 Months Access |
| **Gents Annual** | 12 Months | Gents | **LKR 69,999** | 1 Year Access |
| **Buddy Package (Gents)** | 12 Months | Gents (2 Persons) | **LKR 119,999** | Buddy Annual Access |
| **Ladies 6 Months** | 6 Months | Ladies | **LKR 39,999** | 6 Months Access |
| **Ladies Annual** | 12 Months | Ladies | **LKR 59,999** | 1 Year Access |
| **Buddy Package (Ladies)** | 12 Months | Ladies (2 Persons) | **LKR 99,999** | Buddy Annual Access |
| **Couple 6 Months** | 6 Months | Couple | **LKR 74,999** | 6 Months Access |
| **Couple Annual** | 12 Months | Couple | **LKR 109,999** | 1 Year Access |
| **Family 6 Months** | 6 Months | Family | **LKR 119,999** | 6 Months Access |
| **Family Annual** | 12 Months | Family | **LKR 149,999** | 1 Year Access |

Each plan must have an associated price, duration, and target group (gender/category).

Historical memberships must preserve their applicable purchase price rather than dynamically changing because a plan's current price changed.

## trainers

Purpose:

- Stores gym personal trainers and their rate information

Must support:

- `id` (UUID, primary key)
- `name` (Trainer full name)
- `contact` (Phone / email / contact info)
- `remarks` (Trainer notes, specializations, certifications)
- `default_charge` (Standard PT charge in LKR)
- `is_active` (Boolean status, default true)
- `created_at`, `updated_at`

## memberships

Represents a purchased membership-plan instance / order.

Must support:

- Member (`member_id`)
- Selected plan (`plan_id`)
- Start date
- End date
- Status
- `invoice_number`: Unique invoice sequence number formatted with prefix `"EF"` (e.g. `EF0001`)
- `trainer_id`: Optional personal trainer (nullable foreign key to `trainers.id`)
- `trainer_fee`: Amount charged for personal training in LKR (defaults to trainer's `default_charge`, but editable during order creation)
- `subtotal`: Base plan price + personal trainer fee
- `discount_type`: `'percentage' | 'fixed' | 'none'`
- `discount_value`: The discount percentage (e.g. `10.00`%) or fixed deduction (e.g. `5000.00` LKR)
- `discount_amount`: Resolved monetary discount deduction in LKR
- `discount_reason`: Required explanation for any applied discount
- `total_due`: Final payable amount (`subtotal - discount_amount`)
- Cancellation timestamp
- Cancellation reason
- Refund information where applicable

Expected lifecycle statuses:

- `active`
- `cancelled`
- `expired`

Do not duplicate derived payment state unnecessarily.

## payments

Represents individual payments against a membership.

Must support:

- Membership
- Amount
- Payment method
- Paid date/time
- User who recorded the payment

Payment methods currently include:

- Cash
- Card
- Bank

A membership can have multiple payment rows.

Partial payment status is derived from:

```text
sum(payments.amount) vs memberships.total_due
```

Do not assume one payment per membership.

## notifications

Outbound notification queue.

Must support concepts such as:

- Member
- Channel
- Notification type
- Status
- Payload
- Scheduled time
- Sent time

Current channel:

- Email

The schema should retain the concept of a channel so the notification implementation remains cleanly separated from business operations.

## audit_log

Optional but recommended.

Purpose:

- Record important administrative actions
- Track who performed sensitive operations
- Provide traceability for discounts, cancellations, refunds, and other privileged changes

## member_registrations

Public intake queue for new member applications (replaces the Google Form).

Purpose:

- Capture walk-in / QR applications submitted from the public form
- Hold them as `pending` until an administrator reviews them
- Link the reviewed application to the created or matched `members` row

Expected conceptual fields:

- `id` (UUID, primary key)
- `status`: `pending` | `approved` | `rejected`
- Applicant identity and contact details (name, gender, date of birth, NIC/passport, civil status, profession, phone, land phone, email, residence, city, post code)
- Optional office details (address, city, post code, land phone, mobile)
- `reasons_for_joining`, `how_did_you_hear` (text arrays)
- Emergency contact (name, relationship, phone, land phone)
- Health screening: `parq_answers` (jsonb), `parq_has_condition`, `parq_details`, `weight_kg`, `height_cm`, `fat_percentage`
- Consent: `agreements` (jsonb), `member_declaration`
- `preferred_plan_id` (nullable FK to `membership_plans`) and `preferred_plan` name snapshot
- Review fields: `admin_notes`, `rejection_reason`, `reviewed_by`, `reviewed_at`, `member_id`
- Meta: `source` (`qr_form`), `submitted_at`, `created_at`, `updated_at`

Constraints:

- `member_declaration` must be true
- Measurements must be positive when present
- Gender limited to `male` | `female` | `other`; status limited to `pending` | `approved` | `rejected`

### Public registration flow

- Public route: `/join` (unauthenticated, allowed through `src/lib/supabase/middleware.ts`) renders the mobile-first, dark-theme application form. The canonical QR payload is `<origin>/join`; the QR image is generated with the `qrcode` package.
- Submission is a Server Action (`src/app/actions/registrations.ts`) that validates the payload and inserts the row with the service-role client. The table has no insert policy, so applications cannot be written directly with the anon key.
- On submission the action queues two notifications: `registration_alert` to the configured admin address and `registration_received` acknowledgement to the applicant (when an email is provided).
- The admin reviews applications at `/registrations` and `/registrations/[id]`. Approving creates a `members` row (or links an existing member when the phone/email matches one) and records the review in `audit_log`; rejecting stores `rejection_reason`.
- After approval the reviewer can continue straight into the order wizard (`/memberships/new?member_id=…&ref=…&pay=1`), which pre-fills the initial payment with the full amount due and stores the application reference on the payment notes.
- RLS: authenticated users may select; only administrators may update or delete.
- The retired Google Form's question set (structure only, no responses) is recorded in `docs/registration-form-spec.md`; raw sheet exports contain real applicant data and must never be committed.

---

# 8. Membership & Order Logic

Membership plans are reference data.

When creating a membership / order:

1. Select the member.
2. Select the membership plan and resolve the base plan price.
3. Optionally add **Personal Training (PT)**:
   - User toggles the personal training option.
   - The system prompts to select a trainer from the active `trainers` list.
   - The selected trainer's `default_charge` automatically populates the PT fee field.
   - The PT fee amount is **editable** by the user at order creation time (for custom agreements/promotions).
4. Compute subtotal:
   ```text
   subtotal = plan_price + coalesce(trainer_fee, 0)
   ```
5. Apply discount if applicable:
   - Select discount mode: **Percentage (%)** or **Fixed Amount (LKR)**.
   - Calculate `discount_amount`:
     - Percentage: `(subtotal * discount_value) / 100` (must be `0 < discount_value <= 100`).
     - Fixed amount: `discount_value` (must be `0 < discount_value <= subtotal`).
   - Require a non-empty `discount_reason`.
   - Validate staff discount threshold (if user is Staff).
   - Calculate final amount due: `total_due = subtotal - discount_amount`. Ensure `total_due >= 0`.
6. Assign Invoice Number (`invoice_number`):
   - Default auto-assignment: query the highest existing numeric suffix across existing invoices with prefix `"EF"` (e.g., extracting integer from `EF(\d+)`) and increment by 1 (e.g., `EF0001`, `EF0002`).
   - Prefix `"EF"` is always maintained.
   - Skipping numbers is allowed (gaps are permitted).
   - Manual editing of the trailing number sequence is enabled **only for Admins**. For Staff, the invoice number field is strictly read-only and automatically incremented.
7. Set membership start and end dates.
8. Record the membership / order transaction.
9. Allow one or more payments against the total due.
10. Determine outstanding balance from payment totals (`sum(payments.amount)` vs `memberships.total_due`).
11. Queue invoice / payment receipt PDF email notification.

Do not trust a client-provided total when the value can be derived securely from authoritative database data.

---

# 9. Payments & Invoices

The system must support:

- Full payments
- Partial payments
- Multiple payments for one membership
- Payment history
- Cash/card/bank payment methods
- Payment receipt & invoice generation
- Email delivery of receipts/invoices

### Invoice Numbering Specification

- Format: Incremental identifier with prefix `"EF"` followed by zero-padded digits (e.g., `"EF0001"`, `"EF0002"`, `"EF0015"`).
- Default behavior: On creating a new order, fetch the highest existing numeric suffix in the database and increment by 1 (`MAX(numeric_suffix) + 1`).
- Suffix override & skipping: Skipping numbers is permitted. The `"EF"` prefix remains fixed, but the trailing numeric portion can be manually edited during creation.
- Admin privilege: **Only Admin users can manually edit the trailing number**. For Shop Staff, the invoice number is locked and automatically assigned.
- Uniqueness constraint: `invoice_number` must have a PostgreSQL `UNIQUE` constraint to prevent collisions.

Important payment rules:

- Never overwrite payment history to represent a new payment.
- Each payment should be represented as its own transaction row.
- Avoid floating-point money calculations.
- Store monetary values using an appropriate PostgreSQL numeric/decimal representation.
- Validate positive payment amounts.
- Do not allow payment totals to silently exceed the intended amount without an explicit business rule.
- Preserve payment history for auditability.

---

# 10. Discounts

Discounts are manually applied during membership/order creation.

The system supports two discount types:

1. **Percentage Discount (`percentage`)**:
   - Specified as a percentage between 1% and 100%.
   - Calculated as: `discount_amount = (subtotal * discount_percentage) / 100`.
2. **Fixed Amount Discount (`fixed`)**:
   - Specified as a direct monetary deduction in LKR.
   - Calculated as: `discount_amount = fixed_amount` (must not exceed `subtotal`).

Discount rules:

- Admin has full discount authority (percentage or fixed amount).
- Staff discount permissions are restricted by a configured threshold (e.g., maximum percentage or maximum fixed amount).
- Discount values must be strictly validated on both client and server:
  - Final payable amount (`total_due`) must never become negative.
- Discount reason (`discount_reason`) is strictly required for auditability and traceability.
- Store original base prices, trainer fees, discount type, discount value, and calculated discount amount separately. Never silently alter the master plan price to represent a discount.

---

# 11. Membership Cancellation

Cancellation must support:

- Selecting an active membership
- Cancellation reason
- Cancellation timestamp
- Optional refund amount
- Updating membership status

Cancellation should preserve historical records.

Do not delete the membership to represent cancellation.

A cancelled membership must remain available for historical reporting and audit purposes.

Validate refund amounts against the relevant payment/membership information according to the application's business rules.

---

# 12. Notifications

## Current Provider

Use **Resend** for email.

Do not implement SMS or WhatsApp at this stage.

The current notification system must support:

- Welcome email
- Payment receipt/invoice
- Renewal reminder
- Membership expiry warning

Notifications should have a queue/state model rather than coupling email delivery directly to every UI action.

Suggested lifecycle:

```text
queued → processing → sent
                 ↘ failed
```

Failed notifications should retain enough information to diagnose/retry them.

---

# 13. PDF Invoice Requirements

The application must be able to generate a PDF invoice/receipt for a payment or membership transaction and send that PDF to the member's email address.

Required flow:

```text
Payment / Invoice request
        ↓
Generate invoice data
        ↓
Generate PDF
        ↓
Send email through Resend
        ↓
Attach PDF
        ↓
Record notification status
```

Invoice content should include the relevant available information, such as:

- Gym/application identity (EVO Fitness logo, Balapokuna Road, Colombo 5)
- Invoice/receipt reference (`EF0001` format)
- Member details (name, contact)
- Membership details (selected plan, start and end dates)
- Personal Trainer add-on (trainer name, trainer fee if selected)
- Subtotal
- Discount breakdown (discount type, percentage/amount, discount reason, deduction)
- Total amount due
- Amount paid
- Outstanding balance where applicable
- Payment method (Cash, Card, Bank)
- Transaction date/time
- User who recorded the transaction
- Appropriate status (Paid in Full, Partial Payment)

The exact visual invoice design should remain suitable for a formal printable document (clean white background with crisp typography and gold/dark accents for paper legibility).

Do not expose email provider secrets in client-side code.

---

# 14. Reporting

Reports should be implemented using PostgreSQL views where practical.

Expected reporting concepts:

- Daily revenue
- Weekly revenue
- Monthly revenue
- Membership status summary
- Upcoming membership expiries

Suggested views:

```text
v_daily_revenue
v_weekly_revenue
v_monthly_revenue
v_membership_status_summary
v_upcoming_expiries
```

Reports must be based on authoritative database data.

Staff can view permitted operational reports.

Admin can view all reports.

Do not introduce a separate BI/analytics platform.

---

# 15. Scheduled Operations

Scheduled backend operations may be implemented using Supabase scheduled functionality / database scheduling and Edge Functions.

Expected scheduled work:

- Identify memberships approaching expiry
- Queue renewal reminders
- Queue expiry warnings
- Process queued email notifications

Keep scheduled jobs small and idempotent.

A job running twice must not accidentally send duplicate notifications or corrupt business data.

---

# 16. UI / UX Guidelines

The UI must be inspired by Apple HIG.

The target is:

- Modern
- Minimal
- Calm
- Clean
- Premium
- Highly readable
- Responsive
- Fast
- Touch-friendly

Avoid:

- Generic admin-dashboard appearance
- Excessive gradients
- Excessive glass effects
- Neon colors
- Excessive borders
- Dense tables everywhere
- Unnecessary animations
- Decorative UI that reduces usability

## Design language

Use:

- Generous whitespace
- Clear hierarchy
- Rounded surfaces
- Subtle shadows
- Subtle borders
- Strong typography hierarchy
- System-style typography
- Consistent spacing
- Restrained accent colors
- Large touch targets

Use a system font stack such as:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Display",
  "SF Pro Text",
  Inter,
  sans-serif;
```

Use approximately 44px minimum interactive touch targets where practical.

## Brand Identity & Color Guide

Derived from official brand assets:
- **Logo (`evofitness-logo.webp`)**: 3D embossed metallic imperial gold "EVO" emblem with embedded gold dumbbell, paired with sleek chrome/silver metallic "FITNESS" typography.
- **Poster & Rate Sheet (`poster.jpeg`)**: High-end gym atmosphere with dark onyx/charcoal luxury card surfaces, fine gold border strokes, crisp white typography, and gold-highlighted monetary values.
- **Brand Slogans & Pillars**: *"STRONGER PEOPLE HAPPIER LIVES"* | *"FITNESS FOR A BETTER YOU"* | *"PREMIUM GYM | WORLD CLASS EQUIPMENT | ELITE TRAINERS"*.
- **Flagship Location**: Balapokuna Road, Colombo 5.

### 1. Color Palette Tokens

#### EVO Gold (Primary Accent)
The hallmark metallic warm gold used for primary CTA buttons, badges, key monetary highlights, active indicator accents, and subtle borders:

| Token Name | Hex Code | HSL | Usage |
| :--- | :--- | :--- | :--- |
| `gold-300` (Highlight) | `#FDE047` | `hsl(48, 96%, 63%)` | Bright edge highlights, hovered icons |
| `gold-400` (Accent) | `#F5D061` | `hsl(45, 88%, 67%)` | Primary hover states, active highlights |
| `gold-500` (EVO Gold) | `#E5B842` | `hsl(44, 76%, 58%)` | **Primary Brand Color**, key prices, primary CTAs |
| `gold-600` (Deep Amber) | `#C69214` | `hsl(42, 82%, 43%)` | Dark gold borders, pressed button states |
| `gold-900` (Subtle Tint) | `#362402` | `hsl(38, 93%, 11%)` | Muted background pill tints, selection backdrops |
| `gold-border` | `rgba(229, 184, 66, 0.35)` | - | Card border accents matching `poster.jpeg` |

*Metallic Gold Gradient (for luxury badges, prominent cards, or PDF headers):*
```css
background: linear-gradient(135deg, #F5D061 0%, #E5B842 50%, #C69214 100%);
```

#### Titanium Chrome & Silver (Secondary Accent)
Derived from the "FITNESS" metallic chrome typography in the logo:

| Token Name | Hex Code | HSL | Usage |
| :--- | :--- | :--- | :--- |
| `silver-100` (Platinum) | `#F4F4F5` | `hsl(240, 5%, 96%)` | Primary headings, high-contrast labels |
| `silver-300` (Chrome) | `#D4D4D8` | `hsl(240, 5%, 84%)` | Secondary headings, active tab text |
| `silver-500` (Muted) | `#A1A1AA` | `hsl(240, 5%, 65%)` | Subtitles (e.g. "1 MONTH MEMBERSHIP"), helper text |
| `silver-700` (Dark Steel) | `#3F3F46` | `hsl(240, 5%, 26%)` | Inactive dividers, secondary borders |

#### Obsidian & Charcoal Surface System (Dark Theme First)
The app should embrace the dark, sleek athletic luxury seen in gym interiors and official marketing:

| Token Name | Hex Code | HSL | Usage |
| :--- | :--- | :--- | :--- |
| `background` | `#09090B` | `hsl(240, 10%, 3.9%)` | Deep obsidian app background |
| `surface-card` | `#121214` | `hsl(240, 7%, 7.5%)` | Dark luxury card background (as seen on poster) |
| `surface-elevated` | `#18181B` | `hsl(240, 5%, 9.6%)` | Modals, popovers, dropdowns |
| `surface-hover` | `#27272A` | `hsl(240, 3.7%, 15.9%)`| Interactive row hover, table header |
| `border-subtle` | `#27272A` | `hsl(240, 3.7%, 15.9%)`| Default card and table borders |
| `border-gold` | `rgba(229, 184, 66, 0.35)` | - | Highlighted membership card border |

#### Semantic Status Colors (Apple HIG Aligned)

| Status | Color Name | Hex Code | Usage |
| :--- | :--- | :--- | :--- |
| **Active / Paid** | Emerald Green | `#10B981` | Active membership badge, full payment confirmed |
| **Expiring Soon / Warning** | Warm Amber | `#F59E0B` | 7-day expiry reminder, pending action |
| **Partial Payment** | EVO Gold / Bronze | `#E5B842` | Partial payment recorded, outstanding balance remaining |
| **Cancelled / Overdue / Danger** | Rose Red | `#EF4444` | Cancelled status, payment overdue, destructive action |
| **Info / Scheduled** | Sky Blue | `#0EA5E9` | Queued notifications, informational notices |

### 2. Styling Rules for AI Agents

1. **Strict Dark Mode Only**: The entire web application UI is strictly and exclusively dark mode. Do NOT implement a light mode toggle or light mode CSS for the application interface. The UI must always render in deep obsidian backgrounds (`#09090B`) with dark charcoal cards (`#121214`) accented by fine gold borders (`rgba(229, 184, 66, 0.35)`).
2. **PWA (Progressive Web Application)**:
   - Configure the application as an installable PWA.
   - Provide a valid Web App Manifest (`manifest.json` / `site.webmanifest`) with:
     - `name`: "EVO Fitness Membership Management"
     - `short_name`: "EVO Fitness"
     - `theme_color`: `#09090B`
     - `background_color`: `#09090B`
     - `display`: `standalone`
     - Appropriate PWA icons (192x192, 512x512, maskable)
   - Implement service worker caching for offline app shell loading and smooth network transitions.
   - Include Apple mobile web app tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-touch-icon`).
3. **Apple HIG Restraint**: Use EVO Gold with intention and restraint—principally for prices, primary actions, and badges. Do not plaster heavy gold backgrounds across entire pages or tables.
4. **Card Presentation**: Replicate the poster's card structure for membership tiers: dark card surface, subtle gold stroke, clean white plan title, silver duration label, and prominent gold price text (`LKR XX,XXX`).
5. **Printable PDF Invoices**: While the app interface is strictly dark mode, printable PDF invoices or receipts sent via email must use a clean, high-contrast white/slate background (`#FFFFFF` / `#F8F9FA`), dark charcoal text (`#09090B`), and deep goldenrod accents (`#B8860B`) to ensure ink-efficient and crisp physical printing.

## shadcn/ui

Use shadcn/ui components as the primary component foundation.

Prefer existing shadcn/ui components before creating custom equivalents.

Components should be themed through Tailwind/CSS variables rather than duplicated styles.

---

# 17. Application Layout

Desktop should use a clear application navigation structure.

Primary areas:

- Dashboard
- Members
- Memberships / Orders
- Trainers (Admin management; selected during order creation)
- Payments
- Reports
- Users (Admin only)
- Settings/admin configuration where required

Responsive behavior:

- Desktop: sidebar/navigation
- Tablet: compact/collapsible navigation
- Mobile: compact navigation suitable for touch and PWA standalone experience

The application is internal and does not require a separate mobile application.

---

# 18. Required UI States

Every important data-driven screen must consider:

- Loading state
- Empty state
- Success state
- Error state
- Validation state
- Permission-denied state
- Network/API failure
- No search results
- Confirmation state for destructive actions

Do not leave blank screens while data is loading.

Destructive operations such as cancellation must require deliberate confirmation.

---

# 19. Search and Filtering

Member and membership interfaces should support practical searching/filtering where required.

Search should handle common real-world input mistakes where possible.

Examples:

- Leading/trailing whitespace
- Case differences
- Phone-number formatting
- Empty searches
- Partial names

Do not build a complex search engine.

Use database-supported filtering and indexes where needed.

---

# 20. Important Edge Cases

The implementation must explicitly account for:

### Members

- Duplicate member registration
- Missing required contact information
- Invalid phone/email formats
- Member with no active membership
- Member with multiple historical memberships
- Member with an expired membership

### Memberships

- Invalid start/end dates
- End date before start date
- Expired membership
- Cancelled membership
- Attempt to cancel an already cancelled membership
- Attempt to modify a historical membership incorrectly
- Plan price changed after an old membership was purchased

Historical memberships should preserve their applicable financial values rather than dynamically changing because a plan's current price changed.

### Payments

- Zero/negative payment
- Partial payment
- Multiple partial payments
- Exact final payment
- Payment exceeding balance
- Duplicate submission caused by double-click/network retry
- Invalid payment method
- Payment against cancelled membership
- Missing member email when sending receipt
- Email delivery failure

### Discounts

- Discount larger than total
- Negative discount
- Missing discount reason
- Staff attempting unauthorized discount
- Discount applied twice accidentally

### Cancellation/refunds

- Cancelling an already cancelled membership
- Cancelling an expired membership
- Refund greater than eligible amount
- Missing cancellation reason
- Duplicate cancellation submission

### Notifications

- Missing email address
- Invalid email address
- Resend API failure
- Timeout
- Notification sent but database status not updated
- Duplicate queue processing
- Retry of failed notification
- Duplicate email prevention

### Authentication/RBAC

- Unauthenticated access
- Expired session
- Staff accessing admin UI directly
- Staff calling an admin-only database operation manually
- Disabled/deleted user attempting access
- Missing profile/role record

### Database/network

- Supabase unavailable
- Request timeout
- Concurrent updates
- Stale UI data
- Failed transaction
- Partial operation failure

Critical multi-step financial operations should use an atomic server-side/database operation where appropriate rather than several unrelated client-side mutations.

---

# 21. Data Integrity

Database constraints should be used wherever practical.

Examples:

- Foreign keys
- NOT NULL constraints
- CHECK constraints
- Unique constraints
- Appropriate indexes
- Valid enum/domain values
- Positive monetary amounts
- Valid status values

Do not rely exclusively on TypeScript validation.

Frontend validation improves UX.

Database validation protects the data.

---

# 22. Security Rules

Security is mandatory.

1. Enable RLS on every protected application table.
2. Write RLS policies before relying on the table from the UI.
3. Use Supabase Auth for identity.
4. Use the user's authenticated identity when evaluating permissions.
5. Never trust role values supplied by the browser.
6. Never expose the service-role key.
7. Never put secrets into client-side bundles.
8. Validate all server-side inputs.
9. Do not construct unsafe SQL from user input.
10. Preserve auditability for sensitive financial/admin actions.
11. Avoid returning unnecessary sensitive data to the client.
12. Use HTTPS through Cloudflare and Supabase.
13. No public registration.

RLS is the primary database authorization boundary.

---

# 23. Next.js Guidelines

Use Next.js with TypeScript.

Prefer:

- Server-side functionality for privileged operations
- Client components only where interactivity requires them
- Clear separation between UI, business logic, data access, and integrations
- Reusable components
- Strong typing
- Server-side environment variables for secrets

Do not turn the entire application into unnecessary client-side code.

Do not create an Express/Node backend.

Do not create a second API server unless a specific Next.js server-side route/function is required.

---

# 24. Supabase Guidelines

Supabase is the source of truth for persistent application data.

Use:

- Supabase Auth
- PostgreSQL
- RLS
- SQL migrations
- SQL views
- Edge Functions for privileged/scheduled work

### Mandatory AI-agent rule

**Before changing database-related code, inspect the current Supabase schema through Supabase MCP.**

When performing DB work:

1. Inspect existing tables and relationships.
2. Inspect relevant RLS policies.
3. Inspect existing functions/triggers/views where relevant.
4. Make the smallest appropriate schema change.
5. Apply/update migrations.
6. Verify the result through Supabase MCP.
7. Only then update dependent application code.

Do not create a duplicate table because the agent did not find an existing table immediately.

---

# 25. Resend Guidelines

Resend is the current email delivery provider.

Use it for:

- Welcome emails
- Payment receipts
- Invoices
- Renewal reminders
- Expiry warnings

Email sending must happen server-side.

The Resend API key must come from environment configuration.

Do not call Resend directly from browser code.

Email templates should be reusable and separated from business logic.

PDF invoices must be attached to the relevant email when required.

---

# 26. Cloudflare Deployment

The application is deployed through Cloudflare.

Deployment requirements:

- Git-based deployment
- Production deployment from the designated production branch
- Environment variables configured through the deployment environment
- No manually embedded secrets
- Build must succeed in Cloudflare's environment
- Production configuration must be separate from local development configuration

Do not add another hosting provider.

Do not introduce a dedicated application server.

---

# 27. Development Environments

Keep environments simple.

Expected environments:

```text
Local Development
        ↓
Production
```

A separate Supabase staging project may be used if the project already has one or if schema testing requires it.

Database changes must be represented as version-controlled migrations.

Never make undocumented production schema changes.

---

# 28. Git / Code Quality

Keep changes focused.

Before implementing a feature:

1. Inspect existing code.
2. Inspect related database schema through Supabase MCP.
3. Reuse existing components/utilities.
4. Implement the smallest coherent change.
5. Validate types/lint/build as applicable.
6. Check relevant permission paths.
7. Check loading/error/empty states.
8. Check responsive behavior.

Avoid unnecessary refactors while implementing unrelated features.

Do not rewrite working code simply to match personal style.

---

# 29. AI Agent Working Rules

The AI coding agent should behave as an implementation agent, not as an architecture generator.

## Before coding

- Inspect the repository.
- Identify the existing Next.js structure.
- Inspect package configuration.
- Inspect environment configuration without exposing secrets.
- Inspect Supabase schema using Supabase MCP.
- Inspect relevant existing components before creating new ones.

## During coding

- Follow this document.
- Reuse existing patterns.
- Prefer simple solutions.
- Keep changes localized.
- Preserve existing functionality.
- Use TypeScript.
- Use shadcn/ui where suitable.
- Follow the Apple-HIG-inspired visual language.
- Implement proper validation.
- Implement authorization at the database layer.
- Keep business logic out of presentation components where practical.

## For database changes

Always use Supabase MCP.

Never guess the schema.

Never bypass RLS during normal application operations.

Never expose service-role credentials.

## For UI changes

Check:

- Desktop
- Tablet
- Mobile
- Loading
- Empty
- Error
- Permission states
- Keyboard/accessibility behavior
- Touch target sizes

## For financial operations

Treat them as high-integrity operations.

Check:

- Amount validation
- Duplicate submission
- Concurrent updates
- Partial payment behavior
- Discount calculations
- Membership status
- Invoice generation
- Notification behavior

---

# 30. Sub-Agent / Agentic Development

When a task is sufficiently large or naturally separable, the AI agent may use a sub-agentic approach.

Use sub-agents when they materially improve execution, for example:

- One agent investigates the existing database/schema.
- One agent investigates the existing UI/component structure.
- One agent implements a focused feature.
- One agent reviews security/RLS implications.
- One agent reviews tests/build/type errors.

Do not spawn sub-agents for trivial tasks.

Sub-agents must follow this `AGENTS.md`.

The primary agent remains responsible for:

- Coordinating work
- Resolving conflicts
- Reviewing changes
- Ensuring architectural consistency
- Validating security
- Ensuring the final implementation matches the requirements

---

# 31. Things Not Required

Do not introduce the following unless an explicit future requirement is added:

- Microservices
- Kubernetes
- Message brokers
- Separate backend servers
- Separate BI platforms
- Separate mobile applications
- SMS integration
- WhatsApp integration
- Complex workflow engines
- Custom authentication systems
- Custom authorization frameworks
- Additional database providers
- Additional hosting providers
- Unnecessary third-party infrastructure

The application should remain a small, maintainable internal business system.

---

# 32. Technical Source of Truth

When requirements conflict:

1. Current database state and migrations are authoritative for the actual implemented schema.
2. This `AGENTS.md` defines the intended technical architecture and development rules.
3. Existing application behavior should be preserved unless the requested feature explicitly changes it.
4. Do not invent missing business rules.
5. Ask for clarification when an implementation decision materially affects business behavior and cannot be safely inferred.

The primary goal is a secure, maintainable, simple gym membership platform using:

```text
Next.js
+ TypeScript
+ Tailwind CSS
+ shadcn/ui
+ Apple-HIG-inspired UI
+ Supabase
+ Supabase MCP for DB operations
+ Cloudflare deployment
+ Resend
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
