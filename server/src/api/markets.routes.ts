  import { Elysia, t } from "elysia";
  import { authMiddleware } from "../middleware/auth.middleware";
  import {
    handleCreateMarket,
    handleListMarkets,
    handleGetMarket,
    handlePlaceBet,
    handleResolveMarket,
    handleArchiveMarket,
    handleMarketEvents,
  } from "./handlers";

  export const marketRoutes = new Elysia({ prefix: "/api/markets" })
    .use(authMiddleware)
    .get("/", handleListMarkets, {
      query: t.Object({
        status: t.Optional(t.String()),
        search: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
        page: t.Optional(t.Numeric()),
        limit: t.Optional(t.Numeric()),
      }),
    })
    .get("/events", handleMarketEvents)
    .get("/:id", handleGetMarket, {
      params: t.Object({
        id: t.Numeric(),
      }),
    })
    .guard(
      {
        beforeHandle({ user, set }) {
          if (!user) {
            set.status = 401;
            return { error: "Unauthorized" };
          }
        },
      },
      (app) =>
        app
          .post("/", handleCreateMarket, {
            body: t.Object({
              title: t.String(),
              description: t.Optional(t.String()),
              outcomes: t.Array(t.String()),
            }),
          })
          .post("/:id/bets", handlePlaceBet, {
            params: t.Object({
              id: t.Numeric(),
            }),
            body: t.Object({
              outcomeId: t.Number(),
              amount: t.Number(),
            }),
          })
          .post("/:id/resolve", handleResolveMarket, {
            params: t.Object({
              id: t.Numeric(),
            }),
            body: t.Object({
              resolvedOutcomeId: t.Number(),
            }),
          })
          .post("/:id/archive", handleArchiveMarket, {
            params: t.Object({
              id: t.Numeric(),
            }),
          })
    );
