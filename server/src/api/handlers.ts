import { eq, and, desc, asc, innerJoin, sql } from "drizzle-orm";
import db from "../db";
import { usersTable, marketsTable, marketOutcomesTable, betsTable } from "../db/schema";
import { hashPassword, verifyPassword, type AuthTokenPayload } from "../lib/auth";
import { calculateUserWinnings } from "../lib/odds";
import {
  validateRegistration,
  validateLogin,
  validateMarketCreation,
  validateBet,
} from "../lib/validation";

type JwtSigner = {
  sign: (payload: AuthTokenPayload) => Promise<string>;
};

// Global set to keep track of SSE connections
const sseConnections = new Set<{
  id: string;
  controller: ReadableStreamDefaultController;
}>();

// Function to broadcast market updates
async function broadcastMarketUpdate(marketId: number) {
  try {
    // Get updated market data
    const market = await db.query.marketsTable.findFirst({
      where: eq(marketsTable.id, marketId),
      with: {
        creator: { columns: { username: true } },
        outcomes: { orderBy: (outcomes, { asc }) => asc(outcomes.position) },
      },
    });

    if (!market) return;

    const betsPerOutcome = await Promise.all(
      market.outcomes.map(async (outcome) => {
        const totalBets = await db
          .select({ amount: betsTable.amount })
          .from(betsTable)
          .where(eq(betsTable.outcomeId, outcome.id));
        const totalAmount = totalBets.reduce((sum, bet) => sum + bet.amount, 0);
        return { outcomeId: outcome.id, totalBets: totalAmount };
      }),
    );

    const totalMarketBets = betsPerOutcome.reduce((sum, b) => sum + b.totalBets, 0);
    const participantCount = await db
      .select({ userId: betsTable.userId })
      .from(betsTable)
      .where(eq(betsTable.marketId, marketId))
      .then(bets => new Set(bets.map(b => b.userId)).size);

    const updatedMarket = {
      id: market.id,
      title: market.title,
      status: market.status,
      creator: market.creator?.username,
      totalMarketBets,
      participantCount,
      outcomes: market.outcomes.map((outcome) => {
        const outcomeBets = betsPerOutcome.find((b) => b.outcomeId === outcome.id)?.totalBets || 0;
        const odds = totalMarketBets > 0 ? Number(((outcomeBets / totalMarketBets) * 100).toFixed(2)) : 0;
        return {
          id: outcome.id,
          title: outcome.title,
          odds,
          totalBets: outcomeBets,
        };
      }),
    };

    // Broadcast to all SSE connections
    const encoder = new TextEncoder();
    const data = `data: ${JSON.stringify({ type: "marketUpdate", market: updatedMarket })}\n\n`;

    sseConnections.forEach((conn) => {
      try {
        conn.controller.enqueue(encoder.encode(data));
      } catch (error) {
        // Connection might be closed, remove it
        sseConnections.delete(conn);
      }
    });
  } catch (error) {
    console.error("Error broadcasting market update:", error);
  }
}

export async function handleMarketEvents({ request, set }: { request: Request; set: any }) {
  const stream = new ReadableStream({
    start(controller) {
      const connectionId = Math.random().toString(36).substring(7);
      sseConnections.add({ id: connectionId, controller });

      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode("data: connected\n\n"));

      // Clean up on disconnect
      request.signal.addEventListener("abort", () => {
        sseConnections.forEach((conn) => {
          if (conn.id === connectionId) {
            sseConnections.delete(conn);
          }
        });
      });
    },
  });

  set.headers["Content-Type"] = "text/event-stream";
  set.headers["Cache-Control"] = "no-cache";
  set.headers["Connection"] = "keep-alive";

  return new Response(stream);
}

export async function handleRegister({
  body,
  jwt,
  set,
}: {
  body: { username: string; email: string; password: string };
  jwt: JwtSigner;
  set: { status: number };
}) {
  const { username, email, password } = body;
  const errors = validateRegistration(username, email, password);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  const existingUser = await db.query.usersTable.findFirst({
    where: (users, { or, eq }) => or(eq(users.email, email), eq(users.username, username)),
  });

  if (existingUser) {
    set.status = 409;
    return { errors: [{ field: "email", message: "User already exists" }] };
  }

  const passwordHash = await hashPassword(password);

  const newUser = await db
    .insert(usersTable)
    .values({ username, email, passwordHash, role: "user" })
    .returning();

  const token = await jwt.sign({ userId: newUser[0].id });

  set.status = 201;
  return {
    id: newUser[0].id,
    username: newUser[0].username,
    email: newUser[0].email,
    role: newUser[0].role,
    balance: newUser[0].balance,
    token,
  };
}

