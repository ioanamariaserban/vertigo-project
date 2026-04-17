const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4001/api";
console.log('API_BASE_URL:', API_BASE_URL); // Debug log

// Types
export interface Market {
  id: number;
  title: string;
  description?: string;
  status: "active" | "resolved" | "archived";
  creator?: string;
  createdAt?: string;
  outcomes: MarketOutcome[];
  totalMarketBets: number;
  participantCount?: number;
  resolvedOutcomeId?: number;
}

export interface MarketOutcome {
  id: number;
  title: string;
  odds: number;
  totalBets: number;
}

export interface MarketsResponse {
  markets: Market[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: "user" | "admin";
  balance: number;
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

export interface UserBet {
  id: number;
  marketId: number;
  marketTitle: string;
  outcomeTitle: string;
  amount: number;
  currentOdds?: number;
  won?: boolean;
  createdAt: string;
}

export interface UserBetsResponse {
  bets: UserBet[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface LeaderboardEntry {
  username: string;
  totalWinnings: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

// API Client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    console.log('API Client initialized with baseUrl:', baseUrl); // Debug log
  }

  private getAuthHeader() {
    const token = localStorage.getItem("auth_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('Making request to:', url); // Debug log
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
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
  }

  async login(email: string, password: string): Promise<User> {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async getCurrentUser(): Promise<User> {
    const data = await this.request("/auth/me");
    return {
      ...data,
      token: localStorage.getItem("auth_token") || "",
    };
  }

  // Markets endpoints
  async listMarkets(
    status: "all" | "active" | "resolved" | "archived" = "active",
    sortBy?: string,
    sortOrder?: "asc" | "desc",
    page?: number,
    limit?: number,
    search?: string
  ): Promise<MarketsResponse> {
    const params = new URLSearchParams();

    if (status !== "all") params.append("status", status);
    if (sortBy) params.append("sortBy", sortBy);
    if (sortOrder) params.append("sortOrder", sortOrder);
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());
    if (search?.trim()) params.append("search", search.trim());

    return this.request(`/markets?${params.toString()}`);
  }

  async getMarket(id: number): Promise<Market> {
    return this.request(`/markets/${id}`);
  }

  async createMarket(title: string, description: string, outcomes: string[]): Promise<Market> {
    return this.request("/markets", {
      method: "POST",
      body: JSON.stringify({ title, description, outcomes }),
    });
  }

  // Bets endpoints
  async placeBet(marketId: number, outcomeId: number, amount: number): Promise<Bet> {
    return this.request(`/markets/${marketId}/bets`, {
      method: "POST",
      body: JSON.stringify({ outcomeId, amount }),
    });
  }

  async resolveMarket(marketId: number, resolvedOutcomeId: number) {
    return this.request(`/markets/${marketId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolvedOutcomeId }),
    });
  }

  // User endpoints
  async getUserBets(type: "active" | "resolved", page?: number, limit?: number): Promise<UserBetsResponse> {
    const params = new URLSearchParams({ type });
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());
    return this.request(`/user/bets?${params.toString()}`);
  }

  async getLeaderboard(): Promise<LeaderboardResponse> {
    return this.request("/leaderboard");
  }

  async archiveMarket(marketId: number) {
    return this.request(`/markets/${marketId}/archive`, {
      method: "POST",
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
