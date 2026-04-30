import { Hono } from "hono";
import { z } from "zod";
import { pool } from "../lib/db.js";
import { logger } from "../lib/logger.js";

const charge = new Hono();

const ChargeBodySchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().min(3).max(3),
  customerId: z.string().min(1),
  idempotencyKey: z.string().min(1),
});

charge.post("/", async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = ChargeBodySchema.safeParse(json);
  if (!parsed.success) {
    return c.json(
      { error: "invalid request body", issues: parsed.error.issues },
      400,
    );
  }
  const { amount, currency, customerId, idempotencyKey } = parsed.data;

  // Use an explicit pooled client so the idempotency lookup and the
  // subsequent insert run on the same connection.
  const client = await pool.connect();

  const existing = await client.query<{ response: unknown }>(
    "SELECT response FROM charge_idempotency WHERE key = $1",
    [idempotencyKey],
  );
  if (existing.rows.length > 0) {
    client.release();
    return c.json(existing.rows[0]!.response);
  }

  const result = await client.query<{ id: string }>(
    "INSERT INTO charges (amount, currency, customer_id, status) VALUES ($1, $2, $3, $4) RETURNING id",
    [amount, currency, customerId, "succeeded"],
  );
  const response = {
    id: result.rows[0]!.id,
    amount,
    currency,
    status: "succeeded",
  };

  await client.query(
    "INSERT INTO charge_idempotency (key, charge_id, response) VALUES ($1, $2, $3)",
    [idempotencyKey, result.rows[0]!.id, response],
  );

  logger.info(
    { chargeId: response.id, amount, customerId, idempotencyKey },
    "charge processed",
  );

  return c.json(response);
});

export default charge;