export async function handleLogin({
  body,
  jwt,
  set,
}: {
  body: { email: string; password: string };
  jwt: JwtSigner;
  set: { status: number };
}) {
  const { email, password } = body;
  const errors = validateLogin(email, password);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    set.status = 401;
    return { error: "Invalid email or password" };
  }

  const token = await jwt.sign({ userId: user.id });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    balance: user.balance,
    token,
  };
}

export async function handleGetCurrentUser({ user, set }: { user: typeof usersTable.$inferSelect; set: { status: number } }) {
  if (!user) {
    set.status = 401;
    return { error: "Unauthorized" };
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    balance: user.balance,
  };
}

export async function handleCreateMarket({
  body,
  set,
  user,
}: {
  body: { title: string; description?: string; outcomes: string[] };
  set: { status: number };
  user: typeof usersTable.$inferSelect;
}) {
  const { title, description, outcomes } = body;
  const errors = validateMarketCreation(title, description || "", outcomes);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  const market = await db
    .insert(marketsTable)
    .values({
      title,
      description: description || null,
      createdBy: user.id,
    })
    .returning();

  const outcomeIds = await db
    .insert(marketOutcomesTable)
    .values(
      outcomes.map((title: string, index: number) => ({
        marketId: market[0].id,
        title,
        position: index,
      })),
    )
    .returning();

  set.status = 201;
  return {
    id: market[0].id,
    title: market[0].title,
    description: market[0].description,
    status: market[0].status,
    outcomes: outcomeIds,
  };
}

export async function handleListMarkets({
  query,
}: {
  query: {
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    page?: number;
    limit?: number;
  };
}) {
  const statusFilter = query.status || "active";
  const search = query.search?.trim().toLowerCase() || "";
  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder || "desc";
  const page = query.page || 1;
  const limit = query.limit || 20;
  const offset = (page - 1) * limit;

  // Get all markets with outcomes (since we need to sort by calculated fields)
  const whereCondition = statusFilter === "all" ? undefined : eq(marketsTable.status, statusFilter);
  
  const allMarkets = await db.query.marketsTable.findMany({
    where: whereCondition,
    with: {
      creator: {
        columns: { username: true },
      },
      outcomes: {
        orderBy: (outcomes, { asc }) => asc(outcomes.position),
      },
    },
  });

  const filteredMarketsBySearch = search
    ? allMarkets.filter((market) =>
        market.title.toLowerCase().includes(search)
      )
    : allMarkets;

  // Enrich with bets data
  const enrichedMarkets = await Promise.all(
    filteredMarketsBySearch.map(async (market) => {
      const betsPerOutcome = await Promise.all(
        market.outcomes.map(async (outcome) => {
          const totalBets = await db
            .select({ amount: betsTable.amount })
            .from(betsTable)
            .where(eq(betsTable.outcomeId, outcome.id));

          const totalAmount = totalBets.reduce((sum, bet) => sum + bet.amount, 0);
          return { outcomeId: outcome.id, totalBets: totalAmount };
        }),
      );

      const totalMarketBets = betsPerOutcome.reduce((sum, b) => sum + b.totalBets, 0);

      // Get participant count
      const participantCount = await db
        .select({ userId: betsTable.userId })
        .from(betsTable)
        .where(eq(betsTable.marketId, market.id))
        .then(bets => new Set(bets.map(b => b.userId)).size);

      return {
        id: market.id,
        title: market.title,
        status: market.status,
        creator: market.creator?.username,
        createdAt: market.createdAt,
        totalMarketBets,
        participantCount,
        outcomes: market.outcomes.map((outcome) => {
          const outcomeBets =
            betsPerOutcome.find((b) => b.outcomeId === outcome.id)?.totalBets || 0;
          const odds =
            totalMarketBets > 0 ? Number(((outcomeBets / totalMarketBets) * 100).toFixed(2)) : 0;

          return {
            id: outcome.id,
            title: outcome.title,
            odds,
            totalBets: outcomeBets,
          };
        }),
      };
    }),
  );

  // Sort the enriched markets
  if (sortBy === "totalBets") {
    enrichedMarkets.sort((a, b) =>
      sortOrder === "desc"
        ? b.totalMarketBets - a.totalMarketBets
        : a.totalMarketBets - b.totalMarketBets
    );
  } else if (sortBy === "participants") {
    enrichedMarkets.sort((a, b) =>
      sortOrder === "desc"
        ? b.participantCount - a.participantCount
        : a.participantCount - b.participantCount
    );
  } else if (sortBy === "createdAt") {
    enrichedMarkets.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();

      return sortOrder === "desc" ? bTime - aTime : aTime - bTime;
    });
  }

  // Paginate
  const totalCount = enrichedMarkets.length;
  const totalPages = Math.ceil(totalCount / limit);
  const paginatedMarkets = enrichedMarkets.slice(offset, offset + limit);

  return {
    markets: paginatedMarkets,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
    },
  };
}

