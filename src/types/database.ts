export type UserRole = 'admin' | 'staff' | 'accountant';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type Gender = 'male' | 'female' | 'other';

export interface Member {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  gender: Gender;
  nic_passport: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  // Google Form extended attributes
  residence?: string | null;
  city?: string | null;
  post_code?: string | null;
  land_phone?: string | null;
  civil_status?: string | null;
  profession?: string | null;
  office_address?: string | null;
  emergency_contact_relationship?: string | null;
  emergency_contact_land_phone?: string | null;
  reasons_for_joining?: string | null;
  how_did_you_hear?: string | null;
  parq_has_condition?: boolean;
  parq_details?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  fat_percentage?: number | null;
  preferred_plan?: string | null;
  created_at: string;
  updated_at: string;
}

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

/**
 * How many people the application covers.
 * - `individual` one person
 * - `buddy` two people (sold as the Couple package or a two-person package)
 * - `family` three to six people on one membership
 */
export type ApplicationKind = 'individual' | 'buddy' | 'family';

/**
 * An additional person on a group application (position 2 and up). The primary
 * applicant is stored on the registration row itself. Each applicant answers
 * the PAR-Q health screening independently.
 */
export interface MemberRegistrationApplicant {
  id: string;
  registration_id: string;
  position: number;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: Gender;
  date_of_birth: string | null;
  nic_passport: string | null;
  civil_status: string | null;
  profession: string | null;
  mobile: string | null;
  email: string | null;
  parq_answers: Record<string, boolean>;
  parq_has_condition: boolean;
  parq_details: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  fat_percentage: number | null;
  member_id: string | null;
  created_at: string;
}

/** Link row covering every person a membership applies to. */
export interface MembershipMember {
  id: string;
  membership_id: string;
  member_id: string;
  is_primary: boolean;
  created_at: string;
  member?: Member;
}

export interface MemberRegistration {
  id: string;
  status: RegistrationStatus;
  application_kind: ApplicationKind;

  // Primary applicant details
  first_name: string;
  last_name: string;
  full_name: string;
  gender: Gender;
  date_of_birth: string | null;
  nic_passport: string | null;
  civil_status: string | null;
  profession: string | null;

  // Contact
  phone: string;
  land_phone: string | null;
  email: string | null;

  // Residence
  residence: string | null;
  city: string | null;
  post_code: string | null;

  // Office / employment
  office_address: string | null;
  office_city: string | null;
  office_post_code: string | null;
  office_land_phone: string | null;
  office_mobile: string | null;

  // Interests and attribution
  reasons_for_joining: string[];
  how_did_you_hear: string[];

  // Emergency contact
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  emergency_contact_land_phone: string | null;

  // Health screening
  parq_answers: Record<string, boolean>;
  parq_has_condition: boolean;
  parq_details: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  fat_percentage: number | null;

  // Consent
  agreements: Record<string, boolean>;
  member_declaration: boolean;

  // Preferred plan
  preferred_plan_id: string | null;
  preferred_plan: string | null;

  // Admin review workflow
  admin_notes: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  member_id: string | null;

  // Meta
  source: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;

  // Joined relations
  plan?: MembershipPlan | null;
  member?: Pick<Member, 'id' | 'full_name' | 'phone' | 'email'> | null;
  reviewer?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
  /** Additional people on a buddy/family application, ordered by position. */
  applicants?: MemberRegistrationApplicant[];
  /** People on the application (1 + additional applicants). Set by list queries. */
  people_count?: number;
}

export interface MembershipPlan {
  id: string;
  name: string;
  duration_type: 'days' | 'months';
  duration_value: number;
  target_group: string;
  price: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Trainer {
  id: string;
  name: string;
  contact: string;
  remarks: string | null;
  default_charge: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type MembershipStatus = 'active' | 'cancelled' | 'expired';
export type DiscountType = 'none' | 'percentage' | 'fixed';
export type PaymentMethod = 'cash' | 'card' | 'bank';

export interface Membership {
  id: string;
  invoice_number: string;
  member_id: string;
  plan_id: string;
  registration_id: string | null;
  trainer_id: string | null;
  trainer_fee: number;
  plan_price: number;
  subtotal: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  discount_reason: string | null;
  total_due: number;
  start_date: string;
  end_date: string;
  status: MembershipStatus;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  refund_amount: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  member?: Member;
  plan?: MembershipPlan;
  trainer?: Trainer | null;
  payments?: Payment[];
  /** Everyone the membership covers, including the primary member. */
  members?: MembershipMember[];
  paid_amount?: number;
  outstanding_balance?: number;
}

export interface Payment {
  id: string;
  membership_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  member_id: string | null;
  channel: 'email';
  type: 'welcome' | 'invoice_receipt' | 'renewal_reminder' | 'expiry_warning';
  status: 'queued' | 'processing' | 'sent' | 'failed';
  recipient_email: string;
  subject: string;
  payload: Record<string, unknown>;
  error_message: string | null;
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  user_role: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface DailyRevenueReport {
  report_date: string;
  transaction_count: number;
  total_revenue: number;
  cash_revenue: number;
  card_revenue: number;
  bank_revenue: number;
}

export interface WeeklyRevenueReport {
  week_start: string;
  transaction_count: number;
  total_revenue: number;
  cash_revenue: number;
  card_revenue: number;
  bank_revenue: number;
}

export interface MonthlyRevenueReport {
  month_start: string;
  transaction_count: number;
  total_revenue: number;
  cash_revenue: number;
  card_revenue: number;
  bank_revenue: number;
}

export interface MembershipStatusSummary {
  status: MembershipStatus;
  total_memberships: number;
  total_value: number;
  total_paid: number;
  total_outstanding: number;
}

export interface UpcomingExpiry {
  membership_id: string;
  invoice_number: string;
  start_date: string;
  end_date: string;
  days_remaining: number;
  status: MembershipStatus;
  total_due: number;
  member_id: string;
  member_name: string;
  member_phone: string;
  member_email: string | null;
  plan_name: string;
}

/** Supplier / vendor of shop inventory. */
export interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  address: string | null;
  remarks: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Inventory master row. Inventory ID = inventory_code (e.g. INV0001). */
export interface Product {
  id: string;
  inventory_code: string;
  description: string;
  sale_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Product with derived stock levels (from v_product_stock). */
export interface ProductStock extends Product {
  purchased_qty: number;
  sold_qty: number;
  on_hand: number;
  stock_sale_value: number;
  purchased_cost: number;
}

/** One accountant register line: unit cost, qty, amount, sale price snapshot. */
export interface StockPurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  unit_price: number;
  qty: number;
  amount: number;
  sale_price: number;
  product?: Product;
}

/** Purchase header: supplier invoice / GRN. */
export interface StockPurchase {
  id: string;
  supplier_id: string;
  invoice_grn_no: string;
  purchase_date: string;
  subtotal: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  supplier?: Supplier;
  items?: StockPurchaseItem[];
}

export interface ProductSaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  qty: number;
  unit_price: number;
  amount: number;
  product?: Product;
}

/** Counter sale header (PS prefix, e.g. PS0001). */
export interface ProductSale {
  id: string;
  sale_number: string;
  member_id: string | null;
  customer_name: string | null;
  subtotal: number;
  total_due: number;
  payment_method: PaymentMethod;
  sold_by: string | null;
  sold_at: string;
  notes: string | null;
  created_at: string;
  items?: ProductSaleItem[];
  member?: Member;
}
