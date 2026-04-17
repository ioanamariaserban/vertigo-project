import { Elysia, t } from "elysia";
import { handleGetLeaderboard } from "./handlers";

export const leaderboardRoutes = new Elysia({ prefix: "/api/leaderboard" })
  .get("/", handleGetLeaderboard, {
    response: t.Object({
      leaderboard: t.Array(
        t.Object({
          username: t.String(),
          totalWinnings: t.Number(),
        }),
      ),
    }),
  });