export async function handleArchiveMarket({
  params,
  set,
  user,
}: {
  params: { id: number };
  set: { status: number };
  user: typeof usersTable.$inferSelect;
}) {
  if (user.role !== "admin") {
    set.status = 403;
    return { error: "Forbidden" };
  }

  const marketId = params.id;

  const market = await db.query.marketsTable.findFirst({
    where: eq(marketsTable.id, marketId),
  });

  if (!market) {
    set.status = 404;
    return { error: "Market not found" };
  }

  if (market.status !== "active") {
    set.status = 400;
    return { error: "Only active markets can be archived" };
  }

  const allBets = await db.query.betsTable.findMany({
    where: eq(betsTable.marketId, marketId),
  });

  for (const bet of allBets) {
    await db
      .update(usersTable)
      .set({ balance: sql`${usersTable.balance} + ${bet.amount}` })
      .where(eq(usersTable.id, bet.userId));
  }

  await db
    .update(marketsTable)
    .set({ status: "archived" })
    .where(eq(marketsTable.id, marketId));

  await broadcastMarketUpdate(marketId);

  return {
    success: true,
    marketId,
    status: "archived",
    refundedBets: allBets.length,
  };
}

export async function handleGetLeaderboard() {
  const resolvedBets = await db
    .select({
      amount: betsTable.amount,
      userId: betsTable.userId,
      outcomeId: betsTable.outcomeId,
      marketId: betsTable.marketId,
      username: usersTable.username,
      resolvedOutcomeId: marketsTable.resolvedOutcomeId,
    })
    .from(betsTable)
    .innerJoin(usersTable, eq(betsTable.userId, usersTable.id))
    .innerJoin(marketsTable, eq(betsTable.marketId, marketsTable.id))
    .where(eq(marketsTable.status, "resolved"));

  const totalMarketBetsMap = new Map<number, number>();
  const winningOutcomeBetsMap = new Map<number, number>();

  for (const bet of resolvedBets) {
    totalMarketBetsMap.set(bet.marketId, (totalMarketBetsMap.get(bet.marketId) ?? 0) + bet.amount);
    if (bet.resolvedOutcomeId === bet.outcomeId) {
      winningOutcomeBetsMap.set(bet.marketId, (winningOutcomeBetsMap.get(bet.marketId) ?? 0) + bet.amount);
    }
  }

  const userWinnings = new Map<number, { username: string; totalWinnings: number }>();

  for (const bet of resolvedBets) {
    if (bet.resolvedOutcomeId !== bet.outcomeId) continue;

    const totalMarketBets = totalMarketBetsMap.get(bet.marketId) ?? 0;
    const winningOutcomeBets = winningOutcomeBetsMap.get(bet.marketId) ?? 0;
    if (winningOutcomeBets === 0) continue;

    const winnings = calculateUserWinnings(bet.amount, winningOutcomeBets, totalMarketBets);
    const existing = userWinnings.get(bet.userId) ?? { username: bet.username, totalWinnings: 0 };
    existing.totalWinnings += winnings;
    userWinnings.set(bet.userId, existing);
  }

  const leaderboard = Array.from(userWinnings.values()).sort((a, b) => b.totalWinnings - a.totalWinnings);

  return { leaderboard };
}

