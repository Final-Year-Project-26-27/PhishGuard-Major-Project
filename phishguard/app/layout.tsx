"use client";

import './globals.css';
import { ReactNode, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Toaster } from 'sonner';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { Archivo } from 'next/font/google';

const archivo = Archivo({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-archivo' });

const GA_TRACKING_ID = 'G-DCRZEV2SJE';

const trackPageview = (url: string) => {
  const gtag = typeof window !== 'undefined' ? (window as Window & { gtag?: (...args: unknown[]) => void }).gtag : undefined;
  if (gtag) {
    gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      trackPageview(pathname);
    }
  }, [pathname]);

  return (
    <html lang="en" className={`dark scroll-smooth ${archivo.variable}`}>
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_TRACKING_ID}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased min-h-dvh flex flex-col selection:bg-zinc-700 selection:text-zinc-100">
        <Navbar />
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          toastOptions={{
            style: {
              background: '#121215',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#f4f4f5',
            },
          }}
        />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
