import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api, Market } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MarketCard } from "@/components/market-card";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function DashboardPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"all" | "active" | "resolved" | "archived">("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const loadMarkets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.listMarkets(
        status,
        sortBy,
        sortOrder,
        page,
        20,
        searchTerm
      );
      setMarkets(data.markets);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load markets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadMarkets();
    }
  }, [isAuthenticated, status, sortBy, sortOrder, page, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [status, sortBy, sortOrder, searchTerm]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const apiBaseUrl =
      import.meta.env.VITE_API_URL || "http://localhost:4001/api";
    const es = new EventSource(`${apiBaseUrl}/markets/events`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "marketUpdate") {
          loadMarkets();
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    es.onerror = (error) => {
      console.error("SSE error:", error);
    };

    return () => {
      es.close();
    };
  }, [isAuthenticated]);

  const visibleCount = markets.length;

  const headerStats = useMemo(() => {
    const activeCount = markets.filter((m) => m.status === "active").length;
    const resolvedCount = markets.filter((m) => m.status === "resolved").length;
    const archivedCount = markets.filter((m) => m.status === "archived").length;

    return {
      activeCount,
      resolvedCount,
      archivedCount,
    };
  }, [markets]);

  const visiblePageNumbers = useMemo(() => {
    const maxVisiblePages = 5;

    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, index) => startPage + index
    );
  }, [page, totalPages]);

  const paginationButtonClass = (pageNumber: number) =>
    page === pageNumber
      ? "rounded-xl !bg-black !text-white shadow-md"
      : "rounded-xl border !border-gray-700 bg-indigo-100/90 text-indigo-900 px-3 py-1.5 text-sm shadow-sm hover:bg-indigo-200/80";

  const filterButtonClass = (value: typeof status) =>
    status === value
      ? "rounded-xl !bg-black !text-white shadow-md"
      : "rounded-xl border-2 !border-gray-800 bg-indigo-100/90 !text-indigo-900 !shadow-lg hover:!bg-indigo-200/80 hover:!border-indigo-400";

  const secondaryButtonClass =
    "rounded-xl border-2 !border-gray-800 !bg-indigo-100/90 !text-indigo-900 !shadow-lg hover:!bg-indigo-200/80 hover:!border-indigo-400";

  const primaryButtonClass =
    "rounded-xl bg-black text-white shadow-md hover:bg-black/90";

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-pink-100">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-gray-900">
              Prediction Markets
            </h1>
            <p className="mb-8 text-lg text-gray-600">
              Create, track, and participate in live prediction markets.
            </p>
            <div className="space-x-4">
              <Button
                className={primaryButtonClass}
                onClick={() => navigate({ to: "/auth/login" })}
              >
                Login
              </Button>
              <Button
                variant="outline"
                className={secondaryButtonClass}
                onClick={() => navigate({ to: "/auth/register" })}
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-pink-100">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-6">
          <Card className="border-white/60 bg-white/65 shadow-xl backdrop-blur">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                      Markets
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">
                      Welcome back, {user?.username}! Monitor activity, manage
                      market states, and track live changes in one place.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm text-gray-700 shadow-sm">
                      {visibleCount} market{visibleCount === 1 ? "" : "s"} on this page
                    </div>
                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 shadow-sm">
                      {headerStats.activeCount} active
                    </div>
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 shadow-sm">
                      {headerStats.resolvedCount} resolved
                    </div>
                    <div className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 shadow-sm">
                      {headerStats.archivedCount} archived
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <Button
                    variant="outline"
                    className={secondaryButtonClass}
                    onClick={() => navigate({ to: "/leaderboard" })}
                  >
                    Leaderboard
                  </Button>
                  <Button
                    variant="outline"
                    className={secondaryButtonClass}
                    onClick={() => navigate({ to: "/profile" })}
                  >
                    Profile
                  </Button>
                  <Button
                    variant="outline"
                    className={primaryButtonClass}
                    onClick={() => navigate({ to: "/auth/logout" })}
                  >
                    Logout
                  </Button>
                  <Button
                    className={primaryButtonClass}
                    onClick={() => navigate({ to: "/markets/new" })}
                  >
                    Create Market
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/60 bg-white/65 shadow-lg backdrop-blur">
            <CardContent className="p-5">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1 max-w-xl">
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search markets by title..."
                      className="rounded-xl border-2 !border-gray-800 !bg-indigo-100/90 !text-indigo-900 !shadow-lg placeholder:!text-indigo-700/70"
                    />
                  </div>

                  {searchTerm.trim() && (
                    <Button
                      variant="outline"
                      className={secondaryButtonClass}
                      onClick={() => setSearchTerm("")}
                    >
                      Clear Search
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className={filterButtonClass("all")}
                    onClick={() => setStatus("all")}
                  >
                    All Markets
                  </Button>
                  <Button
                    variant="outline"
                    className={filterButtonClass("active")}
                    onClick={() => setStatus("active")}
                  >
                    Active Markets
                  </Button>
                  <Button
                    variant="outline"
                    className={filterButtonClass("resolved")}
                    onClick={() => setStatus("resolved")}
                  >
                    Resolved Markets
                  </Button>
                  <Button
                    variant="outline"
                    className={filterButtonClass("archived")}
                    onClick={() => setStatus("archived")}
                  >
                    Archived Markets
                  </Button>
                </div>

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">
                        Sort by:
                      </span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="rounded-xl border border-white/70 bg-white/80 px-4 py-2 text-sm shadow-sm outline-none transition focus:border-primary"
                      >
                        <option value="createdAt">Creation Date</option>
                        <option value="totalBets">Total Bet Size</option>
                        <option value="participants">Participants</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">
                        Order:
                      </span>
                      <select
                        value={sortOrder}
                        onChange={(e) =>
                          setSortOrder(e.target.value as "asc" | "desc")
                        }
                        className="rounded-xl border border-white/70 bg-white/80 px-4 py-2 text-sm shadow-sm outline-none transition focus:border-primary"
                      >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                      Showing <span className="font-medium text-gray-800">{status}</span> markets
                    </div>
                    <Button
                      variant="outline"
                      className={primaryButtonClass}
                      onClick={loadMarkets}
                      disabled={isLoading}
                    >
                      {isLoading ? "Refreshing..." : "Refresh"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {isLoading ? (
            <Card className="border-white/60 bg-white/65 shadow-lg backdrop-blur">
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading markets...</p>
              </CardContent>
            </Card>
          ) : markets.length === 0 ? (
            <Card className="border-white/60 bg-white/65 shadow-lg backdrop-blur">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-lg text-muted-foreground">
                    {searchTerm.trim()
                      ? `No markets found for "${searchTerm}".`
                      : `No ${status === "all" ? "" : status} markets found.${status === "active" ? " Create one to get started!" : ""}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                {markets.map((market) => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center pt-4">
                  <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-md backdrop-blur">
                    <Button
                      variant="outline"
                      className={primaryButtonClass}
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>

                    {visiblePageNumbers[0] > 1 && (
                      <>
                        <Button
                          variant="outline"
                          className={paginationButtonClass(1)}
                          onClick={() => setPage(1)}
                        >
                          1
                        </Button>
                        {visiblePageNumbers[0] > 2 && (
                          <span className="px-1 text-sm text-muted-foreground">...</span>
                        )}
                      </>
                    )}

                    {visiblePageNumbers.map((pageNumber) => (
                      <Button
                        key={pageNumber}
                        variant="outline"
                        className={paginationButtonClass(pageNumber)}
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </Button>
                    ))}

                    {visiblePageNumbers[visiblePageNumbers.length - 1] < totalPages && (
                      <>
                        {visiblePageNumbers[visiblePageNumbers.length - 1] < totalPages - 1 && (
                          <span className="px-1 text-sm text-muted-foreground">...</span>
                        )}
                        <Button
                          variant="outline"
                          className={paginationButtonClass(totalPages)}
                          onClick={() => setPage(totalPages)}
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}

                    <Button
                      variant="outline"
                      className={primaryButtonClass}
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: DashboardPage,
});