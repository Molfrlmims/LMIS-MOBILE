
"use client";

import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

// Types
interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

interface GeolocationHookReturn {
  // State
  location: LocationCoords | null;
  error: string | null;
  isLoading: boolean;
  permissionStatus: "granted" | "denied" | "prompt" | "unsupported" | "unknown";

  // Actions
  requestLocation: () => Promise<void>;
  clearLocation: () => void;

  // Helper states
  isLocationEnabled: boolean;
  isPermissionDenied: boolean;
  canRequestPermission: boolean;

  // User guidance
  guidanceMessage: string;
  actionSteps: string[];
  showSettingsButton: boolean;
  openDeviceSettings: () => void;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  autoRequest?: boolean;
  watchPosition?: boolean;
}

// Platform-aware geolocation service
const getGeolocationService = () => {
  if (Capacitor.isNativePlatform()) {
    return import("@capacitor/geolocation");
  }
  return Promise.resolve({ Geolocation: null });
};

export default function useGeolocation(
  options: UseGeolocationOptions = {}
): GeolocationHookReturn {
  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 0,
    autoRequest = true,
    watchPosition = false,
  } = options;

  // State
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<
    "granted" | "denied" | "prompt" | "unsupported" | "unknown"
  >("unknown");

  // Derived states for user guidance
  const isLocationEnabled = permissionStatus === "granted" && !error;
  const isPermissionDenied = permissionStatus === "denied";
  const canRequestPermission =
    permissionStatus === "prompt" || permissionStatus === "unknown";

  // User guidance messages and actions
  const getGuidanceMessage = (): {
    message: string;
    steps: string[];
    showSettings: boolean;
  } => {
    if (isLoading) {
      return {
        message: "Getting your location...",
        steps: ["Please wait while we access your location"],
        showSettings: false,
      };
    }

    if (error) {
      return {
        message: "Unable to get location",
        steps: ["Try again or check your device settings"],
        showSettings: true,
      };
    }

    if (isPermissionDenied) {
      return {
        message: "Location permission denied",
        steps: [
          "1. Open your device Settings",
          "2. Go to Apps or Application Manager",
          "3. Find this app",
          "4. Tap Permissions",
          "5. Enable Location permission",
        ],
        showSettings: true,
      };
    }

    if (permissionStatus === "prompt") {
      return {
        message: "Location permission required",
        steps: [
          "We need your location to provide better services",
          "Click 'Get Location' to allow access",
          "Or enable it in your device settings",
        ],
        showSettings: false,
      };
    }

    if (permissionStatus === "unsupported") {
      return {
        message: "Location not supported",
        steps: [
          "Your device doesn't support location services",
          "Try using a different device or browser",
        ],
        showSettings: false,
      };
    }

    if (location) {
      return {
        message: "Location access granted",
        steps: ["Your location is being used to enhance your experience"],
        showSettings: false,
      };
    }

    return {
      message: "Location services",
      steps: ["Click 'Get Location' to enable location access"],
      showSettings: false,
    };
  };

  const {
    message: guidanceMessage,
    steps: actionSteps,
    showSettings: showSettingsButton,
  } = getGuidanceMessage();

  // Check platform support
  const checkSupport = useCallback(async (): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      try {
        await getGeolocationService();
        return true;
      } catch {
        return false;
      }
    } else {
      return "geolocation" in navigator;
    }
  }, []);

  // Check permission status
  const checkPermission = useCallback(async (): Promise<
    typeof permissionStatus
  > => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await getGeolocationService();
        if (!Geolocation) return "unsupported";

        const status = await Geolocation.checkPermissions();
        return status.location as typeof permissionStatus;
      } else {
        // Browser permission query
        if (!navigator.permissions || !navigator.permissions.query) {
          return "unknown";
        }

        const permission = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        return permission.state as typeof permissionStatus;
      }
    } catch {
      return "unknown";
    }
  }, []);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await getGeolocationService();
        if (!Geolocation) {
          setPermissionStatus("unsupported");
          return false;
        }

        const result = await Geolocation.requestPermissions();
        const status = result.location as typeof permissionStatus;
        setPermissionStatus(status);
        return status === "granted";
      } else {
        // Browser - permission is requested implicitly with getCurrentPosition
        return true;
      }
    } catch (err) {
      setError("Failed to request permission");
      setPermissionStatus("denied");
      return false;
    }
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check support
      const isSupported = await checkSupport();
      if (!isSupported) {
        setPermissionStatus("unsupported");
        setError("Geolocation is not supported on this device");
        setIsLoading(false);
        return;
      }

      // Check permission
      const currentPermission = await checkPermission();
      setPermissionStatus(currentPermission);

      if (currentPermission === "denied") {
        setError(
          "Location permission was denied. Please enable it in settings."
        );
        setIsLoading(false);
        return;
      }

      // Request permission if needed
      if (currentPermission !== "granted") {
        const granted = await requestPermission();
        if (!granted) {
          setIsLoading(false);
          return;
        }
      }

      // Get location based on platform
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await getGeolocationService();
        if (!Geolocation) throw new Error("Geolocation not available");

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy,
          timeout,
        });
          console.log("Using Capacitor geolocation");

        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });
      } else {
          // Browser API
          console.log("Using browser geolocation API");
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy,
              timeout,
              maximumAge,
            });
          }
        );
          
          

        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });
      }
    } catch (err: any) {
      let errorMessage = "Failed to get location";

      if (err.code === 1) errorMessage = "Permission denied";
      else if (err.code === 2) errorMessage = "Position unavailable";
      else if (err.code === 3) errorMessage = "Request timed out";
      else if (err.message) errorMessage = err.message;

      setError(errorMessage);
      setPermissionStatus("denied");
    } finally {
      setIsLoading(false);
    }
  }, [
    checkSupport,
    checkPermission,
    requestPermission,
    enableHighAccuracy,
    timeout,
    maximumAge,
  ]);

  // Watch position (continuous updates)
  const startWatching = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      console.warn("Watch position is optimized for native platforms");
      return () => {};
    }

    try {
      const { Geolocation } = await getGeolocationService();
      if (!Geolocation) return () => {};

      const watchId = await Geolocation.watchPosition(
        { enableHighAccuracy, timeout },
        (position, err) => {
          if (err) {
            setError(err.message);
            return;
          }
          if (!position || !position.coords) {
            setError("Position unavailable");
            return;
          }
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        }
      );

      return () => {
        Geolocation.clearWatch({ id: watchId });
      };
    } catch (err: any) {
      setError(err.message);
      return () => {};
    }
  }, [enableHighAccuracy, timeout]);

  // Open device settings (guide user)
  const openDeviceSettings = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { App } = await import("@capacitor/app");
        // Capacitor doesn't have direct settings open, but you can use:
        alert(
          "Please open Settings → Apps → This App → Permissions → Enable Location"
        );
      } catch {
        alert("Open device Settings to enable location permission");
      }
    } else {
      // Browser - can't open settings directly
      alert("Please enable location permission in your browser settings");
    }
  }, []);

  // Clear location data
  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  // Auto-request on mount
  useEffect(() => {
    if (autoRequest) {
      requestPermission().then((granted) => {
        if (granted) {
          getCurrentLocation();
        }
      });
    }
  }, [autoRequest, requestPermission, getCurrentLocation]);

  // Watch position if enabled
  useEffect(() => {
    if (watchPosition && permissionStatus === "granted") {
      const cleanup = startWatching();
      return () => {
        cleanup.then((fn) => fn && fn());
      };
    }
  }, [watchPosition, permissionStatus, startWatching]);

  return {
    // State
    location,
    error,
    isLoading,
    permissionStatus,

    // Actions
    requestLocation: getCurrentLocation,
    clearLocation,

    // Helper states
    isLocationEnabled,
    isPermissionDenied,
    canRequestPermission,

    // User guidance
    guidanceMessage,
    actionSteps,
    showSettingsButton,
    openDeviceSettings,
  };
}
