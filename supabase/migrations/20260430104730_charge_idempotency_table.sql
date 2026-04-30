-- payments-api: idempotency table for /charge.
-- Stores the cached response keyed by client-supplied idempotencyKey so
-- replays of the same request return the same charge instead of
-- inserting a duplicate row.

CREATE TABLE charge_idempotency (
  key TEXT PRIMARY KEY,
  charge_id UUID NOT NULL REFERENCES charges(id),
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
