import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authRoutes } from "./src/api/auth.routes";
import { marketRoutes } from "./src/api/markets.routes";
import { jwtPlugin } from "./src/plugins/jwt";
import { wsManager } from "./src/lib/websocket";

const PORT = Number(process.env.PORT || 4001);
const HOST = process.env.HOST || "0.0.0.0";

export const app = new Elysia()
  .use(
    cors({
      origin: "*",
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )
  .use(jwtPlugin)
  .onError(({ code, set }) => {
    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Not found" };
    }
    if (code === "VALIDATION") {
      set.status = 400;
      return { error: "Invalid request" };
    }
  })
  .use(authRoutes)
  .use(marketRoutes)
  .ws("/ws", {
    open(ws) {
      wsManager.addClient(ws);
      console.log(`WebSocket client connected. Total clients: ${wsManager.getClientCount()}`);
    },
    close(ws) {
      wsManager.removeClient(ws);
      console.log(`WebSocket client disconnected. Total clients: ${wsManager.getClientCount()}`);
    },
    message(ws, message) {
      // Handle ping/pong for keep-alive
      if (message === "ping") {
        ws.send("pong");
      }
    },
  });

if (import.meta.main) {
  app.listen({
    port: PORT,
    hostname: HOST,
  });
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log(`WebSocket available at ws://${HOST}:${PORT}/ws`);
}
