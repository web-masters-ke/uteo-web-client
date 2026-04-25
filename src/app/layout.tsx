import type { Metadata } from "next";
import { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/lib/toast";
import { CallProvider } from "@/lib/call-context";
import LayoutShell from "@/components/layout/LayoutShell";

export const metadata: Metadata = {
  title: "SkillSasa — Connecting Professionals with Expert Trainers.",
  description:
    "Kenya's AI-powered trainer marketplace — find, book, and learn from certified professional and vocational trainers.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  manifest: "/manifest.json",
  themeColor: "#192C67",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <CallProvider>
                <LayoutShell>{children}</LayoutShell>
              </CallProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
