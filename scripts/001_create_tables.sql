-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Markets table
CREATE TABLE IF NOT EXISTS markets (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_outcome_id INTEGER
);

-- Market outcomes table
CREATE TABLE IF NOT EXISTS market_outcomes (
  id SERIAL PRIMARY KEY,
  market_id INTEGER NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL
);

-- Bets table
CREATE TABLE IF NOT EXISTS bets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  market_id INTEGER NOT NULL REFERENCES markets(id),
  outcome_id INTEGER NOT NULL REFERENCES market_outcomes(id),
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for resolved_outcome_id after market_outcomes is created
ALTER TABLE markets ADD CONSTRAINT fk_resolved_outcome
  FOREIGN KEY (resolved_outcome_id) REFERENCES market_outcomes(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_markets_created_by ON markets(created_by);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_market_outcomes_market_id ON market_outcomes(market_id);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_market_id ON bets(market_id);
CREATE INDEX IF NOT EXISTS idx_bets_outcome_id ON bets(outcome_id);
