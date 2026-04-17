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
    <Card className="h-full rounded-2xl">
      <CardHeader>
        <div className="space-y-3">
          <div className="flex justify-end">
            <Badge
              className={`rounded-xl whitespace-nowrap ${
                market.status === "active"
                  ? "!bg-green-300 !text-black"
                  : market.status === "archived"
                  ? "!bg-red-400 !text-white"
                  : ""
              }`}
              variant="secondary"
            >
              {market.status === "active"
                ? "Active"
                : market.status === "resolved"
                ? "Resolved"
                : "Archived"}
            </Badge>
          </div>

          <div>
            <CardTitle className="text-xl leading-tight">
              {market.title}
            </CardTitle>
            <CardDescription className="mt-2">
              By: {market.creator || "Unknown"}
            </CardDescription>
            {market.createdAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Created: {new Date(market.createdAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-4">
        {/* Outcomes */}
        <div className="space-y-2 flex-1">
          {market.outcomes.map((outcome) => (
            <div
              key={outcome.id}
              className="flex items-center justify-between bg-secondary/20 p-3 rounded-md"
            >
              <div>
                <p className="text-sm font-medium">{outcome.title}</p>
                <p className="text-xs text-muted-foreground">
                  ${outcome.totalBets.toFixed(2)} total
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{outcome.odds}%</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-4">
          {/* Total Market Value */}
          <div className="p-3 rounded-md border border-primary/20 bg-primary/5">
            <p className="text-xs text-muted-foreground">Total Market Value</p>
            <p className="text-2xl font-bold text-primary">${market.totalMarketBets.toFixed(2)}</p>
          </div>

          {/* Action Button */}
          <div className="p-2 flex flex-col items-center">
            <Button 
              className="w-1/2 rounded-xl transition-all duration-300 !bg-black !text-white hover:!bg-indigo-400 hover:[transform:rotateY(20deg)]"
              onClick={() => navigate({ to: `/markets/${market.id}` })}
            >
              {market.status === "active" ? "Place Bet" : "View Results"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
