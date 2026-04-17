import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api, LeaderboardEntry } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function LeaderboardPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getLeaderboard();
        setLeaderboard(data.leaderboard);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load leaderboard"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  const topWinner = leaderboard[0];
  const totalTrackedUsers = leaderboard.length;

  const topThreeTotal = useMemo(() => {
    return leaderboard
      .slice(0, 3)
      .reduce((sum, entry) => sum + entry.totalWinnings, 0);
  }, [leaderboard]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-pink-100">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4">
          <Card className="border-white/60 bg-white/70 shadow-xl backdrop-blur">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-muted-foreground">
                Please log in to view the leaderboard
              </p>
              <Button onClick={() => navigate({ to: "/auth/login" })}>
                Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-blue-50 to-pink-100 py-8">
      <div className="mx-auto max-w-5xl px-4 space-y-6">
        <Card className="border-white/60 bg-white/65 shadow-xl backdrop-blur">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                    Leaderboard
                  </h1>
                  <p className="mt-2 text-lg text-gray-600">
                    See which users earned the most from resolved markets and
                    track the top performers.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm text-gray-700 shadow-sm">
                    {totalTrackedUsers} ranked user
                    {totalTrackedUsers === 1 ? "" : "s"}
                  </div>

                  <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 shadow-sm">
                    Top winner:{" "}
                    <span className="font-semibold">
                      {topWinner ? topWinner.username : "N/A"}
                    </span>
                  </div>

                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 shadow-sm">
                    Top 3 total: ${topThreeTotal.toFixed(2)}
                  </div>
                </div>

                {topWinner && !isLoading && (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 px-5 py-4 shadow-sm">
                    <p className="text-sm font-medium text-indigo-900">
                      Current leader
                    </p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xl font-bold text-gray-900">
                        #{1} {topWinner.username}
                      </p>
                      <p className="text-xl font-bold text-indigo-900">
                        ${topWinner.totalWinnings.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <Button
                  className="rounded-xl hover:!bg-white hover:!text-black"
                  variant="default"
                  onClick={() => navigate({ to: "/" })}
                >
                  Back to Markets
                </Button>
                <Button
                  className="rounded-xl border-2 !border-gray-800 !bg-indigo-100/90 !text-indigo-900 !shadow-lg hover:!bg-indigo-200/80 hover:!border-indigo-400"
                  variant="outline"
                  onClick={() => navigate({ to: "/profile" })}
                >
                  Profile
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

        <Card className="border-white/60 bg-white/65 shadow-lg backdrop-blur">
          <CardHeader>
            <CardTitle>Top Winners</CardTitle>
            <CardDescription>
              Users ranked by total winnings from resolved markets.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading leaderboard...</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-muted-foreground">No leaderboard data yet.</p>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  {leaderboard.slice(0, 5).map((entry, index) => {
                    const rank = index + 1;
                    return (
                      <div
                        key={entry.username}
                        className="flex items-center justify-between rounded-3xl border border-border bg-background px-6 py-5 shadow-lg shadow-blue-100"
                      >
                        <div>
                          <p className="text-2xl font-semibold md:text-3xl">
                            #{rank} {entry.username}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total winnings
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary md:text-3xl">
                            ${entry.totalWinnings.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {leaderboard.length > 5 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      Top 6–15
                    </h2>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      {leaderboard.slice(5, 15).map((entry, index) => {
                        const rank = index + 6;
                        return (
                          <div
                            key={entry.username}
                            className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-4 shadow-sm shadow-slate-100"
                          >
                            <div>
                              <p className="text-lg font-semibold">
                                #{rank} {entry.username}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Total winnings
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary">
                                ${entry.totalWinnings.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {leaderboard.length > 15 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      Top 16+
                    </h2>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {leaderboard.slice(15).map((entry, index) => {
                        const rank = index + 16;
                        return (
                          <div
                            key={entry.username}
                            className="rounded-2xl border border-border bg-background px-4 py-4 shadow-sm shadow-slate-100"
                          >
                            <p className="truncate text-sm font-semibold">
                              #{rank} {entry.username}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Total winnings
                            </p>
                            <p className="mt-1 text-base font-bold text-primary">
                              ${entry.totalWinnings.toFixed(2)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
});