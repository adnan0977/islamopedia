import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';
import { ThemeApplier } from '@/components/ThemeApplier';

export const metadata: Metadata = {
  title: 'VlogNest - Professional Video Management & Reflection',
  description: 'Manage your YouTube channel and stay connected with spiritual content.',
};

export const viewport: Viewport = {
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col overflow-x-hidden">
        <FirebaseClientProvider>
          <ThemeApplier />
          <Navbar />
          <main className="flex-grow">
            {children}
          </main>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}