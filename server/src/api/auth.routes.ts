import { Elysia, t } from "elysia";
import { handleRegister, handleLogin, handleGetCurrentUser } from "./handlers";
import { authMiddleware } from "../middleware/auth.middleware";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .post("/register", handleRegister, {
    body: t.Object({
      username: t.String(),
      email: t.String(),
      password: t.String(),
    }),
  })
  .post("/login", handleLogin, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
  })
  .use(authMiddleware)
  .get("/me", handleGetCurrentUser);
