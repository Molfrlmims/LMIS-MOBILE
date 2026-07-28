import { offlineService } from "@/lib/offiline-service";
import { useState, useEffect } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(offlineService.getOnlineStatus());
  const [isSyncing, setIsSyncing] = useState(offlineService.isSyncing());

  useEffect(() => {
    const checkStatus = () => {
      setIsOnline(offlineService.getOnlineStatus());
      setIsSyncing(offlineService.isSyncing());
    };

    checkStatus();

    const unsubscribeNetwork =
      offlineService.onNetworkStatusChange(setIsOnline);
    const unsubscribeSync = offlineService.onSyncStatusChange(setIsSyncing);

    if (typeof window !== "undefined") {
      window.addEventListener("online", checkStatus);
      window.addEventListener("offline", checkStatus);
    }

    return () => {
      unsubscribeNetwork();
      unsubscribeSync();
      if (typeof window !== "undefined") {
        window.removeEventListener("online", checkStatus);
        window.removeEventListener("offline", checkStatus);
      }
    };
  }, []);

  return { isOnline, isSyncing };
}
