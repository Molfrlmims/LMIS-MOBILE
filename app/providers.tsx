"use client";

import { offlineService } from "@/lib/offiline-service";
import { useEffect } from "react";

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const initialize = async () => {
      const interval = setInterval(() => {
        if (offlineService.getOnlineStatus()) {
          offlineService.syncPendingRequests();
        }
      }, 30000);

      return () => clearInterval(interval);
    };

    initialize();
  }, []);

  return <>{children}</>;
}
