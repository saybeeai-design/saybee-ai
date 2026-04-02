import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import * as Sentry from '@sentry/nextjs';
import { Toaster } from 'react-hot-toast';
import './globals.css';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: 1.0,
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'SayBee AI - AI Interview Platform',
  description: 'Practice job interviews with an AI-powered interviewer. Get real-time feedback and improve your skills.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-[#0B0F19] font-sans antialiased text-white">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#111827',
              color: '#FFFFFF',
              border: '1px solid #1F2937',
              borderRadius: '14px',
              fontFamily: 'Inter, sans-serif',
            },
            success: { iconTheme: { primary: '#34D399', secondary: '#111827' } },
            error: { iconTheme: { primary: '#F87171', secondary: '#111827' } },
          }}
        />
      </body>
    </html>
  );
}