export async function handleGetMarket({
  params,
  set,
}: {
  params: { id: number };
  set: { status: number };
}) {
  const market = await db.query.marketsTable.findFirst({
    where: eq(marketsTable.id, params.id),
    with: {
      creator: {
        columns: { username: true },
      },
      outcomes: {
        orderBy: (outcomes, { asc }) => asc(outcomes.position),
      },
    },
  });

  if (!market) {
    set.status = 404;
    return { error: "Market not found" };
  }

  const betsPerOutcome = await Promise.all(
    market.outcomes.map(async (outcome) => {
      const totalBets = await db
        .select()
        .from(betsTable)
        .where(eq(betsTable.outcomeId, outcome.id));

      const totalAmount = totalBets.reduce((sum, bet) => sum + bet.amount, 0);
      return { outcomeId: outcome.id, totalBets: totalAmount };
    }),
  );

  const totalMarketBets = betsPerOutcome.reduce((sum, b) => sum + b.totalBets, 0);

  return {
    id: market.id,
    title: market.title,
    description: market.description,
    status: market.status,
    creator: market.creator?.username,
    outcomes: market.outcomes.map((outcome) => {
      const outcomeBets = betsPerOutcome.find((b) => b.outcomeId === outcome.id)?.totalBets || 0;
      const odds =
        totalMarketBets > 0 ? Number(((outcomeBets / totalMarketBets) * 100).toFixed(2)) : 0;

      return {
        id: outcome.id,
        title: outcome.title,
        odds,
        totalBets: outcomeBets,
      };
    }),
    totalMarketBets,
    resolvedOutcomeId: market.resolvedOutcomeId,
  };
}

export async function handlePlaceBet({
  params,
  body,
  set,
  user,
}: {
  params: { id: number };
  body: { outcomeId: number; amount: number };
  set: { status: number };
  user: typeof usersTable.$inferSelect;
}) {
  const marketId = params.id;
  const { outcomeId, amount } = body;
  const errors = validateBet(amount);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  const market = await db.query.marketsTable.findFirst({
    where: eq(marketsTable.id, marketId),
  });

  if (!market) {
    set.status = 404;
    return { error: "Market not found" };
  }

  if (market.status !== "active") {
    set.status = 400;
    return { error: "Market is not active" };
  }

  const outcome = await db.query.marketOutcomesTable.findFirst({
    where: and(eq(marketOutcomesTable.id, outcomeId), eq(marketOutcomesTable.marketId, marketId)),
  });

  if (!outcome) {
    set.status = 404;
    return { error: "Outcome not found" };
  }

  if (user.balance < amount) {
    set.status = 400;
    return { error: "Insufficient balance" };
  }

  const bet = await db
    .insert(betsTable)
    .values({
      userId: user.id,
      marketId,
      outcomeId,
      amount: Number(amount),
    })
    .returning();

  // Deduct from user balance
  await db
    .update(usersTable)
    .set({ balance: user.balance - amount })
    .where(eq(usersTable.id, user.id));

  // Broadcast update to all connected clients
  broadcastMarketUpdate(marketId);

  set.status = 201;
  return {
    id: bet[0].id,
    userId: bet[0].userId,
    marketId: bet[0].marketId,
    outcomeId: bet[0].outcomeId,
    amount: bet[0].amount,
  };
}

