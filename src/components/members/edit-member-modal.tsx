'use client';

import { useState } from 'react';
import { updateMember, type MemberFormData } from '@/app/actions/members';
import type { Member, Gender } from '@/types/database';
import {
  X,
  Pencil,
  User,
  MapPin,
  HeartHandshake,
  Activity,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

interface EditMemberModalProps {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updated: Member) => void;
}

type TabType = 'personal' | 'address' | 'emergency' | 'health';

export function EditMemberModal({
  member,
  isOpen,
  onClose,
  onSuccess,
}: EditMemberModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('personal');

  // Tab 1: Personal & Identity
  const [fullName, setFullName] = useState(member.full_name ?? '');
  const [phone, setPhone] = useState(member.phone ?? '');
  const [email, setEmail] = useState(member.email ?? '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(
    member.gender ?? 'male'
  );
  const [dateOfBirth, setDateOfBirth] = useState(member.date_of_birth ?? '');
  const [nicPassport, setNicPassport] = useState(member.nic_passport ?? '');
  const [civilStatus, setCivilStatus] = useState(member.civil_status ?? '');

  // Tab 2: Address & Work
  const [residence, setResidence] = useState(member.residence ?? '');
  const [city, setCity] = useState(member.city ?? '');
  const [postCode, setPostCode] = useState(member.post_code ?? '');
  const [landPhone, setLandPhone] = useState(member.land_phone ?? '');
  const [profession, setProfession] = useState(member.profession ?? '');
  const [officeAddress, setOfficeAddress] = useState(member.office_address ?? '');

  // Tab 3: Emergency Contact
  const [emergencyName, setEmergencyName] = useState(
    member.emergency_contact_name ?? ''
  );
  const [emergencyRel, setEmergencyRel] = useState(
    member.emergency_contact_relationship ?? ''
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    member.emergency_contact_phone ?? ''
  );
  const [emergencyLandPhone, setEmergencyLandPhone] = useState(
    member.emergency_contact_land_phone ?? ''
  );

  // Tab 4: Health, Physical & Preferences
  const [weightKg, setWeightKg] = useState(
    member.weight_kg != null ? String(member.weight_kg) : ''
  );
  const [heightCm, setHeightCm] = useState(
    member.height_cm != null ? String(member.height_cm) : ''
  );
  const [fatPercentage, setFatPercentage] = useState(
    member.fat_percentage != null ? String(member.fat_percentage) : ''
  );
  const [parqHasCondition, setParqHasCondition] = useState(
    member.parq_has_condition ?? false
  );
  const [parqDetails, setParqDetails] = useState(member.parq_details ?? '');
  const [preferredPlan, setPreferredPlan] = useState(member.preferred_plan ?? '');
  const [reasonsForJoining, setReasonsForJoining] = useState(
    member.reasons_for_joining ?? ''
  );
  const [howDidYouHear, setHowDidYouHear] = useState(member.how_did_you_hear ?? '');
  const [notes, setNotes] = useState(member.notes ?? '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: Partial<MemberFormData> = {
        full_name: fullName,
        phone,
        gender,
        email: email || null,
        date_of_birth: dateOfBirth || null,
        nic_passport: nicPassport || null,
        civil_status: civilStatus || null,
        residence: residence || null,
        city: city || null,
        post_code: postCode || null,
        land_phone: landPhone || null,
        profession: profession || null,
        office_address: officeAddress || null,
        emergency_contact_name: emergencyName || null,
        emergency_contact_relationship: emergencyRel || null,
        emergency_contact_phone: emergencyPhone || null,
        emergency_contact_land_phone: emergencyLandPhone || null,
        parq_has_condition: parqHasCondition,
        parq_details: parqHasCondition && parqDetails ? parqDetails : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        fat_percentage: fatPercentage ? parseFloat(fatPercentage) : null,
        preferred_plan: preferredPlan || null,
        reasons_for_joining: reasonsForJoining || null,
        how_did_you_hear: howDidYouHear || null,
        notes: notes || null,
      };

      const res = await updateMember(member.id, payload);

      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      setLoading(false);
      if (onSuccess && res.member) {
        onSuccess(res.member as Member);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update member.');
      setLoading(false);
    }
  }

  const tabs: { id: TabType; label: string; icon: LucideIcon }[] = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'address', label: 'Address & Work', icon: MapPin },
    { id: 'emergency', label: 'Emergency', icon: HeartHandshake },
    { id: 'health', label: 'Health & Stats', icon: Activity },
  ];

  const inputClass =
    'w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842] transition-colors';
  const selectClass =
    'w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842] transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl my-6 bg-[#121214] border border-[#27272A] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#27272A] flex items-center justify-between shrink-0 bg-[#121214]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E5B842]/10 border border-[#E5B842]/30 flex items-center justify-center text-[#E5B842]">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F4F4F5]">Edit Member Profile</h2>
              <p className="text-xs text-[#A1A1AA]">{member.full_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#18181B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 pb-2 border-b border-[#27272A] shrink-0 bg-[#141416]">
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#18181B] border border-[#27272A] rounded-xl text-xs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#E5B842] text-[#09090B] shadow-sm font-semibold'
                      : 'text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#202024]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-center gap-2 shrink-0">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* TAB 1: Personal & Identity */}
          {activeTab === 'personal' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Full Name <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kasun Perera"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Mobile Phone <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="077 123 4567"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Gender <span className="text-[#EF4444]">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className={selectClass}
                  >
                    <option value="male">Male (Gents)</option>
                    <option value="female">Female (Ladies)</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Civil Status
                  </label>
                  <select
                    value={civilStatus}
                    onChange={(e) => setCivilStatus(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select status...</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    NIC / Passport / Driving License
                  </label>
                  <input
                    type="text"
                    value={nicPassport}
                    onChange={(e) => setNicPassport(e.target.value)}
                    placeholder="e.g. 199512345678"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Email Address (for Invoices)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="member@gmail.com"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Address & Work */}
          {activeTab === 'address' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Residence (Street Address)
                  </label>
                  <input
                    type="text"
                    value={residence}
                    onChange={(e) => setResidence(e.target.value)}
                    placeholder="e.g. 45/2, Balapokuna Road"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Colombo 05 / Nugegoda"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={postCode}
                    onChange={(e) => setPostCode(e.target.value)}
                    placeholder="e.g. 00500"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Landline Phone
                  </label>
                  <input
                    type="tel"
                    value={landPhone}
                    onChange={(e) => setLandPhone(e.target.value)}
                    placeholder="011 234 5678"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Profession / Occupation
                  </label>
                  <input
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="e.g. Software Engineer, Doctor"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Office / Workplace Address
                  </label>
                  <input
                    type="text"
                    value={officeAddress}
                    onChange={(e) => setOfficeAddress(e.target.value)}
                    placeholder="e.g. World Trade Center, Colombo 01"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Emergency Contact */}
          {activeTab === 'emergency' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="e.g. Suneetha Perera"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={emergencyRel}
                    onChange={(e) => setEmergencyRel(e.target.value)}
                    placeholder="e.g. Mother, Father, Spouse"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Emergency Mobile Phone
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="077 987 6543"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Emergency Landline
                  </label>
                  <input
                    type="tel"
                    value={emergencyLandPhone}
                    onChange={(e) => setEmergencyLandPhone(e.target.value)}
                    placeholder="011 234 5678"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Health, Physical & Preferences */}
          {activeTab === 'health' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="e.g. 72.5"
                    className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="e.g. 175"
                    className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Body Fat %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={fatPercentage}
                    onChange={(e) => setFatPercentage(e.target.value)}
                    placeholder="e.g. 18.2"
                    className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842] transition-colors"
                  />
                </div>
              </div>

              {/* PAR-Q Toggle */}
              <div className="p-3.5 rounded-xl bg-[#18181B] border border-[#27272A] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#F4F4F5] block">
                      PAR-Q Medical Screening Condition
                    </span>
                    <span className="text-[11px] text-[#A1A1AA] block">
                      Heart condition, chest pain, dizziness, joint issues, or medications
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={parqHasCondition}
                      onChange={(e) => setParqHasCondition(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#27272A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E5B842]"></div>
                  </label>
                </div>

                {parqHasCondition && (
                  <div className="pt-2 border-t border-[#27272A]">
                    <label className="block text-xs font-medium text-[#E5B842] mb-1">
                      Doctor Recommendation / Medical Details
                    </label>
                    <textarea
                      rows={2}
                      value={parqDetails}
                      onChange={(e) => setParqDetails(e.target.value)}
                      placeholder="Doctor's notes, restrictions, medication details..."
                      className="w-full p-2.5 bg-[#121214] border border-[#E5B842]/40 rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                    />
                  </div>
                )}
              </div>

              {/* Preferred Plan */}
              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  Preferred Membership Plan (from Inquiry)
                </label>
                <select
                  value={preferredPlan}
                  onChange={(e) => setPreferredPlan(e.target.value)}
                  className={selectClass}
                >
                  <option value="">None / Pending Decision</option>
                  <option value="Annual Membership">Annual Membership (1 Year Access)</option>
                  <option value="6-Month Membership">6-Month Membership</option>
                  <option value="Monthly Membership">Monthly Membership</option>
                  <option value="Day Pass">Day Pass (1 Day Access)</option>
                  <option value="Buddy Package">Buddy Package (2 Persons)</option>
                  <option value="Couple Package">Couple Package</option>
                  <option value="Family Package">Family Package</option>
                </select>
              </div>

              {/* Goals & Referral */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Fitness Goals / Reasons for Joining
                  </label>
                  <input
                    type="text"
                    value={reasonsForJoining}
                    onChange={(e) => setReasonsForJoining(e.target.value)}
                    placeholder="e.g. Fitness, Weight Loss, Strength"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    How did you hear about us?
                  </label>
                  <input
                    type="text"
                    value={howDidYouHear}
                    onChange={(e) => setHowDidYouHear(e.target.value)}
                    placeholder="e.g. Leaflet, Friend, Social Media"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  General Staff Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional observations, special agreements..."
                  className="w-full p-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                />
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-[#27272A] flex items-center justify-between gap-3">
            <div>
              {activeTab !== 'personal' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'address') setActiveTab('personal');
                    else if (activeTab === 'emergency') setActiveTab('address');
                    else if (activeTab === 'health') setActiveTab('emergency');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#18181B] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeTab !== 'health' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'personal') setActiveTab('address');
                    else if (activeTab === 'address') setActiveTab('emergency');
                    else if (activeTab === 'emergency') setActiveTab('health');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-xs font-medium text-[#F4F4F5] transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-xs hover:brightness-105 transition-all shadow-[0_2px_10px_rgba(229,184,66,0.2)] disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
