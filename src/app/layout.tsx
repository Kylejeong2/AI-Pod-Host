import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ConnectionProvider } from "@/hooks/use-connection";
import { Toaster } from "@/components/ui/toaster";
import { TranscriptProvider } from '@/hooks/TranscriptContext';

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
  title: "Talk to Overlap",
  description: "Talk to Overlap",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TranscriptProvider>
          <ConnectionProvider>
              {children}
              <Toaster />
          </ConnectionProvider>
        </TranscriptProvider>
      </body>
    </html>
  );
}
