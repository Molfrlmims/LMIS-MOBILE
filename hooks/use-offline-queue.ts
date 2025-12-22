 import { offlineService } from "@/lib/offiline-service";
import { useState, useEffect } from "react";

export function useOfflineQueue() {
  const [pendingRequests, setPendingRequests] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const updateQueueStatus = async () => {
      const requests = await offlineService.getPendingRequests();
      setPendingRequests(requests.length);
    };

    updateQueueStatus();

    const syncCallback = () => {
      setLastSync(new Date());
      updateQueueStatus();
    };

    offlineService.onSyncComplete(syncCallback);

    const interval = setInterval(() => {
      if (offlineService.getOnlineStatus()) {
        updateQueueStatus();
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return {
    pendingRequests,
    lastSync,
    isSyncing: offlineService.isSyncing(),
    isOnline: offlineService.getOnlineStatus(),
  };
}