export async function handleResolveMarket({
  params,
  body,
  set,
  user,
}: {
  params: { id: number };
  body: { resolvedOutcomeId: number };
  set: { status: number };
  user: typeof usersTable.$inferSelect;
}) {
  if (user.role !== "admin") {
    set.status = 403;
    return { error: "Forbidden" };
  }

  const marketId = params.id;
  const market = await db.query.marketsTable.findFirst({
    where: eq(marketsTable.id, marketId),
  });

  if (!market) {
    set.status = 404;
    return { error: "Market not found" };
  }

  if (market.status !== "active") {
    set.status = 400;
    return { error: "Market is not active" };
  }

  const outcome = await db.query.marketOutcomesTable.findFirst({
    where: and(
      eq(marketOutcomesTable.id, body.resolvedOutcomeId),
      eq(marketOutcomesTable.marketId, marketId),
    ),
  });

  if (!outcome) {
    set.status = 404;
    return { error: "Outcome not found" };
  }

  await db
    .update(marketsTable)
    .set({ status: "resolved", resolvedOutcomeId: outcome.id })
    .where(eq(marketsTable.id, marketId));

  // Calculate and distribute payouts
  const allBets = await db.query.betsTable.findMany({
    where: eq(betsTable.marketId, marketId),
  });

  const totalPool = allBets.reduce((sum, bet) => sum + bet.amount, 0);
  const winningBets = allBets.filter((bet) => bet.outcomeId === outcome.id);
  const totalWinningBets = winningBets.reduce((sum, bet) => sum + bet.amount, 0);

  if (totalPool > 0) {
    if (totalWinningBets > 0) {
      for (const bet of winningBets) {
        const winnings = (bet.amount / totalWinningBets) * totalPool;
        await db
          .update(usersTable)
          .set({ balance: sql`${usersTable.balance} + ${winnings}` })
          .where(eq(usersTable.id, bet.userId));
      }
    } else {
      // If no bets matched the winning outcome, refund all bettors.
      for (const bet of allBets) {
        await db
          .update(usersTable)
          .set({ balance: sql`${usersTable.balance} + ${bet.amount}` })
          .where(eq(usersTable.id, bet.userId));
      }
    }
  }

  await broadcastMarketUpdate(marketId);

  return {
    success: true,
    marketId,
    resolvedOutcomeId: outcome.id,
  };
}

export async function handleGetUserBets({
  query,
  user,
}: {
  query: { type: "active" | "resolved"; page?: number; limit?: number };
  user: typeof usersTable.$inferSelect;
}) {
  const type = query.type;
  const page = query.page || 1;
  const limit = query.limit || 20;
  const offset = (page - 1) * limit;

  // Get user's bets with market and outcome information
  const userBets = await db.query.betsTable.findMany({
    where: eq(betsTable.userId, user.id),
    with: {
      market: {
        with: {
          outcomes: true,
        },
      },
      outcome: true,
    },
    orderBy: desc(betsTable.createdAt),
  });

  // Filter by market status
  const filteredBets = userBets.filter(bet => bet.market.status === type);

  // Enrich with current odds for active bets
  const enrichedBets = await Promise.all(
    filteredBets.map(async (bet) => {
      let currentOdds = 0;
      if (type === "active") {
        // Calculate current odds for active markets
        const betsPerOutcome = await Promise.all(
          bet.market.outcomes.map(async (outcome) => {
            const totalBets = await db
              .select({ amount: betsTable.amount })
              .from(betsTable)
              .where(eq(betsTable.outcomeId, outcome.id));
            const totalAmount = totalBets.reduce((sum, bet) => sum + bet.amount, 0);
            return { outcomeId: outcome.id, totalBets: totalAmount };
          }),
        );

        const totalMarketBets = betsPerOutcome.reduce((sum, b) => sum + b.totalBets, 0);
        const userOutcomeBets = betsPerOutcome.find((b) => b.outcomeId === bet.outcomeId)?.totalBets || 0;
        currentOdds = totalMarketBets > 0 ? Number(((userOutcomeBets / totalMarketBets) * 100).toFixed(2)) : 0;
      }

      // Determine if user won for resolved markets
      let won = false;
      if (type === "resolved" && bet.market.resolvedOutcomeId) {
        won = bet.market.resolvedOutcomeId === bet.outcomeId;
      }

      return {
        id: bet.id,
        marketId: bet.marketId,
        marketTitle: bet.market.title,
        outcomeTitle: bet.outcome.title,
        amount: bet.amount,
        currentOdds: type === "active" ? currentOdds : undefined,
        won: type === "resolved" ? won : undefined,
        createdAt: bet.createdAt,
      };
    }),
  );

  // Paginate
  const totalCount = enrichedBets.length;
  const totalPages = Math.ceil(totalCount / limit);
  const paginatedBets = enrichedBets.slice(offset, offset + limit);

  return {
    bets: paginatedBets,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
    },
  };
}

