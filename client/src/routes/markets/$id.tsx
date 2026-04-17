import { useEffect, useState } from "react";
import { useParams, useNavigate, createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api, Market } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function MarketDetailPage() {
  const { id } = useParams({ from: "/markets/$id" });
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [betError, setBetError] = useState<string | null>(null);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<number | null>(null);
  const [resolveOutcomeId, setResolveOutcomeId] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [isBetting, setIsBetting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const marketId = parseInt(id, 10);

  const chartData =
    market?.outcomes.map((outcome) => ({
      name: outcome.title,
      value: outcome.totalBets,
      percentage:
        market.totalMarketBets > 0
          ? Number(((outcome.totalBets / market.totalMarketBets) * 100).toFixed(1))
          : 0,
    })) || [];

  const chartColors = [
    "#ec4899",
    "#8b5cf6",
    "#06b6d4",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
  ];

  useEffect(() => {
    const loadMarket = async () => {
      try {
        setIsLoading(true);
        const data = await api.getMarket(marketId);
        setMarket(data);
        if (data.outcomes.length > 0) {
          setSelectedOutcomeId(data.outcomes[0].id);
          setResolveOutcomeId(data.outcomes[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load market details");
      } finally {
        setIsLoading(false);
      }
    };

    loadMarket();
  }, [marketId]);

  // Connect to SSE for real-time updates
  useEffect(() => {
    if (isAuthenticated) {
      const es = new EventSource(`${import.meta.env.VITE_API_URL || "http://localhost:4001"}/api/markets/events`);
      setEventSource(es);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "marketUpdate" && data.market.id === marketId) {
            // Update market data in real-time
            setMarket(data.market);
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
    }
  }, [isAuthenticated, marketId]);

  const handleResolveMarket = async () => {
    if (!resolveOutcomeId) {
      setError("Please select a winning outcome before resolving the market.");
      return;
    }

    try {
      setIsResolving(true);
      setError(null);
      await api.resolveMarket(marketId, resolveOutcomeId);
      setError(null);
      // Market will be updated automatically via SSE
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve market");
    } finally {
      setIsResolving(false);
    }
  };

  const handleArchiveMarket = async () => {
    try {
      setIsArchiving(true);
      setError(null);
      await api.archiveMarket(marketId);
      setError(null);
      // Market will be updated automatically via SSE
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive market");
    } finally {
      setIsArchiving(false);
    }
  };

  const handlePlaceBet = async () => {
    setBetError(null);
    if (!selectedOutcomeId || !betAmount) {
      setBetError("Please select an outcome and enter a bet amount");
      return;
    }

    const amount = parseFloat(betAmount);
    if (amount <= 0) {
      setBetError("Bet amount must be a positive number");
      return;
    }

    if (user && amount > user.balance) {
      setBetError("Bet amount cannot exceed your available balance");
      return;
    }

    try {
      setIsBetting(true);
      await api.placeBet(marketId, selectedOutcomeId, amount);
      setBetAmount("");
      setBetError(null);
      // Market will be updated automatically via SSE
    } catch (err) {
      setBetError(err instanceof Error ? err.message : "Failed to place bet");
    } finally {
      setIsBetting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-muted-foreground">Please log in to view this market</p>
            <Button onClick={() => navigate({ to: "/auth/login" })}>Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading market...</p>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-destructive">Market not found</p>
            <Button onClick={() => navigate({ to: "/" })}>Back to Markets</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        {/* Header */}
        <Button className="rounded-xl border-2 !border-gray-800 !bg-indigo-100/90 !text-indigo-900 !shadow-lg hover:!bg-indigo-200/80 hover:!border-indigo-400" variant="outline" onClick={() => navigate({ to: "/" })}>
          ← Back
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-4xl">{market.title}</CardTitle>
                {market.description && (
                  <CardDescription className="text-lg mt-2">{market.description}</CardDescription>
                )}
              </div>
              <Badge
                className={
                  market.status === "active"
                    ? "!bg-green-300 !text-black rounded-xl"
                    : market.status === "archived"
                    ? "!bg-red-400 !text-white rounded-xl"
                    : "rounded-xl"
                }
                variant={market.status === "active" ? "default" : "secondary"}
              >
                {market.status === "active"
                  ? "Active"
                  : market.status === "resolved"
                  ? "Resolved"
                  : "Archived"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Admin Resolve Section */}
            {isAdmin && market.status === "active" && (
              <Card className="bg-red-50 border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-800">Admin Controls</CardTitle>
                  <CardDescription className="text-red-600">
                    Resolve this market by selecting a winning outcome, or archive it to refund all bettors.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Winning Outcome</Label>
                    <select
                      value={resolveOutcomeId || ""}
                      onChange={(e) => setResolveOutcomeId(parseInt(e.target.value, 10))}
                      className="w-full p-3 bg-white border border-secondary rounded-md"
                      disabled={isResolving}
                    >
                      {market.outcomes.map((outcome) => (
                        <option key={outcome.id} value={outcome.id}>
                          {outcome.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                    <Button
                      className="w-full md:w-1/2 rounded-xl text-lg bg-red-600 hover:bg-red-700 text-white py-6"
                      onClick={handleResolveMarket}
                      disabled={isResolving || isArchiving || !resolveOutcomeId}
                    >
                      {isResolving ? "Resolving..." : "Resolve Market"}
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full md:w-1/2 rounded-xl text-lg py-6 border-orange-500 text-orange-700 hover:bg-orange-50"
                      onClick={handleArchiveMarket}
                      disabled={isResolving || isArchiving}
                    >
                      {isArchiving ? "Archiving..." : "Archive Market"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {market.status === "resolved" && (
              <div className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-4">
                <p className="text-indigo-900 font-semibold">
                  This market has been resolved.
                </p>
                <p className="text-indigo-700 text-sm mt-1">
                  A winning outcome has been selected and payouts have been distributed.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {market.status === "archived" && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-4">
                <p className="text-red-700 font-semibold">
                  This market has been archived.
                </p>
                <p className="text-red-600 text-sm mt-1">
                  All bettors have been refunded and no winning outcome was selected.
                </p>
              </div>
            )}

            <Card className="bg-secondary/5">
              <CardHeader>
                <CardTitle>Bet Distribution</CardTitle>
                <CardDescription>
                  Percentage of total bets placed on each outcome
                </CardDescription>
              </CardHeader>
              <CardContent>
                {market.totalMarketBets > 0 ? (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                        >
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={chartColors[index % chartColors.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`$${value.toFixed(2)}`, "Total Bets"]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No bets have been placed yet, so there is no distribution to display.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Outcomes and Distribution */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Outcomes</h3>
              {market.outcomes.map((outcome) => {
                const percentage = market.totalMarketBets > 0
                  ? (outcome.totalBets / market.totalMarketBets) * 100
                  : 0;
                return (
                  <div
                    key={outcome.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedOutcomeId === outcome.id
                        ? "border-primary bg-primary/5"
                        : "border-secondary bg-secondary/5 hover:border-primary/50"
                    }`}
                    onClick={() => market.status === "active" && setSelectedOutcomeId(outcome.id)}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold">{outcome.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Total bets: ${outcome.totalBets.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-primary">{outcome.odds}%</p>
                          <p className="text-xs text-muted-foreground">odds</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Market Stats */}
            <div className="rounded-lg p-6 border border-primary/20 bg-primary/5">
              <p className="text-sm text-muted-foreground mb-1">Total Market Value</p>
              <p className="text-4xl font-bold text-primary">
                ${market.totalMarketBets.toFixed(2)}
              </p>
            </div>

            {/* Betting Section */}
            {market.status === "active" && (
              <Card className="bg-secondary/5">
                <CardHeader>
                  <CardTitle>Place Your Bet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Selected Outcome</Label>
                    <div className="p-3 bg-white border border-secondary rounded-md">
                      {market.outcomes.find((o) => o.id === selectedOutcomeId)?.title ||
                        "None selected"}
                    </div>
                  </div>

                  <div className="space-y-2 ">
                    <Label htmlFor="betAmount">Bet Amount ($)</Label>
                    <Input
                      id="betAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={user?.balance ?? undefined}
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="Enter amount"
                      disabled={isBetting}
                    />
                    <p className="text-sm text-muted-foreground">
                      Available balance: ${user?.balance.toFixed(2)}. You can bet up to ${user?.balance.toFixed(2)}.
                    </p>
                  </div>

                  <div className="flex flex-col items-center">
                    <Button
                      className="w-1/2 rounded-xl text-lg! border-2 !border-gray-800 !bg-indigo-100/90 !text-indigo-900 !shadow-lg hover:!bg-indigo-200/80 hover:!border-indigo-400 py-6"
                      onClick={handlePlaceBet}
                      disabled={isBetting || !selectedOutcomeId || !betAmount}
                    >
                      {isBetting ? "Placing bet..." : "Place Bet"}
                    </Button>
                    {betError && (
                      <p className="mt-3 text-sm text-destructive text-center">
                        {betError}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/markets/$id")({
  component: MarketDetailPage,
});
