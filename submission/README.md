# Submission

## Short Description

A full-stack prediction market web application where users can create markets, place bets, track live odds, monitor their balance, and compete on a leaderboard.

The frontend is built with **React**, **TanStack Router**, **Tailwind CSS**, and **shadcn/ui**, while the backend uses **Bun**, **Elysia.js**, **SQLite**, and **Drizzle ORM**.

The application supports **real-time updates** through **Server-Sent Events (SSE)** and includes an **admin workflow** for resolving or archiving markets.

**Bonus feature implemented:** users can generate and use **API keys** for programmatic access to market operations.

---

## Features Implemented

### Core Features

- ✅ User registration and login with JWT authentication
- ✅ Main dashboard with:
  - market listing
  - filtering by status (`active`, `resolved`, `archived`, `all`)
  - sorting by:
    - creation date
    - total bet size
    - number of participants
  - pagination
  - title search
- ✅ Market creation with multiple outcomes
- ✅ Market detail page with:
  - live odds per outcome
  - pie chart for bet distribution
  - outcome selection and bet placement
  - positive amount validation
- ✅ User profile page with:
  - active bets
  - resolved bets
  - separate pagination for both sections
  - leaderboard rank display
  - current balance display
- ✅ Leaderboard ranked by total winnings
- ✅ Admin role system
- ✅ Admin market resolution with winning outcome selection
- ✅ Admin market archiving with bettor refunds
- ✅ Payout distribution proportional to winners’ stake
- ✅ User balance tracking:
  - initial balance
  - deduction on bet placement
  - winnings/refunds on market resolution/archive
- ✅ Real-time odds and market updates through SSE

### Bonus Feature

- ✅ API key generation from the profile page
- ✅ API key authentication using `Authorization: ApiKey YOUR_KEY`
- ✅ Shared backend endpoints for both frontend and programmatic API usage
- ✅ API support for:
  - create markets
  - list markets
  - place bets
  - view outcomes

---

## Images or Video Demo

<video width="420" height="315" controls
src="./Demo_Market_v2.mp4">
</video>

---

## Design Choices

### Architecture

- **Monorepo structure** with separate `client` and `server` directories
- **REST API** with consistent validation and error handling
- **Real-time updates** through **Server-Sent Events**
- **SQLite + Drizzle ORM** for lightweight persistence and type-safe queries
- **Shared business logic** between UI usage and API usage

### Frontend

- **React 19** with **TanStack Router** for file-based routing
- **Tailwind CSS** and **shadcn/ui** for reusable UI components
- Responsive layouts for:
  - dashboard
  - market details
  - profile
  - leaderboard
  - auth pages
- Improved UI/UX with:
  - pastel gradient backgrounds
  - polished headers/cards
  - clearer action hierarchy
  - search bar on dashboard
  - password visibility toggle on auth forms
  - better pagination controls
  - clearer market status indicators

### Backend

- **Bun** runtime with **Elysia.js**
- **Drizzle ORM** with SQLite
- Type-safe request validation
- Auth middleware supporting:
  - JWT authentication
  - API key authentication
- SSE endpoint for live market updates

### Authentication

- **JWT** for standard user sessions
- **API keys** for bot/programmatic access
- Shared auth flow in middleware so the same endpoints can be reused consistently

### Market Lifecycle

Each market can be in one of the following states:

- `active` — open for betting
- `resolved` — winning outcome selected and payouts distributed
- `archived` — market closed without a winning outcome, all bettors refunded

This separation keeps the admin flow explicit and matches the intended product behavior.

---

## Challenges Faced

1. **Real-time updates**  
   Implementing live odds and market refreshes with SSE required careful frontend state updates and backend broadcasting.

2. **Sorting and pagination**  
   Supporting sorting by computed values such as total bets and participant count required enriching market data before pagination.

3. **Market lifecycle handling**  
   Separating `resolved` and `archived` flows required different payout behaviors:
   - winners paid proportionally for resolved markets
   - full refunds for archived markets

4. **Consistent UX across pages**  
   The dashboard, profile, leaderboard, auth pages, and market detail page were progressively redesigned to feel like one coherent product rather than separate screens.

5. **Search integration**  
   Search had to work together with filtering, sorting, pagination, and real-time updates without breaking the user experience.

6. **Dual authentication modes**  
   Supporting both JWT and API key authentication while keeping endpoint behavior consistent required middleware changes and careful request handling.

---

## How to Run

```bash
# Start backend
cd server
bun run dev

# Start frontend (in another terminal)
cd client
bun run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4001