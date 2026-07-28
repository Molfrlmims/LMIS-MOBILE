import { offlineService } from "@/lib/offiline-service";
import { useState, useEffect } from "react";

export function useOfflineQueue() {
  const [pendingRequests, setPendingRequests] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(offlineService.isSyncing());
  const [isOnline, setIsOnline] = useState(offlineService.getOnlineStatus());

  useEffect(() => {
    const updateQueueStatus = async () => {
      const requests = await offlineService.getPendingRequests();
      setPendingRequests(requests.length);
    };

    updateQueueStatus();

    const unsubscribeQueue = offlineService.onQueueChange(setPendingRequests);
    const unsubscribeSyncStatus =
      offlineService.onSyncStatusChange(setIsSyncing);
    const unsubscribeNetworkStatus =
      offlineService.onNetworkStatusChange(setIsOnline);
    const unsubscribeSyncComplete = offlineService.onSyncComplete(() => {
      setLastSync(new Date());
      void updateQueueStatus();
    });

    return () => {
      unsubscribeQueue();
      unsubscribeSyncStatus();
      unsubscribeNetworkStatus();
      unsubscribeSyncComplete();
    };
  }, []);

  return {
    pendingRequests,
    lastSync,
    isSyncing,
    isOnline,
  };
}
