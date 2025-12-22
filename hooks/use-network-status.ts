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

     offlineService.onSyncComplete(() => {
       setIsSyncing(false);
     });

     if (typeof window !== "undefined") {
       window.addEventListener("online", checkStatus);
       window.addEventListener("offline", checkStatus);

       return () => {
         window.removeEventListener("online", checkStatus);
         window.removeEventListener("offline", checkStatus);
       };
     }
   }, []);

   return { isOnline, isSyncing };
 }