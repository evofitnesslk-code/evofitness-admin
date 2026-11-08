'use client';

import { useState } from 'react';
import { Mail, Check, AlertCircle, Loader2 } from 'lucide-react';
import { sendMembershipInvoiceEmail } from '@/app/actions/memberships';

interface EmailButtonProps {
  membershipId: string;
  memberEmail?: string | null;
}

export function EmailButton({ membershipId, memberEmail }: EmailButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const handleSendEmail = async () => {
    if (!memberEmail) {
      setStatus('error');
      setMessage('No member email on file');
      return;
    }

    try {
      setStatus('loading');
      setMessage('');
      const res = await sendMembershipInvoiceEmail(membershipId);

      if (res.error) {
        setStatus('error');
        setMessage(res.error);
      } else {
        setStatus('success');
        setMessage(`Sent to ${res.email}`);
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
        }, 4000);
      }
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error && err.message ? err.message : 'Failed to dispatch email');
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleSendEmail}
        disabled={status === 'loading'}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
          status === 'success'
            ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
            : status === 'error'
            ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
            : 'bg-[#18181B] hover:bg-[#27272A] border-[#27272A] text-[#F4F4F5]'
        }`}
        title={memberEmail ? `Resend receipt to ${memberEmail}` : 'No email address registered for member'}
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-[#E5B842]" />
            <span>Sending...</span>
          </>
        ) : status === 'success' ? (
          <>
            <Check className="w-4 h-4 text-[#10B981]" />
            <span>Receipt Sent!</span>
          </>
        ) : status === 'error' ? (
          <>
            <AlertCircle className="w-4 h-4 text-[#EF4444]" />
            <span>Email Failed</span>
          </>
        ) : (
          <>
            <Mail className="w-4 h-4 text-[#E5B842]" />
            <span>Resend Receipt</span>
          </>
        )}
      </button>

      {message && (
        <div
          className={`absolute left-0 -bottom-8 whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] font-medium z-30 shadow-lg ${
            status === 'success'
              ? 'bg-[#10B981] text-black font-semibold'
              : 'bg-[#EF4444] text-white'
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
