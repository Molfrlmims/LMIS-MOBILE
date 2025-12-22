"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import type React from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor, PluginListenerHandle } from "@capacitor/core";
import { defineCustomElements } from "@ionic/pwa-elements/loader";
import { OfflineProvider } from "./providers";
import { NetworkStatusIndicator } from "@/components/network-status-indicator";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined") {
      defineCustomElements(window);
    }

    if (Capacitor.getPlatform() === "android") {
      let backHandler: PluginListenerHandle | null = null;

      const setupBackHandler = async () => {
        backHandler = await CapacitorApp.addListener("backButton", () => {
          if (pathname === "/") {
            CapacitorApp.exitApp();
          } else {
            router.back();
          }
        });
      };

      setupBackHandler();

      return () => {
        if (backHandler) {
          backHandler.remove();
        }
      };
    }
  }, [router, pathname]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <OfflineProvider>
            <div className="min-h-screen bg-gradient-to-br from-somali-blue/5 via-background to-somali-green/5 dark:from-somali-dark-blue/10 dark:via-somali-dark-background dark:to-somali-dark-green/10">
              <NetworkStatusIndicator />
              {children}
            </div>
            <Toaster />
          </OfflineProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
