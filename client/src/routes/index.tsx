import { useEffect, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import {
  api,
  wsManager,
  Market,
  PaginationInfo,
  SortBy,
  SortOrder,
  WebSocketMessage,
  MarketUpdateMessage,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MarketCard } from "@/components/market-card";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

const ITEMS_PER_PAGE = 20;

type StatusFilter = "active" | "resolved";

interface SortOption {
  label: string;
  value: SortBy;
}

const sortOptions: SortOption[] = [
  { label: "Newest", value: "createdAt" },
  { label: "Most Bets", value: "totalBets" },
  { label: "Most Participants", value: "participants" },
];

function DashboardPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("active");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const loadMarkets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.listMarkets({
        status,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sortBy,
        sortOrder,
      });
      setMarkets(data.markets);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load markets");
    } finally {
      setIsLoading(false);
    }
  }, [status, currentPage, sortBy, sortOrder]);

  // Load markets when filters change
  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [status, sortBy, sortOrder]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return;

    wsManager.connect();

    const unsubscribe = wsManager.subscribe("market_update", (message: WebSocketMessage) => {
      if (message.type !== "market_update") return;
      const updateMessage = message as MarketUpdateMessage;

      setMarkets((prevMarkets) =>
        prevMarkets.map((market) => {
          if (market.id === updateMessage.marketId) {
            return {
              ...market,
              outcomes: updateMessage.data.outcomes,
              totalMarketBets: updateMessage.data.totalMarketBets,
              participants: updateMessage.data.participants,
            };
          }
          return market;
        })
      );
    });

    return () => {
      unsubscribe();
      wsManager.disconnect();
    };
  }, [isAuthenticated]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSortChange = (newSortBy: SortBy) => {
    if (newSortBy === sortBy) {
      // Toggle order if same sort option clicked
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-slate-900">Prediction Markets</h1>
          <p className="text-slate-600 mb-8 text-lg">Create and participate in prediction markets</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate({ to: "/auth/login" })}>Login</Button>
            <Button variant="outline" onClick={() => navigate({ to: "/auth/register" })}>
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Markets</h1>
            <p className="text-slate-600 mt-2">Welcome back, {user?.username}!</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate({ to: "/auth/logout" })}>
              Logout
            </Button>
            <Button onClick={() => navigate({ to: "/markets/new" })}>Create Market</Button>
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Status Filters */}
          <div className="flex gap-2">
            <Button
              variant={status === "active" ? "default" : "outline"}
              onClick={() => setStatus("active")}
              size="sm"
            >
              Active Markets
            </Button>
            <Button
              variant={status === "resolved" ? "default" : "outline"}
              onClick={() => setStatus("resolved")}
              size="sm"
            >
              Resolved Markets
            </Button>
          </div>

          {/* Sorting Options */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Sort by:</span>
            <div className="flex gap-1">
              {sortOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={sortBy === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSortChange(option.value)}
                  className="text-xs"
                >
                  {option.label}
                  {sortBy === option.value && (
                    <span className="ml-1">{sortOrder === "desc" ? "↓" : "↑"}</span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time indicator */}
        <div className="mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-slate-500">Live updates enabled</span>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        {/* Markets Grid */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                <p className="text-slate-500">Loading markets...</p>
              </div>
            </CardContent>
          </Card>
        ) : markets.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-slate-500 text-lg">
                  No {status} markets found. {status === "active" && "Create one to get started!"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {markets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPrev}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {generatePageNumbers(currentPage, pagination.totalPages).map((pageNum, idx) =>
                    pageNum === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum as number)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    )
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNext}
                >
                  Next
                </Button>
              </div>
            )}

            {/* Pagination Info */}
            {pagination && (
              <div className="mt-4 text-center text-sm text-slate-500">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, pagination.totalCount)} of{" "}
                {pagination.totalCount} markets
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Helper function to generate page numbers with ellipsis
function generatePageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  const pages: (number | "...")[] = [];
  const showEllipsisThreshold = 7;

  if (totalPages <= showEllipsisThreshold) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push("...");
    }

    // Show pages around current page
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("...");
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
  }

  return pages;
}

export const Route = createFileRoute("/")({
  component: DashboardPage,
});
