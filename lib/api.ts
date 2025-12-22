import { CapacitorHttp } from "@capacitor/core";
import { offlineService } from "./offiline-service";

const API_BASE_URL = "http://13.50.108.254:3000";

// =============== TYPE DEFINITIONS ===============
export interface User {
  id: number;
  email: string;
  name: string;
}

export interface AuthResponse {
  userId: number;
  token?: string;
}

export interface OtpResponse {
  access_token: string;
}

export interface Species {
  id: number;
  name: string;
}

export interface Grade {
  id: number;
  name: string;
}

export interface Country {
  id: number;
  name: string;
  code: string;
}

export interface ReferenceData {
  species: Species[];
  grades: Grade[];
  countries: Country[];
}

export interface ReportItem {
  id?: number;
  speciesId: number;
  gradeId: number;
  gender: string;
  price: number;
  currency: string;
  countryId?: number;
  images?: string[];
  offlineImagePaths?: string[];
  tempId?: string;
}

export interface PriceReport {
  id?: number;
  title: string;
  date: string;
  market: string;
  items: ReportItem[];
  status: "draft" | "submitted" | "approved" | "rejected";
  createdAt?: string;
  updatedAt?: string;
  offline?: boolean;
  requestId?: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalReports: number;
  pendingApproval: number;
  approvedReports: number;
  recentActivity: RecentActivity[];
}

export interface RecentActivity {
  id: number;
  action: string;
  description: string;
  timestamp: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  success: boolean;
}

export interface ImageUploadData {
  reportId: number;
  images: Array<{
    itemId: number;
    description?: string;
  }>;
  files: File[];
}

