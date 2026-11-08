'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Member, MembershipPlan, Trainer, Profile, DiscountType, PaymentMethod } from '@/types/database';
import { createMembership } from '@/app/actions/memberships';
import { formatLKR, formatDate } from '@/lib/utils';
import { addDays, addMonths, format } from 'date-fns';
import { SelectMemberModal } from './select-member-modal';
import { RegisterMemberModal } from '@/components/members/register-member-modal';
import {
  Receipt,
  User,
  AlertCircle,
  Dumbbell,
  Percent,
  CreditCard,
  Calendar,
  Lock,
  Edit3,
  Search,
  UserPlus,
  Phone,
  Mail,
  Sparkles,
  Check,
  Plus,
  X,
} from 'lucide-react';

interface NewMembershipWizardProps {
  members: Member[];
  plans: MembershipPlan[];
  trainers: Trainer[];
  nextInvoiceNumber: string;
  currentUserProfile: Profile | null;
}

export function NewMembershipWizard({
  members,
  plans,
  trainers,
  nextInvoiceNumber,
  currentUserProfile,
}: NewMembershipWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedMemberId = searchParams.get('member_id') || '';
  // Optional handoff context when the order is created from a public-form registration.
  const registrationRef = searchParams.get('ref')?.trim().toUpperCase() || '';
  // Full registration id (uuid) - links every person on the application to the order.
  const registrationId = searchParams.get('registration_id')?.trim() || '';
  const autoRecordPayment = searchParams.get('pay') === '1';

  const isAdmin = currentUserProfile?.role === 'admin';

  // Members list in state so newly registered members are immediately available
  const [membersList, setMembersList] = useState<Member[]>(members);
  const [selectedMemberId, setSelectedMemberId] = useState(preselectedMemberId);
  const [isSelectMemberModalOpen, setIsSelectMemberModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Category filter state for package selection
  const [packageCategory, setPackageCategory] = useState<string>('all');

  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || '');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Personal Trainer
  const [hasPt, setHasPt] = useState(false);
  const [selectedTrainerId, setSelectedTrainerId] = useState(trainers[0]?.id || '');
  const [trainerFee, setTrainerFee] = useState<number>(0);

  // Discounts
  const [discountType, setDiscountType] = useState<DiscountType>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState('');

  // Invoice Number
  const [invoiceNumber, setInvoiceNumber] = useState(nextInvoiceNumber);

  // Initial Payment
  const [recordInitialPayment, setRecordInitialPayment] = useState(autoRecordPayment);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentAmountEdited, setPaymentAmountEdited] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentNotes] = useState(
    registrationRef ? `Registration ref ${registrationRef}` : ''
  );

  // Submission & UI feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected member object
  const selectedMember = membersList.find((m) => m.id === selectedMemberId);

  const handleMemberRegistered = (newMember: Member) => {
    setMembersList((prev) => [newMember, ...prev]);
    setSelectedMemberId(newMember.id);
    setIsRegisterModalOpen(false);
  };

  // Package Categorization based on official collateral
  const packageCategories = useMemo(() => {
    return [
      { id: 'all', label: 'All Packages', count: plans.length },
      {
        id: 'general',
        label: 'General Access',
        count: plans.filter(
          (p) =>
            p.target_group.toLowerCase().includes('general') ||
            p.name === 'Day Pass' ||
            p.name === 'Monthly'
        ).length,
      },
      {
        id: 'gents',
        label: 'Gents Access',
        count: plans.filter(
          (p) =>
            p.target_group.toLowerCase().includes('gent') ||
            p.name.toLowerCase().includes('gent')
        ).length,
      },
      {
        id: 'ladies',
        label: 'Ladies Access',
        count: plans.filter(
          (p) =>
            p.target_group.toLowerCase().includes('lad') ||
            p.name.toLowerCase().includes('lad')
        ).length,
      },
      {
        id: 'couples',
        label: 'Couples & Family',
        count: plans.filter(
          (p) =>
            p.target_group.toLowerCase().includes('couple') ||
            p.target_group.toLowerCase().includes('family') ||
            p.name.toLowerCase().includes('couple') ||
            p.name.toLowerCase().includes('family')
        ).length,
      },
    ];
  }, [plans]);

  const filteredPlans = useMemo(() => {
    if (packageCategory === 'all') return plans;
    if (packageCategory === 'general') {
      return plans.filter(
        (p) =>
          p.target_group.toLowerCase().includes('general') ||
          p.name === 'Day Pass' ||
          p.name === 'Monthly'
      );
    }
    if (packageCategory === 'gents') {
      return plans.filter(
        (p) =>
          p.target_group.toLowerCase().includes('gent') ||
          p.name.toLowerCase().includes('gent')
      );
    }
    if (packageCategory === 'ladies') {
      return plans.filter(
        (p) =>
          p.target_group.toLowerCase().includes('lad') ||
          p.name.toLowerCase().includes('lad')
      );
    }
    if (packageCategory === 'couples') {
      return plans.filter(
        (p) =>
          p.target_group.toLowerCase().includes('couple') ||
          p.target_group.toLowerCase().includes('family') ||
          p.name.toLowerCase().includes('couple') ||
          p.name.toLowerCase().includes('family')
      );
    }
    return plans;
  }, [plans, packageCategory]);

  // Selected plan object
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  // Update trainer fee when PT assignment changes. Scheduled (not synchronous)
  // so the effect never triggers a cascading render; UX is unchanged.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (hasPt && selectedTrainerId) {
        const t = trainers.find((tr) => tr.id === selectedTrainerId);
        if (t) {
          setTrainerFee(Number(t.default_charge));
        }
      } else {
        setTrainerFee(0);
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [hasPt, selectedTrainerId, trainers]);

  // Derived financial computations
  const basePlanPrice = selectedPlan ? Number(selectedPlan.price) : 0;
  const currentTrainerFee = hasPt ? Number(trainerFee || 0) : 0;
  const subtotal = basePlanPrice + currentTrainerFee;

  let calculatedDiscountAmount = 0;
  if (discountType === 'percentage') {
    calculatedDiscountAmount = Math.round((subtotal * Math.min(100, Math.max(0, discountValue))) / 100);
  } else if (discountType === 'fixed') {
    calculatedDiscountAmount = Math.min(subtotal, Math.max(0, discountValue));
  }

  const totalDue = Math.max(0, subtotal - calculatedDiscountAmount);

  // Calculate projected end date
  let calculatedEndDate = startDate;
  if (selectedPlan) {
    const sDate = new Date(startDate);
    if (!isNaN(sDate.getTime())) {
      const eDate =
        selectedPlan.duration_type === 'days'
          ? addDays(sDate, selectedPlan.duration_value)
          : addMonths(sDate, selectedPlan.duration_value);
      calculatedEndDate = format(eDate, 'yyyy-MM-dd');
    }
  }

  // The initial payment defaults to the full amount due and keeps following it
  // while the order is still being built (plan, PT fee, discount), until the
  // user types an explicit amount.
  const effectivePaymentAmount = paymentAmountEdited ? paymentAmount : totalDue;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedMemberId) {
      setError('Please select a member.');
      return;
    }

    if (!selectedPlanId) {
      setError('Please select a membership plan.');
      return;
    }

    if (discountType !== 'none' && !discountReason.trim()) {
      setError('A discount reason is strictly required when applying discounts.');
      return;
    }

    if (!isAdmin && discountType === 'percentage' && discountValue > 15 && !(discountValue === 30 && discountReason.includes('First 100'))) {
      setError('Staff cannot issue percentage discounts greater than 15% (except the authorized First 100 30% promotion). Admin authorization required.');
      return;
    }

    if (!isAdmin && discountType === 'fixed' && discountValue > 10000) {
      setError('Staff cannot issue fixed discounts greater than LKR 10,000. Admin authorization required.');
      return;
    }

    if (recordInitialPayment && effectivePaymentAmount > totalDue) {
      setError(`Payment amount cannot exceed the total due (${formatLKR(totalDue)}).`);
      return;
    }

    setLoading(true);

    try {
      const res = await createMembership({
        member_id: selectedMemberId,
        plan_id: selectedPlanId,
        start_date: startDate,
        trainer_id: hasPt ? selectedTrainerId : null,
        trainer_fee: hasPt ? trainerFee : 0,
        discount_type: discountType,
        discount_value: discountValue,
        discount_reason: discountReason || undefined,
        custom_invoice_number: isAdmin ? invoiceNumber : undefined,
        registration_id: registrationId || null,
        initial_payment: recordInitialPayment && effectivePaymentAmount > 0
          ? {
              amount: effectivePaymentAmount,
              payment_method: paymentMethod,
              notes: paymentNotes || 'Initial payment at order creation',
            }
          : undefined,
      });

      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      router.push(`/memberships/${res.membership.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create membership.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Wizard Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Member Selection */}
          <div className="card-luxury rounded-2xl p-6 bg-[#121214]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#E5B842] flex items-center gap-2">
                <User className="w-4 h-4" />
                1. Select Gym Member
              </h2>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] hover:border-[#E5B842]/40 text-[#E5B842] text-xs font-semibold transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Quick Register Member</span>
              </button>
            </div>

            {selectedMember ? (
              <div className="p-4 rounded-xl bg-[#18181B] border border-[#E5B842]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-[#E5B842]/20 border border-[#E5B842] flex items-center justify-center font-bold text-sm text-[#E5B842] shrink-0">
                    {selectedMember.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#F4F4F5]">
                        {selectedMember.full_name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          selectedMember.gender === 'male'
                            ? 'bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30'
                            : selectedMember.gender === 'female'
                            ? 'bg-[#EC4899]/15 text-[#F472B6] border border-[#EC4899]/30'
                            : 'bg-[#A1A1AA]/15 text-[#A1A1AA] border border-[#A1A1AA]/30'
                        }`}
                      >
                        {selectedMember.gender}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#A1A1AA] mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#71717A]" />
                        {selectedMember.phone}
                      </span>
                      {selectedMember.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#71717A]" />
                          {selectedMember.email}
                        </span>
                      )}
                      {selectedMember.nic_passport && (
                        <span className="text-[11px] text-[#71717A]">
                          NIC: {selectedMember.nic_passport}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSelectMemberModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-[#F4F4F5] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Change Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMemberId('')}
                    className="p-1.5 rounded-xl text-[#71717A] hover:text-[#EF4444] transition-colors"
                    title="Deselect"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-[#27272A] bg-[#18181B]/40 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#27272A] flex items-center justify-center text-[#71717A] mx-auto">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#F4F4F5]">
                    No member selected for this order
                  </p>
                  <p className="text-[11px] text-[#71717A] mt-0.5">
                    Select an existing gym member from directory or register a new member directly
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsSelectMemberModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] text-[#F4F4F5] font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5 text-[#E5B842]" />
                    <span>Select Member from Directory</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold-gradient text-[#09090B] font-bold text-xs hover:brightness-105 transition-all shadow-[0_2px_8px_rgba(229,184,66,0.2)] cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Quick Register Member</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Plan Selection Cards */}
          <div className="card-luxury rounded-2xl p-6 bg-[#121214]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#E5B842] flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                2. Select Membership Package (Official Rates)
              </h2>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#18181B] border border-[#27272A] rounded-xl overflow-x-auto mb-4">
              {packageCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setPackageCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    packageCategory === cat.id
                      ? 'bg-gold-gradient text-[#09090B] shadow-sm font-bold'
                      : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
                  }`}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredPlans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const isAnnual = plan.duration_value === 12;

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                      isSelected
                        ? 'bg-[#18181B] border-[#E5B842] shadow-[0_0_18px_rgba(229,184,66,0.18)] ring-1 ring-[#E5B842]'
                        : 'bg-[#18181B]/50 border-[#27272A] hover:border-[#3F3F46] hover:bg-[#18181B]/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            plan.target_group.toLowerCase().includes('gent')
                              ? 'bg-[#3B82F6]/10 text-[#60A5FA] border-[#3B82F6]/30'
                              : plan.target_group.toLowerCase().includes('lad')
                              ? 'bg-[#EC4899]/10 text-[#F472B6] border-[#EC4899]/30'
                              : plan.target_group.toLowerCase().includes('couple') || plan.target_group.toLowerCase().includes('family')
                              ? 'bg-[#A855F7]/10 text-[#C084FC] border-[#A855F7]/30'
                              : 'bg-[#10B981]/10 text-[#34D399] border-[#10B981]/30'
                          }`}
                        >
                          {plan.target_group}
                        </span>
                        {isSelected ? (
                          <span className="w-5 h-5 rounded-full bg-[#E5B842] flex items-center justify-center text-[#09090B] shadow-sm">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        ) : isAnnual ? (
                          <span className="text-[9px] font-semibold text-[#E5B842] uppercase tracking-wider">
                            Best Value
                          </span>
                        ) : null}
                      </div>

                      <h3 className="text-xs font-bold text-[#F4F4F5] group-hover:text-white">
                        {plan.name}
                      </h3>
                      <p className="text-[10px] text-[#71717A] mt-0.5">
                        Duration: <strong className="text-[#A1A1AA]">{plan.duration_value} {plan.duration_type}</strong>
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#27272A]/70 flex items-baseline justify-between">
                      <span className="text-xs font-bold text-[#E5B842]">
                        {formatLKR(Number(plan.price))}
                      </span>
                      <span className="text-[9px] text-[#71717A]">
                        {plan.duration_value === 1 ? 'one-time' : 'full term'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Dates & Personal Training Add-on */}
          <div className="card-luxury rounded-2xl p-6 bg-[#121214] space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#E5B842] flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              3. Term Dates & Add-ons
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#71717A] mb-1.5">
                  Calculated Expiry Date
                </label>
                <input
                  type="text"
                  disabled
                  value={formatDate(calculatedEndDate)}
                  className="w-full h-10 px-3 bg-[#18181B]/50 border border-[#27272A] rounded-xl text-xs text-[#A1A1AA] cursor-not-allowed"
                />
              </div>
            </div>

            {/* Personal Training Toggle */}
            <div className="pt-3 border-t border-[#27272A]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#E5B842]/10 border border-[#E5B842]/20 flex items-center justify-center text-[#E5B842]">
                    <Dumbbell className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#F4F4F5] block">
                      Personal Trainer (PT) Add-on
                    </span>
                    <span className="text-[11px] text-[#A1A1AA]">
                      Assign dedicated trainer with customizable fee
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPt}
                    onChange={(e) => setHasPt(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#27272A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E5B842]"></div>
                </label>
              </div>

              {hasPt && (
                <div className="mt-4 p-4 rounded-xl bg-[#18181B] border border-[#27272A] grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                      Select Personal Trainer
                    </label>
                    <select
                      value={selectedTrainerId}
                      onChange={(e) => setSelectedTrainerId(e.target.value)}
                      className="w-full h-10 px-3 bg-[#121214] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                    >
                      {trainers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (Default: {formatLKR(Number(t.default_charge))})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                      Personal Training Fee (LKR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={trainerFee}
                      onChange={(e) => setTrainerFee(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-[#121214] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                    />
                    <span className="text-[10px] text-[#71717A] mt-0.5 block">
                      Defaults to trainer rate; editable for promotions.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 4: Discounts */}
          <div className="card-luxury rounded-2xl p-6 bg-[#121214] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#E5B842] flex items-center gap-2">
                <Percent className="w-4 h-4" />
                4. Discount & Adjustments
              </h2>
              {discountType !== 'none' && (
                <span className="text-[10px] text-[#A1A1AA]">
                  {discountType === 'percentage' ? `${discountValue}% off` : `${formatLKR(discountValue)} off`}
                </span>
              )}
            </div>

            {/* Visual Discount Chips */}
            <div>
              <label className="block text-xs font-medium text-[#D4D4D8] mb-2">
                Select Discount Mode
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* No Discount */}
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('none');
                    setDiscountValue(0);
                    setDiscountReason('');
                  }}
                  className={`h-11 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    discountType === 'none'
                      ? 'border-[#E5B842] bg-[#E5B842]/10 text-[#E5B842] shadow-[0_0_12px_rgba(229,184,66,0.15)]'
                      : 'border-[#27272A] bg-[#18181B] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#F4F4F5]'
                  }`}
                >
                  No Discount
                </button>

                {/* Percentage */}
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('percentage');
                    if (discountReason.includes('First 100') || discountValue === 0) {
                      setDiscountValue(10);
                      setDiscountReason('');
                    }
                  }}
                  className={`h-11 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    discountType === 'percentage' && !(discountValue === 30 && discountReason.includes('First 100'))
                      ? 'border-[#E5B842] bg-[#E5B842]/10 text-[#E5B842] shadow-[0_0_12px_rgba(229,184,66,0.15)]'
                      : 'border-[#27272A] bg-[#18181B] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#F4F4F5]'
                  }`}
                >
                  Percentage (%)
                </button>

                {/* Fixed Amount */}
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('fixed');
                    if (discountReason.includes('First 100') || discountValue === 0) {
                      setDiscountValue(1000);
                      setDiscountReason('');
                    }
                  }}
                  className={`h-11 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    discountType === 'fixed'
                      ? 'border-[#E5B842] bg-[#E5B842]/10 text-[#E5B842] shadow-[0_0_12px_rgba(229,184,66,0.15)]'
                      : 'border-[#27272A] bg-[#18181B] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#F4F4F5]'
                  }`}
                >
                  Fixed (LKR)
                </button>

                {/* First 100 30% Promo */}
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('percentage');
                    setDiscountValue(30);
                    setDiscountReason('First 100 Members Promotion (30% off)');
                  }}
                  className={`h-11 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    discountType === 'percentage' && discountValue === 30 && discountReason.includes('First 100')
                      ? 'border-[#E5B842] bg-[#E5B842] text-[#09090B] font-bold shadow-[0_0_16px_rgba(229,184,66,0.3)]'
                      : 'border-[#E5B842]/40 bg-[#E5B842]/5 text-[#E5B842] hover:bg-[#E5B842]/15 hover:border-[#E5B842]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>First 100 (30%)</span>
                </button>
              </div>
            </div>

            {discountType !== 'none' && (
              <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                      {discountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (LKR)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={discountType === 'percentage' ? 100 : subtotal}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-[#121214] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                    />
                    <span className="text-[10px] text-[#71717A] mt-1 block">
                      {discountValue === 30 && discountReason.includes('First 100') ? (
                        <span className="text-[#E5B842] font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Launch Promo: 30% discount applied
                        </span>
                      ) : isAdmin ? (
                        'Admin: Unrestricted discount'
                      ) : discountType === 'percentage' ? (
                        'Staff max: 15%'
                      ) : (
                        'Staff max: LKR 10,000'
                      )}
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                      Discount Reason <span className="text-[#EF4444]">* (Required)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder="e.g. First 100 Members Promotion, Referral reward, Family package..."
                      className="w-full h-10 px-3 bg-[#121214] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Order Summary & Checkout Card */}
        <div className="space-y-6">
          <div className="card-luxury rounded-2xl p-6 bg-[#121214] sticky top-6 border-gold-accent">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#F4F4F5] mb-4 pb-3 border-b border-[#27272A]">
              Order Summary
            </h2>

            {/* Invoice Number Header */}
            <div className="mb-4 p-3 rounded-xl bg-[#18181B] border border-[#27272A]">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#A1A1AA]">Invoice Reference:</span>
                {isAdmin ? (
                  <span className="text-[10px] text-[#E5B842] flex items-center gap-1 font-semibold">
                    <Edit3 className="w-3 h-3" /> Admin Override Enabled
                  </span>
                ) : (
                  <span className="text-[10px] text-[#71717A] flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Auto-Generated
                  </span>
                )}
              </div>

              {isAdmin ? (
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full h-8 px-2.5 bg-[#121214] border border-[#3F3F46] rounded-lg text-xs font-bold text-[#E5B842] tracking-wider uppercase focus:outline-none focus:border-[#E5B842]"
                />
              ) : (
                <span className="text-sm font-bold text-[#F4F4F5] tracking-wider">
                  {invoiceNumber}
                </span>
              )}
            </div>

            {/* Price Line Items */}
            <div className="space-y-2.5 text-xs pb-4 border-b border-[#27272A]">
              <div className="flex justify-between text-[#D4D4D8]">
                <span>Base Plan Price:</span>
                <span>{formatLKR(basePlanPrice)}</span>
              </div>

              {hasPt && (
                <div className="flex justify-between text-[#D4D4D8]">
                  <span>PT Add-on:</span>
                  <span>+ {formatLKR(currentTrainerFee)}</span>
                </div>
              )}

              <div className="flex justify-between text-[#71717A] font-medium pt-1">
                <span>Subtotal:</span>
                <span>{formatLKR(subtotal)}</span>
              </div>

              {calculatedDiscountAmount > 0 && (
                <div className="flex justify-between text-[#EF4444] font-medium">
                  <span>Discount:</span>
                  <span>- {formatLKR(calculatedDiscountAmount)}</span>
                </div>
              )}
            </div>

            {/* Total Due */}
            <div className="py-4 flex justify-between items-baseline border-b border-[#27272A]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F4F4F5]">
                Total Due:
              </span>
              <span className="text-xl font-black text-[#E5B842]">
                {formatLKR(totalDue)}
              </span>
            </div>

            {/* Initial Payment Button / Options */}
            <div className="py-4 space-y-3">
              {!recordInitialPayment ? (
                <button
                  type="button"
                  onClick={() => {
                    setRecordInitialPayment(true);
                    setPaymentAmountEdited(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-[#3F3F46] hover:border-[#E5B842] bg-transparent text-[#D4D4D8] hover:text-[#E5B842] text-xs font-semibold flex items-center justify-center gap-2 transition-all group cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#71717A] group-hover:text-[#E5B842] transition-colors" />
                  <span>Record Initial Payment Now</span>
                </button>
              ) : (
                <div className="space-y-3 p-3.5 rounded-xl bg-[#18181B] border border-[#E5B842]/40 text-xs shadow-inner">
                  <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#E5B842]">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Initial Payment</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRecordInitialPayment(false);
                        setPaymentAmount(0);
                        setPaymentAmountEdited(false);
                      }}
                      className="text-[10px] text-[#A1A1AA] hover:text-[#EF4444] transition-colors flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <X className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#A1A1AA] mb-1">
                      Payment Amount (LKR)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={totalDue}
                      value={effectivePaymentAmount}
                      onChange={(e) => {
                        setPaymentAmountEdited(true);
                        setPaymentAmount(Number(e.target.value));
                      }}
                      className="w-full h-8 px-2.5 bg-[#121214] border border-[#27272A] rounded-lg text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#A1A1AA] mb-1">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['cash', 'card', 'bank'] as PaymentMethod[]).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`py-1.5 text-[10px] font-semibold uppercase rounded-lg border transition-colors cursor-pointer ${
                            paymentMethod === method
                              ? 'bg-[#E5B842] text-[#09090B] border-[#E5B842]'
                              : 'bg-[#121214] text-[#A1A1AA] border-[#27272A] hover:text-[#F4F4F5]'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {registrationRef && (
                    <p className="text-[10px] text-[#71717A] flex items-center gap-1.5 pt-1">
                      <Receipt className="w-3 h-3 shrink-0" />
                      Registered via public form (ref {registrationRef}) - the reference is stored on
                      this payment.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !selectedMemberId || !selectedPlanId}
              className="w-full h-11 rounded-xl bg-gold-gradient text-[#09090B] font-bold text-xs hover:brightness-105 active:brightness-95 transition-all shadow-[0_4px_16px_rgba(229,184,66,0.25)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <span>Generating Order...</span>
              ) : (
                <span>Confirm & Issue Membership</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Select Member Dialog with Search & Name/Mobile Toggle */}
      <SelectMemberModal
        isOpen={isSelectMemberModalOpen}
        onClose={() => setIsSelectMemberModalOpen(false)}
        members={membersList}
        selectedMemberId={selectedMemberId}
        onSelectMember={(m) => setSelectedMemberId(m.id)}
        onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
      />

      {/* Quick Register Member Dialog */}
      <RegisterMemberModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={handleMemberRegistered}
      />
    </form>
  );
}
