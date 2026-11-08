# Retired Google Form — registration question reference

The registration Google Form that `/join` replaced. This note records **only the
question set** (question text, required flag, option labels). No responses,
response counts, or personal values are retained anywhere in this repository.

> The Google Sheets export (`form.html`, 92 responses, 39 columns) that this note
> was derived from held real applicant data — names, NIC/passport numbers, mobile
> and landline numbers, e-mail addresses, residences, dates of birth and health
> answers. It was **deleted from the working tree and purged from git history**
> (it had never been pushed). Raw exports must stay out of the repository; see
> `.gitignore`.

The primary applicant's identity, contact and health fields live on
`member_registrations` itself; every additional person adds a row in
`member_registration_applicants` (same shape, minus the application-level
office/emergency/consent/preference fields).

Captured 2026-10-13 from the last export present in the working tree. The option
lists below come from the values observed in that export, so they are a **lower
bound**: a question may offer choices nobody happened to pick. `*` = required in
the original form.

## Question set

| # | Original question | Req. | Where it lives now |
|---:|:---|:---:|:---|
| 0 | Timestamp | | `member_registrations.submitted_at` (server-set) |
| 1 | First Name | * | per-person block `first_name` → `members.full_name` |
| 2 | Last Name | * | per-person block `last_name` |
| 3 | Residence | * | `residence` |
| 4 | City | * | `city` |
| 5 | Post Code | | `post_code` |
| 6 | Land Phone | | `land_phone` |
| 7 | Mobile | * | `phone` (normalised to E.164) |
| 8 | Date of Birth | * | `date_of_birth` |
| 9 | ID / Passport No / Driving License | | `nic_passport` |
| 10 | Gender | * | `gender` (`male` \| `female` \| `other`) |
| 11 | Civil Status | * | `civil_status` |
| 12 | E-mail | | per-person block `email` |
| 13 | Profession | | per-person block `profession` |
| 14 | Office Address | | `office_address` |
| 15 | Office City | | `office_city` |
| 16 | Office Post Code | | `office_post_code` |
| 17 | Office Land Phone | | `office_land_phone` |
| 18 | Office Mobile | | `office_mobile` |
| 19 | Reasons for Joining (select all that apply) | | `reasons_for_joining` `text[]` |
| 20 | How did you hear about us? (select all that apply) | | `how_did_you_hear` `text[]` |
| 21 | Emergency Contact Name | * | `emergency_contact_name` |
| 22 | Relationship | * | `emergency_contact_relationship` |
| 23 | Emergency Contact Land Phone | | `emergency_contact_land_phone` |
| 24 | Emergency Contact Mobile | * | `emergency_contact_phone` |
| 25–31 | PAR-Q questions 1–7 (below) | | per-person `parq_answers` (jsonb keys), rolled up into `parq_has_condition` |
| 32 | PAR-Q details / doctor's recommendation | | per-person `parq_details` |
| 33 | Weight (kg) | | per-person `weight_kg` |
| 34 | Height (cm) | | per-person `height_cm` |
| 35 | Fat % | | per-person `fat_percentage` |
| 36 | Required Agreements (select all that apply) | * | `agreements` (jsonb, 5 keys) |
| 37 | Member Declaration | * | `member_declaration` (`true`) |
| 38 | Please select your preferred gym membership plan | | `preferred_plan_id` + `preferred_plan` snapshot |

## Option labels

**Gender (10)** — `Female`, `Male`

**Civil Status (11)** — `Married`, `Single`
*implemented as* `Single`, `Married`, `Other`

**Reasons for Joining (19)** — `Endurance`, `Fitness`, `Muscle & Power`,
`Strength & Size`, `Toning & Weight Loss`

**How did you hear about us? (20)** — `Existing Member`, `Facebook`, `Friend`,
`Leaflet`, `Newspaper`, `Website`
*implemented as* the same set plus `Instagram`

**PAR-Q (25–31)**, each answered `Yes` / `No`:

1. Has your doctor ever said that you have a heart condition and that you should
   only do physical activity recommended by a doctor?
2. Do you feel pain in your chest when you do physical activity?
3. In the past month, have you had chest pain when you were not doing physical
   activity?
4. Do you lose your balance because of dizziness or do you ever lose
   consciousness?
5. Do you have a bone or joint problem that could be made worse by a change in
   your physical activity?
6. Is your doctor currently prescribing drugs for your blood pressure or heart
   condition?
7. Do you know of any other reason you should not do physical activity?

**Required Agreements (36)** — `I have read and understood the Release of
Liability and Conditions`, `I agree to comply with all rules and regulations`,
`I understand that I will not be entitled to a refund under any circumstances`,
`I consent to my personal data being collected and stored by High Impact`,
`I confirm that the information provided in this application is accurate and
complete`
*implemented with* the same wording except the data-consent clause, which names
EVO Fitness.

**Member Declaration (37)** — `I have read and understood the above Conditions
and I Agree.`

**Preferred plan (38)** — `6-Month Membership`, `Annual Membership`,
`Monthly Membership`
*superseded by* the 12-plan catalogue, filtered to the plans compatible with the
application kind and the applicant's gender.

## Differences from the retired form

- **Application kind** is new: `Individual`, `Couple / Buddy`, or `Family`
  (2–6 people). The retired form was single-applicant only; multi-person
  applications now store one row per person in
  `member_registration_applicants` with its own identity, PAR-Q and
  measurement fields.
- **Phone** captures a country code and is normalised to E.164 before storage.
- **Date of birth** is required for the primary applicant in both the client
  validation and `submitRegistration`; additional applicants may omit it.
- **Plan pricing** is published at `/join/pricing` from the live
  `membership_plans` table instead of being described inside the form.
- A hidden honeypot field rejects bot submissions silently.
