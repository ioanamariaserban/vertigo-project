import { ServerWebSocket } from "bun";

export interface MarketUpdate {
  type: "market_update";
  marketId: number;
  data: {
    outcomes: Array<{
      id: number;
      title: string;
      odds: number;
      totalBets: number;
    }>;
    totalMarketBets: number;
    participants: number;
  };
}

export interface NewBetNotification {
  type: "new_bet";
  marketId: number;
  outcomeId: number;
  amount: number;
}

export type WebSocketMessage = MarketUpdate | NewBetNotification;

class WebSocketManager {
  private clients: Set<ServerWebSocket<unknown>> = new Set();

  addClient(ws: ServerWebSocket<unknown>) {
    this.clients.add(ws);
  }

  removeClient(ws: ServerWebSocket<unknown>) {
    this.clients.delete(ws);
  }

  broadcast(message: WebSocketMessage) {
    const messageStr = JSON.stringify(message);
    for (const client of this.clients) {
      try {
        client.send(messageStr);
      } catch (error) {
        // Client might be disconnected, remove it
        this.clients.delete(client);
      }
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();
