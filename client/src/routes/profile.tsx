import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api, UserBet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ProfilePage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [activeBets, setActiveBets] = useState<UserBet[]>([]);
  const [resolvedBets, setResolvedBets] = useState<UserBet[]>([]);
  const [isLoadingActive, setIsLoadingActive] = useState(true);
  const [isLoadingResolved, setIsLoadingResolved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activePage, setActivePage] = useState(1);
  const [resolvedPage, setResolvedPage] = useState(1);
  const [activeTotalPages, setActiveTotalPages] = useState(1);
  const [resolvedTotalPages, setResolvedTotalPages] = useState(1);

  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [leaderboardTotal, setLeaderboardTotal] = useState<number | null>(null);

  const loadActiveBets = async () => {
    try {
      setIsLoadingActive(true);
      setError(null);
      const data = await api.getUserBets("active", activePage, 20);
      setActiveBets(data.bets);
      setActiveTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load active bets");
    } finally {
      setIsLoadingActive(false);
    }
  };

  const loadResolvedBets = async () => {
    try {
      setIsLoadingResolved(true);
      setError(null);
      const data = await api.getUserBets("resolved", resolvedPage, 20);
      setResolvedBets(data.bets);
      setResolvedTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load resolved bets"
      );
    } finally {
      setIsLoadingResolved(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadActiveBets();
      loadResolvedBets();
    }
  }, [isAuthenticated, activePage, resolvedPage]);

  useEffect(() => {
    const loadRank = async () => {
      if (!isAuthenticated || !user?.username) return;

      try {
        const data = await api.getLeaderboard();
        const rank = data.leaderboard.findIndex(
          (entry) => entry.username === user.username
        );
        setLeaderboardRank(rank === -1 ? null : rank + 1);
        setLeaderboardTotal(data.leaderboard.length);
      } catch (err) {
        console.error("Failed to load leaderboard rank", err);
      }
    };

    loadRank();
  }, [isAuthenticated, user?.username]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const apiBaseUrl =
      import.meta.env.VITE_API_URL || "http://localhost:4001/api";
    const es = new EventSource(`${apiBaseUrl}/markets/events`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "marketUpdate") {
          loadActiveBets();
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
  }, [isAuthenticated, activePage]);

  const activeCount = activeBets.length;
  const resolvedCount = resolvedBets.length;

  const wonResolvedCount = useMemo(() => {
    return resolvedBets.filter((bet) => bet.won).length;
  }, [resolvedBets]);

  const secondaryButtonClass =
    "rounded-xl border-2 !border-gray-800 !bg-indigo-100/90 !text-indigo-900 !shadow-lg hover:!bg-indigo-200/80 hover:!border-indigo-400";

  const primaryButtonClass =
    "rounded-xl bg-black text-white shadow-md hover:bg-black/90";

  const smallPaginationButtonClass =
    "rounded-xl border !border-gray-700 bg-indigo-100/90 px-3 py-1.5 text-sm text-indigo-900 shadow-sm hover:bg-indigo-200/80";

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-pink-100">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-gray-900">
              Access Denied
            </h1>
            <p className="mb-8 text-lg text-gray-600">
              Please log in to view your profile.
            </p>
            <Button
              className={primaryButtonClass}
              onClick={() => navigate({ to: "/auth/login" })}
            >
              Login
            </Button>
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
                      Profile
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">
                      Welcome back, {user?.username}! Track your balance,
                      leaderboard position, and all your active and resolved bets.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm text-gray-700 shadow-sm">
                      Balance:{" "}
                      <span className="font-semibold text-gray-900">
                        ${user?.balance.toFixed(2)}
                      </span>
                    </div>

                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 shadow-sm">
                      {activeCount} active bet{activeCount === 1 ? "" : "s"}
                    </div>

                    <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 shadow-sm">
                      {resolvedCount} resolved bet{resolvedCount === 1 ? "" : "s"}
                    </div>

                    <div className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700 shadow-sm">
                      {leaderboardRank !== null
                        ? `Rank #${leaderboardRank}${leaderboardTotal ? ` of ${leaderboardTotal}` : ""}`
                        : "Unranked"}
                    </div>

                    <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 shadow-sm">
                      {wonResolvedCount} win{wonResolvedCount === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <Button
                    className={secondaryButtonClass}
                    variant="outline"
                    onClick={() => navigate({ to: "/" })}
                  >
                    Back to Markets
                  </Button>
                  <Button
                    className={primaryButtonClass}
                    variant="default"
                    onClick={() => navigate({ to: "/auth/logout" })}
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Card className="border-white/60 bg-white/65 shadow-lg backdrop-blur">
              <CardHeader>
                <CardTitle>Active Bets</CardTitle>
                <CardDescription>
                  Your current bets on active markets with live odds.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {isLoadingActive ? (
                  <p className="text-muted-foreground">Loading active bets...</p>
                ) : activeBets.length === 0 ? (
                  <p className="text-muted-foreground">No active bets found.</p>
                ) : (
                  <div className="space-y-4">
                    {activeBets.map((bet) => (
                      <div
                        key={bet.id}
                        className="rounded-2xl border border-border bg-background px-4 py-4 shadow-sm"
                      >
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">
                              {bet.marketTitle}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Bet on: {bet.outcomeTitle}
                            </p>
                          </div>

                          <Badge
                            className="rounded-xl !bg-green-300 !text-black"
                            variant="default"
                          >
                            Active
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span>Amount: ${bet.amount.toFixed(2)}</span>
                          <span>
                            Current Odds: {bet.currentOdds?.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    ))}

                    {activeTotalPages > 1 && (
                      <div className="flex justify-center pt-2">
                        <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-md backdrop-blur">
                          <Button
                            variant="outline"
                            size="sm"
                            className={smallPaginationButtonClass}
                            onClick={() => setActivePage(activePage - 1)}
                            disabled={activePage === 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page{" "}
                            <span className="font-medium text-gray-900">
                              {activePage}
                            </span>{" "}
                            of{" "}
                            <span className="font-medium text-gray-900">
                              {activeTotalPages}
                            </span>
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className={smallPaginationButtonClass}
                            onClick={() => setActivePage(activePage + 1)}
                            disabled={activePage === activeTotalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/60 bg-white/65 shadow-lg backdrop-blur">
              <CardHeader>
                <CardTitle>Bet History</CardTitle>
                <CardDescription>
                  Your resolved bets and final results.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {isLoadingResolved ? (
                  <p className="text-muted-foreground">Loading bet history...</p>
                ) : resolvedBets.length === 0 ? (
                  <p className="text-muted-foreground">No resolved bets found.</p>
                ) : (
                  <div className="space-y-4">
                    {resolvedBets.map((bet) => (
                      <div
                        key={bet.id}
                        className="rounded-2xl border border-border bg-background px-4 py-4 shadow-sm"
                      >
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">
                              {bet.marketTitle}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Bet on: {bet.outcomeTitle}
                            </p>
                          </div>

                          <Badge
                            className="rounded-xl"
                            variant={bet.won ? "default" : "destructive"}
                          >
                            {bet.won ? "Won" : "Lost"}
                          </Badge>
                        </div>

                        <div className="text-sm">
                          Amount: ${bet.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}

                    {resolvedTotalPages > 1 && (
                      <div className="flex justify-center pt-2">
                        <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-md backdrop-blur">
                          <Button
                            variant="outline"
                            size="sm"
                            className={smallPaginationButtonClass}
                            onClick={() => setResolvedPage(resolvedPage - 1)}
                            disabled={resolvedPage === 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page{" "}
                            <span className="font-medium text-gray-900">
                              {resolvedPage}
                            </span>{" "}
                            of{" "}
                            <span className="font-medium text-gray-900">
                              {resolvedTotalPages}
                            </span>
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className={smallPaginationButtonClass}
                            onClick={() => setResolvedPage(resolvedPage + 1)}
                            disabled={resolvedPage === resolvedTotalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});