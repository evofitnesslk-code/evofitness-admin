'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const input =
  'min-h-11 rounded-xl border border-[#27272A] bg-[#09090B] px-3 text-sm text-[#F4F4F5] [color-scheme:dark]';

/** From/To date filter that writes `?from=&to=` to the current path. */
export function DateRangeFilter({
  basePath,
  from,
  to,
}: {
  basePath: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const invalid = Boolean(f && t && f > t);

  function apply(nextFrom: string, nextTo: string) {
    const q = new URLSearchParams();
    if (nextFrom) q.set('from', nextFrom);
    if (nextTo) q.set('to', nextTo);
    router.push(`${basePath}${q.size ? `?${q}` : ''}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-[11px] text-[#A1A1AA]">
        From
        <input type="date" value={f} onChange={(e) => setF(e.target.value)} className={`${input} mt-1 block`} />
      </label>
      <label className="text-[11px] text-[#A1A1AA]">
        To
        <input type="date" value={t} onChange={(e) => setT(e.target.value)} className={`${input} mt-1 block`} />
      </label>
      <button
        type="button"
        disabled={invalid}
        onClick={() => apply(f, t)}
        className="min-h-11 rounded-xl bg-[#E5B842] px-4 text-sm font-semibold text-[#09090B] hover:bg-[#F5D061] disabled:opacity-50"
      >
        Apply
      </button>
      {(from || to) && (
        <button
          type="button"
          onClick={() => {
            setF('');
            setT('');
            apply('', '');
          }}
          className="min-h-11 rounded-xl border border-[#27272A] px-4 text-sm text-[#D4D4D8] hover:border-[#3F3F46]"
        >
          Clear
        </button>
      )}
      {invalid && <p className="w-full text-[11px] text-[#EF4444]">“From” must be on or before “To”.</p>}
    </div>
  );
}
