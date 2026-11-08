'use client';

import { Printer } from 'lucide-react';
import { useEffect } from 'react';

interface PrintButtonProps {
  invoiceNumber?: string;
}

export function PrintButton({ invoiceNumber }: PrintButtonProps) {
  useEffect(() => {
    if (!invoiceNumber) return;

    const handleBeforePrint = () => {
      document.title = invoiceNumber;
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [invoiceNumber]);

  const handlePrint = () => {
    if (invoiceNumber) {
      document.title = invoiceNumber;
    }
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-xs hover:brightness-105 active:brightness-95 transition-all shadow-[0_2px_10px_rgba(229,184,66,0.2)] cursor-pointer"
    >
      <Printer className="w-4 h-4" />
      Print / Save PDF
    </button>
  );
}

