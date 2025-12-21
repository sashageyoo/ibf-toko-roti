import type React from "react";
import type { Metadata } from "next";
import { Merriweather, Chivo } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ConvexClientProvider } from "@/components/convex-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-merriweather",
});

const chivo = Chivo({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-chivo",
});

export const metadata: Metadata = {
  title: "IBF Bakery - Sistem Manufaktur",
  description: "Manajemen Manufaktur & Inventaris untuk IBF Bakery",
  icons: {
    icon: "/ibf-box-white-logo.png",
    apple: "/ibf-box-white-logo.png",
  },
};

import { NuqsAdapter } from "nuqs/adapters/next/app";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${merriweather.variable} ${chivo.variable} font-sans antialiased`}>
        <ConvexClientProvider>
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster />
        </ConvexClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
