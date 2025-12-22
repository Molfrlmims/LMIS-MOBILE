import localforage from "localforage";
import { Network } from "@capacitor/network";
import { apiClient } from "./api";

export interface OfflineRequest {
  id: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
  retries: number;
  type: "api" | "image";
  fileData?: {
    filePaths: string[];
    imageData: Array<{
      itemId: number;
      description?: string;
    }>;
    reportId: number;
  };
}

export interface StoredImage {
  id: string;
  base64Data: string;
  fileName: string;
  tempId?: string;
  description?: string;
}

export interface OfflineReportImages {
  id: string;
  tempIds: string[];
  images: Array<{
    tempId: string;
    base64Data: string;
    fileName: string;
    description?: string;
  }>;
  timestamp: number;
}

class OfflineService {
  private isOnline = true;
  private syncInProgress = false;
  private syncCallbacks: Array<() => void> = [];

  // Store instances
  private queueStore!: LocalForage;
  private imagesStore!: LocalForage;
  private reportImagesStore!: LocalForage;

  constructor() {
    this.initStorage();
    this.initNetworkListener();
  }

  private initStorage() {
    // Store for API requests
    this.queueStore = localforage.createInstance({
      name: "price-reports-app",
      storeName: "offline_queue",
    });

    // Store for individual images
    this.imagesStore = localforage.createInstance({
      name: "price-reports-app",
      storeName: "offline_images",
    });

    // Store for offline report images with tempIds
    this.reportImagesStore = localforage.createInstance({
      name: "price-reports-app",
      storeName: "offline_report_images",
    });
  }

  private async initNetworkListener() {
    try {
      const status = await Network.getStatus();
      this.isOnline = status.connected;

      Network.addListener("networkStatusChange", (status) => {
        this.isOnline = status.connected;
        if (this.isOnline) {
          this.syncPendingRequests();
        }
      });
    } catch (error) {
      console.warn("Network plugin not available, using browser API");
      this.setupBrowserNetworkListener();
    }
  }

  private setupBrowserNetworkListener() {
    this.isOnline = navigator.onLine;

    window.addEventListener("online", () => {
      this.isOnline = true;
      this.syncPendingRequests();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });
  }

  // Request Queue Management
  async queueRequest(
    request: Omit<OfflineRequest, "id" | "timestamp" | "retries">
  ): Promise<string> {
    const offlineRequest: OfflineRequest = {
      id: this.generateId(),
      ...request,
      timestamp: Date.now(),
      retries: 0,
    };

    await this.queueStore.setItem(offlineRequest.id, offlineRequest);
    return offlineRequest.id;
  }

  async getPendingRequests(): Promise<OfflineRequest[]> {
    const requests: OfflineRequest[] = [];
    await this.queueStore.iterate((value: OfflineRequest) => {
      requests.push(value);
    });
    return requests.sort((a, b) => a.timestamp - b.timestamp);
  }

  async removeRequest(id: string): Promise<void> {
    await this.queueStore.removeItem(id);
  }

  async updateRequestRetry(id: string, retries: number): Promise<void> {
    const request = await this.queueStore.getItem<OfflineRequest>(id);
    if (request) {
      request.retries = retries;
      await this.queueStore.setItem(id, request);
    }
  }

  async clearAllRequests(): Promise<void> {
    await this.queueStore.clear();
  }

  // Store images for offline report (with tempIds)
  async storeOfflineReportImages(
    images: Array<{
      tempId: string;
      file: File;
      description?: string;
    }>
  ): Promise<string> {
    const storageId = `report_images_${Date.now()}`;

    const imagesData = await Promise.all(
      images.map(async (img) => {
        const base64Data = await this.fileToBase64(img.file);
        return {
          tempId: img.tempId,
          base64Data,
          fileName: `item-${img.tempId}.jpg`,
          description: img.description,
        };
      })
    );

    const offlineImages: OfflineReportImages = {
      id: storageId,
      tempIds: images.map((img) => img.tempId),
      images: imagesData,
      timestamp: Date.now(),
    };

    await this.reportImagesStore.setItem(storageId, offlineImages);
    return storageId;
  }

  // Get stored images for a report
  async getStoredReportImages(
    storageId: string
  ): Promise<OfflineReportImages | null> {
    return await this.reportImagesStore.getItem(storageId);
  }

