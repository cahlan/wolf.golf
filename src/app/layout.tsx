import type { Metadata, Viewport } from 'next';
import { Outfit, DM_Mono } from 'next/font/google';
import { GameProvider } from '@/providers/game-provider';
import './globals.css';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Wolf Tracker',
  description: 'Wolf golf game tracker — scoring, skins, settlements',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0B0F14',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${dmMono.variable}`}>
        <GameProvider>
          <div className="min-h-dvh max-w-[480px] mx-auto relative">
            {children}
          </div>
        </GameProvider>
      </body>
    </html>
  );
}
