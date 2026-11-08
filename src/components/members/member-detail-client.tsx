'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Member, Membership, Payment } from '@/types/database';
import { EditMemberModal } from './edit-member-modal';
import { formatDate, formatLKR } from '@/lib/utils';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  HeartHandshake,
  Activity,
  Receipt,
  PlusCircle,
  ChevronRight,
  Pencil,
  Shield,
  Scale,
  Ruler,
  BadgePercent,
  Briefcase,
  Building2,
  CalendarDays,
  Heart,
  Target,
  Megaphone,
  StickyNote,
  ShieldAlert,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

type MemberMembership = Membership & {
  plan?: { name?: string | null } | null;
  payments?: Payment[];
};

type MemberWithMemberships = Member & {
  memberships?: MemberMembership[];
};

interface MemberDetailClientProps {
  member: MemberWithMemberships;
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | number | null;
  icon?: LucideIcon;
}) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-[#71717A] mt-0.5 shrink-0" />}
      <div>
        <span className="text-[10px] text-[#71717A] block uppercase tracking-wide">{label}</span>
        <span className="text-xs text-[#F4F4F5] font-medium">{value}</span>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="card-luxury rounded-2xl p-5 bg-[#121214] space-y-4">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#E5B842] flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function MemberDetailClient({ member: initialMember }: MemberDetailClientProps) {
  const [member, setMember] = useState<MemberWithMemberships>(initialMember);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const activeMembership = member.memberships?.find((m) => m.status === 'active');

  // Derive BMI if we have weight and height
  const bmi =
    member.weight_kg && member.height_cm
      ? (member.weight_kg / Math.pow(member.height_cm / 100, 2)).toFixed(1)
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#27272A]">
        <div className="flex items-center gap-3">
          <Link
            href="/members"
            className="p-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#27272A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* Avatar */}
          <div className="w-12 h-12 rounded-2xl bg-[#E5B842]/10 border border-[#E5B842]/30 flex items-center justify-center font-bold text-lg text-[#E5B842] shrink-0">
            {member.full_name.charAt(0).toUpperCase()}
          </div>

          <div>
            <h1 className="text-xl font-bold text-[#F4F4F5]">{member.full_name}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-[11px] text-[#A1A1AA]">
                Joined {formatDate(member.created_at)}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-[#18181B] border border-[#27272A] text-[#A1A1AA]">
                {member.gender}
              </span>
              {activeMembership && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981]">
                  Active Member
                </span>
              )}
              {member.parq_has_condition && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] flex items-center gap-1">
                  <ShieldAlert className="w-2.5 h-2.5" />
                  PAR-Q
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#F4F4F5] font-medium text-xs transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
          <Link
            href={`/memberships/new?member_id=${member.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-xs hover:brightness-105 transition-all shadow-[0_2px_12px_rgba(229,184,66,0.2)] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Order</span>
          </Link>
        </div>
      </div>

      {/* Body Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Profile Details */}
        <div className="space-y-5">
          {/* Contact */}
          <SectionCard title="Contact Information" icon={Phone}>
            <InfoRow label="Mobile Phone" value={member.phone} icon={Phone} />
            <InfoRow label="Email Address" value={member.email} icon={Mail} />
            <InfoRow label="Landline" value={member.land_phone} icon={Phone} />
            <InfoRow label="NIC / Passport" value={member.nic_passport} icon={Shield} />
            <InfoRow label="Date of Birth" value={member.date_of_birth ? formatDate(member.date_of_birth) : null} icon={CalendarDays} />
            <InfoRow label="Civil Status" value={member.civil_status} icon={Heart} />
          </SectionCard>

          {/* Address & Work */}
          {(member.residence || member.city || member.profession || member.office_address) && (
            <SectionCard title="Address & Work" icon={MapPin}>
              {member.residence && (
                <InfoRow label="Residence" value={`${member.residence}${member.city ? `, ${member.city}` : ''}${member.post_code ? ` ${member.post_code}` : ''}`} icon={MapPin} />
              )}
              {!member.residence && member.city && (
                <InfoRow label="City" value={`${member.city}${member.post_code ? ` ${member.post_code}` : ''}`} icon={MapPin} />
              )}
              <InfoRow label="Profession" value={member.profession} icon={Briefcase} />
              <InfoRow label="Workplace" value={member.office_address} icon={Building2} />
            </SectionCard>
          )}

          {/* Emergency Contact */}
          {(member.emergency_contact_name || member.emergency_contact_phone) && (
            <SectionCard title="Emergency Contact" icon={HeartHandshake}>
              <InfoRow label="Name" value={member.emergency_contact_name} icon={User} />
              <InfoRow
                label="Relationship"
                value={member.emergency_contact_relationship}
                icon={HeartHandshake}
              />
              <InfoRow label="Mobile" value={member.emergency_contact_phone} icon={Phone} />
              <InfoRow label="Landline" value={member.emergency_contact_land_phone} icon={Phone} />
            </SectionCard>
          )}

          {/* Health & Stats */}
          {(member.weight_kg || member.height_cm || member.parq_has_condition || member.reasons_for_joining || member.how_did_you_hear) && (
            <SectionCard title="Health & Stats" icon={Activity}>
              {(member.weight_kg || member.height_cm || member.fat_percentage) && (
                <div className="grid grid-cols-3 gap-2">
                  {member.weight_kg && (
                    <div className="p-2 rounded-xl bg-[#18181B] border border-[#27272A] text-center">
                      <Scale className="w-3 h-3 text-[#E5B842] mx-auto mb-1" />
                      <span className="text-xs font-bold text-[#F4F4F5] block">{member.weight_kg}</span>
                      <span className="text-[10px] text-[#71717A]">kg</span>
                    </div>
                  )}
                  {member.height_cm && (
                    <div className="p-2 rounded-xl bg-[#18181B] border border-[#27272A] text-center">
                      <Ruler className="w-3 h-3 text-[#E5B842] mx-auto mb-1" />
                      <span className="text-xs font-bold text-[#F4F4F5] block">{member.height_cm}</span>
                      <span className="text-[10px] text-[#71717A]">cm</span>
                    </div>
                  )}
                  {member.fat_percentage ? (
                    <div className="p-2 rounded-xl bg-[#18181B] border border-[#27272A] text-center">
                      <BadgePercent className="w-3 h-3 text-[#E5B842] mx-auto mb-1" />
                      <span className="text-xs font-bold text-[#F4F4F5] block">{member.fat_percentage}%</span>
                      <span className="text-[10px] text-[#71717A]">fat</span>
                    </div>
                  ) : bmi ? (
                    <div className="p-2 rounded-xl bg-[#18181B] border border-[#27272A] text-center">
                      <Activity className="w-3 h-3 text-[#E5B842] mx-auto mb-1" />
                      <span className="text-xs font-bold text-[#F4F4F5] block">{bmi}</span>
                      <span className="text-[10px] text-[#71717A]">BMI</span>
                    </div>
                  ) : null}
                </div>
              )}

              {member.parq_has_condition && (
                <div className="p-2.5 rounded-xl bg-[#EF4444]/5 border border-[#EF4444]/20 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-semibold text-[#EF4444] block">PAR-Q Medical Condition</span>
                    {member.parq_details && (
                      <p className="text-[11px] text-[#D4D4D8] mt-0.5">{member.parq_details}</p>
                    )}
                  </div>
                </div>
              )}

              <InfoRow label="Fitness Goals" value={member.reasons_for_joining} icon={Target} />
              <InfoRow label="How They Found Us" value={member.how_did_you_hear} icon={Megaphone} />
              <InfoRow label="Preferred Plan (Inquiry)" value={member.preferred_plan} icon={Receipt} />
            </SectionCard>
          )}

          {/* Notes */}
          {member.notes && (
            <SectionCard title="Staff Notes" icon={StickyNote}>
              <p className="text-xs text-[#D4D4D8] leading-relaxed">{member.notes}</p>
            </SectionCard>
          )}
        </div>

        {/* Right Column: Membership History */}
        <div className="lg:col-span-2 card-luxury rounded-2xl p-6 bg-[#121214]">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#E5B842] flex items-center gap-2 mb-5">
            <Receipt className="w-3.5 h-3.5" />
            Membership History ({member.memberships?.length || 0})
          </h2>

          {!member.memberships || member.memberships.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#18181B]/50 border border-[#27272A]">
              <p className="text-xs text-[#A1A1AA]">
                This member does not have any memberships yet.
              </p>
              <Link
                href={`/memberships/new?member_id=${member.id}`}
                className="mt-3 inline-block text-xs font-semibold text-[#E5B842] hover:underline"
              >
                + Create first membership
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {member.memberships.map((m) => {
                const paid = (m.payments ?? []).reduce(
                  (s: number, p: Payment) => s + Number(p.amount),
                  0
                );
                const balance = Math.max(0, Number(m.total_due) - paid);

                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#E5B842]/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#F4F4F5] font-mono">
                          {m.invoice_number}
                        </span>
                        <span className="text-xs text-[#E5B842] font-semibold truncate">
                          {m.plan?.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            m.status === 'active'
                              ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30'
                              : m.status === 'cancelled'
                              ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30'
                              : 'bg-[#71717A]/10 text-[#A1A1AA] border border-[#71717A]/30'
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A1A1AA] mt-1">
                        {formatDate(m.start_date)} → {formatDate(m.end_date)}
                        {m.trainer && (
                          <span className="text-[#E5B842] ml-2">
                            • PT: {m.trainer.name}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#27272A]">
                      <div className="text-left sm:text-right">
                        <p className="text-xs font-bold text-[#F4F4F5]">
                          {formatLKR(Number(m.total_due))}
                        </p>
                        {balance > 0 ? (
                          <p className="text-[10px] text-[#F59E0B] font-semibold">
                            Balance: {formatLKR(balance)}
                          </p>
                        ) : (
                          <p className="text-[10px] text-[#10B981] font-semibold">Paid in Full</p>
                        )}
                      </div>

                      <Link
                        href={`/memberships/${m.id}`}
                        className="p-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#F4F4F5] transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <EditMemberModal
        member={member}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={(updated) => {
          setMember({ ...member, ...updated });
        }}
      />
    </div>
  );
}
