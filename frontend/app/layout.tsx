import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/lib/auth/context";
import { Toaster } from "@/components/ui/sonner";
import { RoomAccessProvider } from "@/lib/room-access/context";

const roboto = Roboto({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Exam Arena",
  description: "Exam Arena",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", roboto.variable)}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <RoomAccessProvider>
            {children}
            <Toaster richColors position="top-right" />
          </RoomAccessProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
