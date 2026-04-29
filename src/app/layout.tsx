import type { Metadata } from "next";
import { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/lib/toast";
import { CallProvider } from "@/lib/call-context";
import LayoutShell from "@/components/layout/LayoutShell";
import AiAdvisor from "@/components/AiAdvisor";

export const metadata: Metadata = {
  title: "Uteo · AI Job Matching · Your Dream Job Finds You",
  description:
    "Uteo is an AI powered, feed based recruitment platform. Personalized job discovery, one click apply, real time application tracking.",
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
                <AiAdvisor />
              </CallProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
