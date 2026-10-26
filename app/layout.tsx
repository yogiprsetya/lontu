import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-sans" });
const baloo = Baloo_2({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display" });

export const metadata: Metadata = {
  title: { default: "Lontu", template: "%s · Lontu" },
  description: "Catat income, expense, saving, dan transfer, lengkap dengan budget bulanan.",
  applicationName: "Lontu",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8efe0" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1914" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the theme class on <html> before hydration.
    <html lang="id" className={cn("h-full", "antialiased", "font-sans", nunito.variable, baloo.variable)} suppressHydrationWarning>
      <body className="min-h-full flex flex-col tabular-nums">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
