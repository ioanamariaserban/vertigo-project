import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth.middleware";
import { handleGetUserBets } from "./handlers";

export const userRoutes = new Elysia({ prefix: "/api/user" })
  .use(authMiddleware)
  .get("/bets", handleGetUserBets, {
    query: t.Object({
      type: t.Union([t.Literal("active"), t.Literal("resolved")]),
      page: t.Optional(t.Numeric()),
      limit: t.Optional(t.Numeric()),
    }),
  })
  ;