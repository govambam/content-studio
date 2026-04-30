-- payments-api: charges table.
-- Owns one row per processed charge. customer_id is indexed because the
-- only non-id lookup we expect is "show me this customer's history".

CREATE TABLE charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX charges_customer_id_idx ON charges(customer_id);
