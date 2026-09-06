import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '~/components/auth-provider';
import { SwrProvider } from '~/components/swr-provider';
import { SwRegister } from '~/components/pwa/sw-register';
import { cn } from '~/utils/css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  title: 'Lontu',
  description: 'Track expenses in three taps.',
  applicationName: 'Lontu',
  appleWebApp: {
    capable: true,
    title: 'Lontu',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#0c0a08',
};

const RootLayout = ({ children }: LayoutProps<'/'>) => {
  return (
    <html lang="en" className={cn(dmSans.variable, 'h-full font-sans antialiased')}>
      <body className="flex min-h-full flex-col">
        <SwrProvider>
          <AuthProvider>{children}</AuthProvider>
        </SwrProvider>

        <SwRegister />
      </body>
    </html>
  );
};

export default RootLayout;