// =============== API CLIENT ===============
export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  public async directRequest<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
      headers?: Record<string, string>;
      body?: any;
      params?: Record<string, string>;
      skipJsonContentType?: boolean;
    } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const {
      method = "GET",
      headers = {},
      body,
      params,
      skipJsonContentType = false,
    } = options;

    try {
      const requestHeaders = { ...headers };

      if (
        !skipJsonContentType &&
        !requestHeaders["Content-Type"] &&
        method !== "GET"
      ) {
        requestHeaders["Content-Type"] = "application/json";
      }

      const response = await CapacitorHttp.request({
        method,
        url,
        headers: requestHeaders,
        data: body,
        params,
        webFetchExtra: {
          mode: "cors",
        },
      });

      if (response.status < 200 || response.status >= 300) {
        throw new ApiError(
          response.data?.message || `HTTP error! status: ${response.status}`,
          response.status,
          response.data
        );
      }

      return response.data as T;
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Network error occurred", 0, {
        originalError: error,
      });
    }
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
      headers?: Record<string, string>;
      body?: any;
      params?: Record<string, string>;
      skipJsonContentType?: boolean;
      offlineable?: boolean;
    } = {}
  ): Promise<T> {
    const {
      method = "GET",
      headers = {},
      body,
      params,
      skipJsonContentType = false,
      offlineable = false,
    } = options;

    console.log("API Request:", { endpoint, method, body, params, offlineable });
    console.log('is online' , offlineService.getOnlineStatus())
     if (offlineable && !offlineService.getOnlineStatus()) {
      return this.handleOfflineRequest(endpoint, options) as Promise<T>;
    }

    return this.directRequest<T>(endpoint, options);
  }

  private async handleOfflineRequest(
    endpoint: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
    }
  ): Promise<any> {
    const { method = "GET", headers = {}, body } = options;

    try {
      const requestId = await offlineService.queueRequest({
        endpoint,
        method: method as string,
        headers,
        body,
        type: "api",
      });

      // if (body && method !== "GET") {
      //   await this.cacheOfflineData(requestId, { endpoint, method, body });
      // }

      return {
        success: true,
        message: "Request queued for offline execution",
        requestId,
        queuedAt: new Date().toISOString(),
        offline: true,
      };
    } catch (error) {
      throw new ApiError("Failed to queue offline request", 0, {
        originalError: error,
      });
    }
  }

  private async cacheOfflineData(requestId: string, data: any): Promise<void> {
    try {
      localStorage.setItem(`offline_data_${requestId}`, JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to cache offline data:", error);
    }
  }

  async getOfflineData(requestId: string): Promise<any> {
    try {
      const data = localStorage.getItem(`offline_data_${requestId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  async getPendingOfflineRequests(): Promise<any[]> {
    return offlineService.getPendingRequests();
  }

  async syncOfflineRequests(): Promise<void> {
    await offlineService.syncPendingRequests();
  }

  isOnline(): boolean {
    return offlineService.getOnlineStatus();
  }

  // =============== IMAGE UPLOAD WITH ===============
  async uploadImages(
    token: string,
    uploadData: ImageUploadData
  ): Promise<{
    success: boolean;
    urls?: string[];
    offline?: boolean;
    requestId?: string;
  }> {
    const formData = new FormData();
    formData.append("reportId", uploadData.reportId.toString());

    uploadData.images.forEach((image, index) => {
      formData.append(`images[${index}][itemId]`, image.itemId.toString());
      if (image.description) {
        formData.append(`images[${index}][description]`, image.description);
      }
    });

    uploadData.files.forEach((file, index) => {
      const itemId = uploadData.images[index].itemId;
      formData.append(`image_${itemId}`, file);
    });

    try {
      const response = await fetch(
        `https://ats-system-two.vercel.app/api/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData?.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("Network error occurred", 0, {
        originalError: error,
      });
    }
  }

  // =============== AUTH ENDPOINTS ===============
  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      offlineable: false,
    });
  }

  async verifyOtp(code: string, userId: number): Promise<OtpResponse> {
    return this.request<OtpResponse>("/auth/verify-otp", {
      method: "POST",
      body: { code, userId },
      offlineable: false,
    });
  }

  // =============== PRICE REPORT ENDPOINTS ===============
  async getReferenceData(token: string): Promise<ReferenceData> {
    try {
      const data = await this.request<ReferenceData>(
        "/price-reports/reference-data",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          offlineable: false,
        }
      );

      if (data) {
        localStorage.setItem("cached_reference_data", JSON.stringify(data));
      }

      return data;
    } catch (error) {
      const cachedData = localStorage.getItem("cached_reference_data");
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      throw error;
    }
  }

  async getReports(
    token: string,
    params?: Record<string, string>
  ): Promise<PriceReport[]> {
    return this.request<PriceReport[]>("/price-reports", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params,
      offlineable: false,
    });
  }

  async getReport(token: string, reportId: number): Promise<PriceReport> {
    return this.request<PriceReport>(`/price-reports/${reportId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      offlineable: false,
    });
  }

  async createReport(
    token: string,
    reportData: Partial<PriceReport>
  ): Promise<PriceReport> {
    return this.request<PriceReport>("/price-reports", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: reportData,
      offlineable: true,
    });
  }

  async updateReport(
    token: string,
    reportId: number,
    reportData: Partial<PriceReport>
  ): Promise<PriceReport> {
    return this.request<PriceReport>(`/price-reports/${reportId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: reportData,
      offlineable: true,
    });
  }

  async deleteReport(
    token: string,
    reportId: number
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/price-reports/${reportId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      offlineable: true,
    });
  }

  // =============== ITEM MANAGEMENT ENDPOINTS ===============
  async addReportItem(
    token: string,
    reportId: number,
    itemData: {
      speciesId: number;
      gradeId: number;
      gender: string;
      price: number;
      currency: string;
      countryId?: number;
    }
  ): Promise<ReportItem> {
    return this.request<ReportItem>(`/price-reports/${reportId}/items`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: itemData,
      offlineable: true,
    });
  }

  async updateReportItem(
    token: string,
    reportId: number,
    itemId: number,
    itemData: Partial<ReportItem>
  ): Promise<ReportItem> {
    return this.request<ReportItem>(
      `/price-reports/${reportId}/items/${itemId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: itemData,
        offlineable: true,
      }
    );
  }

  async deleteReportItem(
    token: string,
    reportId: number,
    itemId: number
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/price-reports/${reportId}/items/${itemId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        offlineable: true,
      }
    );
  }

  // =============== NOTIFICATION ENDPOINTS ===============
  async getNotifications(token: string): Promise<Notification[]> {
    return this.request<Notification[]>("/notifications", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      offlineable: false,
    });
  }

  async markNotificationAsRead(
    token: string,
    notificationId: number
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/notifications/${notificationId}/read`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        offlineable: true,
      }
    );
  }

  // =============== DASHBOARD ENDPOINTS ===============
  async getDashboardStats(token: string): Promise<DashboardStats> {
    return this.request<DashboardStats>("/dashboard/stats", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      offlineable: false,
    });
  }

  async getRecentActivity(
    token: string,
    limit: number = 10
  ): Promise<RecentActivity[]> {
    return this.request<RecentActivity[]>("/dashboard/recent-activity", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: { limit: limit.toString() },
      offlineable: false,
    });
  }

  // =============== SETTINGS ENDPOINTS ===============
  async getAppSettings(token: string): Promise<Record<string, any>> {
    return this.request<Record<string, any>>("/settings", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      offlineable: false,
    });
  }

  async updateAppSettings(
    token: string,
    settings: any
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("/settings", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: settings,
      offlineable: true,
    });
  }

  // =============== UTILITY ENDPOINTS ===============
  async getServerStatus(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>("/health", {
      offlineable: false,
    });
  }

  async getAppVersion(): Promise<{ version: string }> {
    return this.request<{ version: string }>("/version", {
      offlineable: false,
    });
  }

  async clearCache(token: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>("/cache/clear", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      offlineable: false,
    });
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: any) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiClient = new ApiClient();