  // Find stored images by tempIds
  async findStoredImagesByTempIds(
    tempIds: string[]
  ): Promise<OfflineReportImages | null> {
    let foundImages: OfflineReportImages | null = null;

    await this.reportImagesStore.iterate((value: OfflineReportImages) => {
      // Check if this storage contains any of the tempIds we're looking for
      const hasMatchingTempIds = value.tempIds.some((tempId) =>
        tempIds.includes(tempId)
      );

      if (
        hasMatchingTempIds &&
        (!foundImages || value.timestamp < foundImages.timestamp)
      ) {
        foundImages = value;
      }
    });

    return foundImages;
  }

  // Remove stored report images
  async removeStoredReportImages(storageId: string): Promise<void> {
    await this.reportImagesStore.removeItem(storageId);
  }

  // Upload images for a synced report
  async uploadImagesForSyncedReport(
    savedReport: any,
    storedImages: OfflineReportImages
  ): Promise<void> {
    if (!storedImages.images.length) return;

    const files: File[] = [];
    const imageMetadata = storedImages.images
      .map((storedImage) => {
        // Find the REAL database ID for this tempId
        const dbItem = savedReport.items.find(
          (item: any) => item.tempId === storedImage.tempId
        );
        if (!dbItem) {
          console.warn(
            `No database item found for tempId: ${storedImage.tempId}`
          );
          return null;
        }

        // Convert base64 to File
        const file = this.base64ToFile(
          storedImage.base64Data,
          storedImage.fileName
        );
        files.push(file);

        return {
          itemId: dbItem.id, // ← REAL database ID!
          description: storedImage.description || `Image for item ${dbItem.id}`,
        };
      })
      .filter((meta) => meta !== null);

    // Upload images if we have any valid ones
    if (imageMetadata.length > 0 && files.length > 0) {
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No authentication token available");
      }

      console.log(
        `📤 Uploading ${files.length} images for report ${savedReport.id}`
      );

      const uploadResult = await apiClient.uploadImages(token, {
        reportId: savedReport.id,
        images: imageMetadata,
        files: files,
      });

      if (uploadResult) {
        console.log(
          `✅ Successfully uploaded ${files.length} images for report ${savedReport.id}`
        );
        // Clean up stored images after successful upload
        await this.removeStoredReportImages(storedImages.id);
      } else {
        throw new Error(`Image upload failed`);
      }
    } else {
      console.warn("No valid images to upload after processing");
      // Clean up anyway since we couldn't process the images
      await this.removeStoredReportImages(storedImages.id);
    }
  }

  // Image Handling for individual images
  async storeImage(
    file: File,
    itemId: number,
    requestId?: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imageData = e.target?.result as string;
          if (imageData) {
            const imageId = `img_${Date.now()}_${itemId}`;
            const storedImage: StoredImage = {
              id: imageId,
              base64Data: imageData,
              fileName: file.name,
              tempId: requestId ? `${requestId}_${itemId}` : undefined,
            };

            await this.imagesStore.setItem(imageId, storedImage);
            resolve(imageId);
          } else {
            reject(new Error("Failed to read file"));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async getStoredImage(imageId: string): Promise<StoredImage | null> {
    return await this.imagesStore.getItem(imageId);
  }

  async removeStoredImage(imageId: string): Promise<void> {
    await this.imagesStore.removeItem(imageId);
  }

  async getStoredImagesByRequest(requestId: string): Promise<StoredImage[]> {
    const images: StoredImage[] = [];
    await this.imagesStore.iterate((value: StoredImage) => {
      if (value.tempId && value.tempId.startsWith(requestId)) {
        images.push(value);
      }
    });
    return images;
  }

  // Sync Logic - FIXED
  async syncPendingRequests(): Promise<void> {
    if (this.syncInProgress) return;

    this.syncInProgress = true;

    try {
      // Get initial batch
      let requests = await this.getPendingRequests();
      const processedIds = new Set<string>();
      let processedCount = 0;

      while (requests.length > 0 && processedCount < 50) {
        const request = requests[0];

        // Skip if already processed
        if (processedIds.has(request.id)) {
          requests = requests.slice(1);
          continue;
        }

        if (request.retries >= 3) {
          await this.removeRequest(request.id);
          processedIds.add(request.id);
          requests = await this.getPendingRequests();
          continue;
        }

        try {
          // Double-check the request still exists
          const currentRequest = await this.queueStore.getItem(request.id);
          if (!currentRequest) {
            processedIds.add(request.id);
            requests = requests.slice(1);
            continue;
          }

          console.log(`🔄 Processing: ${request.id} (${request.type})`);

          if (request.type === "image") {
            await this.processImageUpload(request);
          } else {
            await this.processApiRequest(request);
          }

          // CRITICAL: Wait for removal to complete
          await this.removeRequest(request.id);
          processedIds.add(request.id);
          console.log(`✅ Synced: ${request.id}`);

          // CRITICAL: Small delay to ensure storage consistency
          await new Promise((resolve) => setTimeout(resolve, 50));

          // Refresh the list
          requests = await this.getPendingRequests();
          processedCount++;
        } catch (error: any) {
          await this.updateRequestRetry(request.id, request.retries + 1);
          console.warn(`Failed: ${request.id}, retry ${request.retries + 1}`);

          // Move to next request
          processedIds.add(request.id);
          requests = requests.slice(1);
        }
      }

      this.notifySyncComplete();
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processApiRequest(request: OfflineRequest): Promise<void> {
    const response = await apiClient.directRequest(request.endpoint, {
      method: request.method as any,
      headers: request.headers,
      body: request.body,
    });

    // If this was a price report creation, find and upload associated images
    console.log("Processed API request:", request.endpoint, request.method);
    if (request.endpoint === "/price-reports" && request.method === "POST") {
      console.log("Processing synced price report creation");
      const reportId = (response as { id: number }).id;

      // Get the full report with items to get tempId mapping
      const token = localStorage.getItem("access_token");
      console.log("Token available for fetching full report?", !!token);
      if (token) {
        try {
          const fullReport = response;
          console.log("Fetched full report for image upload:", fullReport);
          await this.findAndUploadReportImages(fullReport);
        } catch (error) {
          console.warn("Failed to get full report for image upload:", error);
        }
      }
    }
  }

  // Find and upload images for a synced report
  private async findAndUploadReportImages(savedReport: any): Promise<void> {
    if (!savedReport.items || !savedReport.items.length) return;
    console.log("Finding stored images for report items");
    // Extract tempIds from the saved report items
    const tempIds = savedReport.items
      .map((item: any) => item.tempId)
      .filter((tempId: string) => tempId);

    if (tempIds.length === 0) {
      console.log("No tempIds found in report items");
      return;
    }

    // Find stored images for these tempIds
    const storedImages = await this.findStoredImagesByTempIds(tempIds);

    if (storedImages) {
      console.log(
        `📸 Found ${storedImages.images.length} stored images for report ${savedReport.id}`
      );
      await this.uploadImagesForSyncedReport(savedReport, storedImages);
    } else {
      console.log(`No stored images found for report ${savedReport.id}`);
    }
  }

  private async processImageUpload(request: OfflineRequest): Promise<void> {
    if (!request.fileData) {
      throw new Error("No file data found for image upload");
    }

    const { filePaths, imageData, reportId } = request.fileData;
    const formData = new FormData();

    formData.append("reportId", reportId.toString());

    // Convert stored images back to files
    for (let i = 0; i < filePaths.length; i++) {
      const imageKey = filePaths[i];
      const storedImage = await this.getStoredImage(imageKey);

      if (storedImage) {
        const file = this.base64ToFile(
          storedImage.base64Data,
          storedImage.fileName
        );
        formData.append(`image_${imageData[i].itemId}`, file);
        await this.removeStoredImage(imageKey);
      }
    }

    // Add image metadata
    imageData.forEach((image, index) => {
      formData.append(`images[${index}][itemId]`, image.itemId.toString());
      if (image.description) {
        formData.append(`images[${index}][description]`, image.description);
      }
    });

    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://41.220.118.182:3000"
      }/upload`,
      {
        method: "POST",
        headers: {
          Authorization: request.headers.Authorization || "",
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    await response.json();
  }

  private base64ToFile(base64Data: string, fileName: string): File {
    const byteString = atob(base64Data.split(",")[1]);
    const mimeString = base64Data.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeString });
    return new File([blob], fileName, { type: mimeString });
  }

  // Convert file to base64
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Utility Methods
  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Callback system for UI updates
  onSyncComplete(callback: () => void): void {
    this.syncCallbacks.push(callback);
  }

  private notifySyncComplete(): void {
    this.syncCallbacks.forEach((callback) => callback());
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  isSyncing(): boolean {
    return this.syncInProgress;
  }
}

export const offlineService = new OfflineService();
