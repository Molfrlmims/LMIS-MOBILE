"use client";

import { offlineService } from "@/lib/offiline-service";
import { useEffect } from "react";

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const interval = setInterval(() => {
      if (offlineService.getOnlineStatus()) {
        void offlineService.syncPendingRequests();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return <>{children}</>;
}
