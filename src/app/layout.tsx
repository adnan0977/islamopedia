import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from '@/components/ui/toaster';

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
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen flex flex-col overflow-x-hidden">
        <FirebaseClientProvider>
          <Navbar />
          {/* pt-0 on mobile for zero gap as nav is at the bottom, pt-24 on desktop for alignment */}
          <main className="flex-grow pt-0 md:pt-24 pb-20 md:pb-0">
            {children}
          </main>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
