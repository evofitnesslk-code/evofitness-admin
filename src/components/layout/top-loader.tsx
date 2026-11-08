'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Reset loader when route or search params finish changing.
    // Scheduled (not synchronous) so the effect never triggers a cascading render.
    const settle = setTimeout(() => setProgress(100), 0);
    const timeout = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 250);

    return () => {
      clearTimeout(settle);
      clearTimeout(timeout);
    };
  }, [pathname, searchParams]);

  // Intercept link clicks to trigger the progress bar instantly
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('a');
      if (
        target &&
        target.href &&
        target.href.startsWith(window.location.origin) &&
        !target.target &&
        !target.hasAttribute('download')
      ) {
        const url = new URL(target.href);
        if (url.pathname !== window.location.pathname || url.search !== window.location.search) {
          setLoading(true);
          setProgress(20);
          setTimeout(() => setProgress(50), 100);
          setTimeout(() => setProgress(80), 300);
        }
      }
    }

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[2.5px] z-[9999] pointer-events-none print:hidden overflow-hidden"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <div
        className="h-full bg-gradient-to-r from-[#FDE047] via-[#E5B842] to-[#C69214] transition-all duration-300 ease-out shadow-[0_0_12px_#E5B842,0_0_4px_#FDE047]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition: progress === 100 ? 'width 0.15s ease-out, opacity 0.25s ease-out' : 'width 0.3s ease-out',
        }}
      />
    </div>
  );
}
