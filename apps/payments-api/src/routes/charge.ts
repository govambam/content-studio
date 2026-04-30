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
  const { amount, currency, customerId } = parsed.data;

  const result = await pool.query<{ id: string }>(
    "INSERT INTO charges (amount, currency, customer_id, status) VALUES ($1, $2, $3, $4) RETURNING id",
    [amount, currency, customerId, "succeeded"],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("insert returned no rows");
  }

  logger.info(
    { chargeId: row.id, amount, customerId },
    "charge processed",
  );

  return c.json({ id: row.id, amount, currency, status: "succeeded" });
});

export default charge;
