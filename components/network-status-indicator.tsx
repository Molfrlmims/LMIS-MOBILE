 // Alternative: Minimal version without numbers
"use client";

import { useNetworkStatus } from "@/hooks/use-network-status";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "./ui/use-toast";
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw } from "lucide-react";

export function NetworkStatusIndicator() {
  const { isOnline, isSyncing } = useNetworkStatus();
  const { pendingRequests } = useOfflineQueue();
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      toast({
        title: "You are offline. Changes will be saved locally",
      });
    } else {
      if (pendingRequests > 0) {
        toast({
          title: "Back online! Syncing your data...",
        });
      }
    }
  }, [isOnline, pendingRequests]);

  // Badge animation for pending requests
  useEffect(() => {
    if (pendingRequests > 0) {
      setShowBadge(true);
      const interval = setInterval(() => {
        setShowBadge(prev => !prev);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setShowBadge(false);
    }
  }, [pendingRequests]);

  return (
    <AnimatePresence>
      {(isSyncing || !isOnline || (isOnline && pendingRequests > 0)) && (
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          className="fixed top-4 right-4 z-50"
        >
          <div className="relative group">
            {/* Icon container */}
            <div className="p-2 rounded-full shadow-lg backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700">
              {/* Offline */}
              {!isOnline && !isSyncing && (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}

              {/* Syncing */}
              {isSyncing && (
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
              )}

              {/* Online with pending requests */}
              {isOnline && pendingRequests > 0 && !isSyncing && (
                <div className="relative">
                  <Wifi className="w-5 h-5 text-yellow-500" />
                  {showBadge && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              )}
            </div>

            {/* Minimal tooltip */}
            <div className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {!isOnline && "Offline"}
              {isSyncing && "Syncing..."}
              {isOnline && pendingRequests > 0 && !isSyncing && "Pending sync"}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}