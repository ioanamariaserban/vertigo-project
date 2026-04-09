import { Market } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "@tanstack/react-router";

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight line-clamp-2">{market.title}</CardTitle>
            <CardDescription className="mt-1">By: {market.creator || "Unknown"}</CardDescription>
          </div>
          <Badge
            variant={market.status === "active" ? "default" : "secondary"}
            className="shrink-0"
          >
            {market.status === "active" ? "Active" : "Resolved"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Outcomes */}
        <div className="space-y-2">
          {market.outcomes.map((outcome) => (
            <div
              key={outcome.id}
              className="flex items-center justify-between bg-slate-50 p-3 rounded-md border border-slate-100"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{outcome.title}</p>
                <p className="text-xs text-slate-500">
                  ${outcome.totalBets.toFixed(2)} total
                </p>
              </div>
              <div className="text-right ml-2">
                <p className="text-lg font-bold text-slate-900">{outcome.odds}%</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-md bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-500">Total Bets</p>
            <p className="text-xl font-bold text-slate-900">
              ${market.totalMarketBets.toFixed(2)}
            </p>
          </div>
          <div className="p-3 rounded-md bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-500">Participants</p>
            <p className="text-xl font-bold text-slate-900">
              {market.participants ?? 0}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <Button className="w-full" onClick={() => navigate({ to: `/markets/${market.id}` })}>
          {market.status === "active" ? "Place Bet" : "View Results"}
        </Button>
      </CardContent>
    </Card>
  );
}
