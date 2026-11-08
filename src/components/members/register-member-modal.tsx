'use client';

import { useState } from 'react';
import { createMember, type MemberFormData } from '@/app/actions/members';
import type { Member, Gender } from '@/types/database';
import {
  X,
  UserPlus,
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

interface RegisterMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newMember: Member) => void;
}

type TabType = 'personal' | 'address' | 'emergency' | 'health';

export function RegisterMemberModal({
  isOpen,
  onClose,
  onSuccess,
}: RegisterMemberModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('personal');

  // Tab 1: Personal & Identity
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nicPassport, setNicPassport] = useState('');
  const [civilStatus, setCivilStatus] = useState('');

  // Tab 2: Address & Work
  const [residence, setResidence] = useState('');
  const [city, setCity] = useState('');
  const [postCode, setPostCode] = useState('');
  const [landPhone, setLandPhone] = useState('');
  const [profession, setProfession] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');

  // Tab 3: Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRel, setEmergencyRel] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyLandPhone, setEmergencyLandPhone] = useState('');

  // Tab 4: Health, Physical & Preferences
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [fatPercentage, setFatPercentage] = useState('');
  const [parqHasCondition, setParqHasCondition] = useState(false);
  const [parqDetails, setParqDetails] = useState('');
  const [preferredPlan, setPreferredPlan] = useState('');
  const [reasonsForJoining, setReasonsForJoining] = useState('');
  const [howDidYouHear, setHowDidYouHear] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: MemberFormData = {
        full_name: fullName,
        phone,
        gender,
        email: email || undefined,
        date_of_birth: dateOfBirth || undefined,
        nic_passport: nicPassport || undefined,
        civil_status: civilStatus || undefined,
        residence: residence || undefined,
        city: city || undefined,
        post_code: postCode || undefined,
        land_phone: landPhone || undefined,
        profession: profession || undefined,
        office_address: officeAddress || undefined,
        emergency_contact_name: emergencyName || undefined,
        emergency_contact_relationship: emergencyRel || undefined,
        emergency_contact_phone: emergencyPhone || undefined,
        emergency_contact_land_phone: emergencyLandPhone || undefined,
        parq_has_condition: parqHasCondition,
        parq_details: parqHasCondition && parqDetails ? parqDetails : undefined,
        weight_kg: weightKg ? parseFloat(weightKg) : undefined,
        height_cm: heightCm ? parseFloat(heightCm) : undefined,
        fat_percentage: fatPercentage ? parseFloat(fatPercentage) : undefined,
        preferred_plan: preferredPlan || undefined,
        reasons_for_joining: reasonsForJoining || undefined,
        how_did_you_hear: howDidYouHear || undefined,
        notes: notes || undefined,
      };

      const res = await createMember(payload);

      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      setLoading(false);
      if (onSuccess) {
        onSuccess(res.member);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register member.');
      setLoading(false);
    }
  }

  const tabs: { id: TabType; label: string; icon: LucideIcon }[] = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'address', label: 'Address & Work', icon: MapPin },
    { id: 'emergency', label: 'Emergency', icon: HeartHandshake },
    { id: 'health', label: 'Health & Stats', icon: Activity },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl my-6 bg-[#121214] border border-[#27272A] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#27272A] flex items-center justify-between shrink-0 bg-[#121214]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E5B842]/10 border border-[#E5B842]/30 flex items-center justify-center text-[#E5B842]">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F4F4F5]">
                Register New Member
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Complete member registration matching Google Form records
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#18181B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Apple HIG Segmented Navigation Tabs */}
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
                {/* Full Name */}
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
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>

                {/* Mobile Phone */}
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
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Gender <span className="text-[#EF4444]">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                  >
                    <option value="male">Male (Gents)</option>
                    <option value="female">Female (Ladies)</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>

                {/* Civil Status */}
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Civil Status
                  </label>
                  <select
                    value={civilStatus}
                    onChange={(e) => setCivilStatus(e.target.value)}
                    className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                  >
                    <option value="">Select status...</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* NIC / Passport */}
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    NIC / Passport / Driving License
                  </label>
                  <input
                    type="text"
                    value={nicPassport}
                    onChange={(e) => setNicPassport(e.target.value)}
                    placeholder="e.g. 199512345678"
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Email Address (for Invoices)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="member@gmail.com"
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Address & Work */}
          {activeTab === 'address' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Residence */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Residence (Street Address)
                  </label>
                  <input
                    type="text"
                    value={residence}
                    onChange={(e) => setResidence(e.target.value)}
                    placeholder="e.g. 45/2, Balapokuna Road"
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Colombo 05 / Nugegoda"
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>

                {/* Postal Code */}
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={postCode}
                    onChange={(e) => setPostCode(e.target.value)}
                    placeholder="e.g. 00500"
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>

                {/* Land Phone */}
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Landline Phone
                  </label>
                  <input
                    type="tel"
                    value={landPhone}
                    onChange={(e) => setLandPhone(e.target.value)}
                    placeholder="011 234 5678"
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>

                {/* Profession */}
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Profession / Occupation
                  </label>
                  <input
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="e.g. Software Engineer, Doctor, Banking"
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>

                {/* Office Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Office / Workplace Address
                  </label>
                  <input
                    type="text"
                    value={officeAddress}
                    onChange={(e) => setOfficeAddress(e.target.value)}
                    placeholder="e.g. World Trade Center, Colombo 01"
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Emergency Contact */}
          {activeTab === 'emergency' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Emergency Contact Name */}
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="e.g. Suneetha Perera"
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>

                {/* Relationship */}
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={emergencyRel}
                    onChange={(e) => setEmergencyRel(e.target.value)}
                    placeholder="e.g. Mother, Father, Spouse, Sister"
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>

                {/* Emergency Mobile */}
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Emergency Mobile Phone
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="077 987 6543"
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>

                {/* Emergency Landline */}
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Emergency Landline
                  </label>
                  <input
                    type="tel"
                    value={emergencyLandPhone}
                    onChange={(e) => setEmergencyLandPhone(e.target.value)}
                    placeholder="011 234 5678"
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Health, Physical & Preferences */}
          {activeTab === 'health' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Body Measurements */}
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
                    className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
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
                    className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
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
                    className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>
              </div>

              {/* PAR-Q Health Screening Toggle */}
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

              {/* Preferred Plan Selection */}
              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  Preferred Membership Plan (from Inquiry)
                </label>
                <select
                  value={preferredPlan}
                  onChange={(e) => setPreferredPlan(e.target.value)}
                  className="w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] focus:outline-none focus:border-[#E5B842]"
                >
                  <option value="">None / Pending Decision</option>
                  <option value="Annual Membership">Annual Membership (1 Year Access)</option>
                  <option value="6-Month Membership">6-Month Membership (6 Months Access)</option>
                  <option value="Monthly Membership">Monthly Membership (1 Month Access)</option>
                  <option value="Day Pass">Day Pass (1 Day Access)</option>
                  <option value="Buddy Package">Buddy Package (2 Persons)</option>
                  <option value="Couple Package">Couple Package</option>
                  <option value="Family Package">Family Package</option>
                </select>
              </div>

              {/* Goals & Marketing Referral */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                    Fitness Goals / Reasons for Joining
                  </label>
                  <input
                    type="text"
                    value={reasonsForJoining}
                    onChange={(e) => setReasonsForJoining(e.target.value)}
                    placeholder="e.g. Fitness, Weight Loss, Strength & Size"
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
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
                    placeholder="e.g. Leaflet, Friend, Social Media, Website"
                    className="w-full h-10 px-3.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                  />
                </div>
              </div>

              {/* Additional Remarks */}
              <div>
                <label className="block text-xs font-medium text-[#D4D4D8] mb-1">
                  General Staff Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional observations, special agreements, locker assignments..."
                  className="w-full p-2.5 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]"
                />
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
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
                <span>{loading ? 'Registering...' : 'Save & Register Member'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
