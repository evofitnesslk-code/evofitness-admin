import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { TopLoader } from '@/components/layout/top-loader';
import './globals.css';

export const metadata: Metadata = {
  title: 'EVO Fitness | Membership Management Platform',
  description: 'Internal Gym Management Platform - Balapokuna Road, Colombo 5',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EVO Fitness',
  },
  icons: {
    apple: '/evofitness-logo.webp',
  },
};

export const viewport: Viewport = {
  themeColor: '#09090B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/evofitness-logo.webp" />
      </head>
      <body className="bg-[#09090B] text-[#F4F4F5] antialiased selection:bg-[#E5B842] selection:text-[#09090B] min-h-screen print:bg-white print:text-black print:min-h-0">
        <Suspense fallback={null}>
          <TopLoader />
        </Suspense>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW reg error: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
