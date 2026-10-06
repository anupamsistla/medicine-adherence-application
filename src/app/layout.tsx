import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { auth } from "@/auth";
import { AssistantWidget } from "@/components/assistant-widget";
import { TimeZoneSync } from "@/components/timezone-sync";
import { getUserTimeZone } from "@/lib/user-timezone";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MedTrack: Never miss a dose",
  description:
    "Track your medications, get reminded before every dose, and catch low stock and expiring prescriptions before they become a problem.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const storedTimeZone = session?.user?.id ? await getUserTimeZone(session.user.id) : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {session?.user && <TimeZoneSync storedTimeZone={storedTimeZone!} />}
        {session?.user && <AssistantWidget />}
      </body>
    </html>
  );
}
