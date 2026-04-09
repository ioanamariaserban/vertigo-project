const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4001";
const WS_BASE_URL = import.meta.env.VITE_WS_URL || "ws://localhost:4001";

// Types
export interface Market {
  id: number;
  title: string;
  description?: string;
  status: "active" | "resolved";
  creator?: string;
  createdAt?: string;
  outcomes: MarketOutcome[];
  totalMarketBets: number;
  participants?: number;
}

export interface MarketOutcome {
  id: number;
  title: string;
  odds: number;
  totalBets: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  token: string;
}

export interface Bet {
  id: number;
  userId: number;
  marketId: number;
  outcomeId: number;
  amount: number;
  createdAt: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface MarketsResponse {
  markets: Market[];
  pagination: PaginationInfo;
}

export type SortBy = "createdAt" | "totalBets" | "participants";
export type SortOrder = "asc" | "desc";

export interface ListMarketsParams {
  status?: "active" | "resolved";
  page?: number;
  limit?: number;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
}

// WebSocket Types
export interface MarketUpdateMessage {
  type: "market_update";
  marketId: number;
  data: {
    outcomes: MarketOutcome[];
    totalMarketBets: number;
    participants: number;
  };
}

export type WebSocketMessage = MarketUpdateMessage;

// API Client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeader() {
    const token = localStorage.getItem("auth_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...this.getAuthHeader(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // If there are validation errors, throw them
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessage = data.errors.map((e: any) => `${e.field}: ${e.message}`).join(", ");
        throw new Error(errorMessage);
      }
      throw new Error(data.error || `API Error: ${response.status}`);
    }

    return data ?? {};
  }

  // Auth endpoints
  async register(username: string, email: string, password: string): Promise<User> {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
  }

  async login(email: string, password: string): Promise<User> {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  // Markets endpoints
  async listMarkets(params: ListMarketsParams = {}): Promise<MarketsResponse> {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set("status", params.status);
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.limit) searchParams.set("limit", params.limit.toString());
    if (params.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);
    
    const queryString = searchParams.toString();
    return this.request(`/api/markets${queryString ? `?${queryString}` : ""}`);
  }

  async getMarket(id: number): Promise<Market> {
    return this.request(`/api/markets/${id}`);
  }

  async createMarket(title: string, description: string, outcomes: string[]): Promise<Market> {
    return this.request("/api/markets", {
      method: "POST",
      body: JSON.stringify({ title, description, outcomes }),
    });
  }

  // Bets endpoints
  async placeBet(marketId: number, outcomeId: number, amount: number): Promise<Bet> {
    return this.request(`/api/markets/${marketId}/bets`, {
      method: "POST",
      body: JSON.stringify({ outcomeId, amount }),
    });
  }
}

// WebSocket Manager
class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<(data: WebSocketMessage) => void>> = new Map();
  private reconnectTimeout: number | null = null;
  private pingInterval: number | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(`${this.url}/ws`);

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      // Start ping interval for keep-alive
      this.pingInterval = window.setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send("ping");
        }
      }, 30000);
    };

    this.ws.onmessage = (event) => {
      if (event.data === "pong") return;
      
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.notifyListeners(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    this.ws.onclose = () => {
      console.log("WebSocket disconnected");
      this.cleanup();
      // Attempt to reconnect after 3 seconds
      this.reconnectTimeout = window.setTimeout(() => {
        this.connect();
      }, 3000);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  disconnect() {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  subscribe(eventType: string, callback: (data: WebSocketMessage) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  private notifyListeners(message: WebSocketMessage) {
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach((callback) => callback(message));
    }
    // Also notify "all" listeners
    const allListeners = this.listeners.get("all");
    if (allListeners) {
      allListeners.forEach((callback) => callback(message));
    }
  }
}

export const api = new ApiClient(API_BASE_URL);
export const wsManager = new WebSocketManager(WS_BASE_URL);
