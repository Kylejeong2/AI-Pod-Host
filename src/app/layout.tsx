import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ConnectionProvider } from "@/hooks/use-connection";
import { Toaster } from "@/components/ui/toaster";
import { SummaryProvider } from "@/hooks/uses-summary";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "AI Podcast Co-Host",
  description: "AI Podcast Co-Host",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SummaryProvider>
          <ConnectionProvider>
            {children}
            <Toaster />
          </ConnectionProvider>
        </SummaryProvider>
      </body>
    </html>
  );
}
