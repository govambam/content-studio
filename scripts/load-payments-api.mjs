#!/usr/bin/env node
// Sustained load against payments-api for the video 003 demo.
//
// Runs until you Ctrl-C or DURATION_SECONDS elapses. Sends concurrent
// POST /charge requests with realistic-ish random payloads and unique
// idempotency keys. Once the pg pool exhausts (default size 10), every
// subsequent request will time out acquiring a connection and the service
// will start logging ERROR entries — those drive the GCP Cloud Monitoring
// alert that fires the PagerDuty incident.
//
// Env:
//   PAYMENTS_API_URL   default http://localhost:3002
//   CONCURRENCY        default 15
//   DURATION_SECONDS   default 300 (5 min)
//   IDEMPOTENCY_REUSE  default 0  (0–1; fraction of requests that reuse a key)
//
// Usage:
//   PAYMENTS_API_URL=https://payments-api-production-xxxx.up.railway.app \
//   node scripts/load-payments-api.mjs

import { randomUUID } from "node:crypto";

const TARGET = process.env.PAYMENTS_API_URL ?? "http://localhost:3002";
const CONCURRENCY = parseInt(process.env.CONCURRENCY ?? "15", 10);
const DURATION_SECONDS = parseInt(process.env.DURATION_SECONDS ?? "300", 10);
const IDEMPOTENCY_REUSE = Math.min(
  1,
  Math.max(0, parseFloat(process.env.IDEMPOTENCY_REUSE ?? "0"))
);

const stats = {
  ok: 0,
  errors: 0,
  status: new Map(), // statusCode -> count
  latencies: [],
  firstErrorAt: null,
};

const seenKeys = [];

function makePayload() {
  const reuse = Math.random() < IDEMPOTENCY_REUSE && seenKeys.length > 0;
  const idempotencyKey = reuse
    ? seenKeys[Math.floor(Math.random() * seenKeys.length)]
    : `idem_${randomUUID()}`;
  if (!reuse) seenKeys.push(idempotencyKey);
  return {
    amount: 100 + Math.floor(Math.random() * 9900),
    currency: "usd",
    customerId: `cus_${randomUUID().slice(0, 8)}`,
    idempotencyKey,
  };
}

function recordStatus(status) {
  stats.status.set(status, (stats.status.get(status) ?? 0) + 1);
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

function printStats(label) {
  const total = stats.ok + stats.errors;
  const errPct = total > 0 ? ((stats.errors / total) * 100).toFixed(1) : "0.0";
  const p50 = percentile(stats.latencies, 50);
  const p99 = percentile(stats.latencies, 99);
  const statusLine = [...stats.status.entries()]
    .sort(([a], [b]) => a - b)
    .map(([s, c]) => `${s}=${c}`)
    .join(" ");
  console.log(
    `[${label}] total=${total} ok=${stats.ok} err=${stats.errors} (${errPct}%)` +
      ` p50=${p50}ms p99=${p99}ms statuses: ${statusLine || "n/a"}`
  );
}

async function worker(id, stopAt) {
  while (Date.now() < stopAt) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${TARGET}/charge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(makePayload()),
      });
      const dt = Date.now() - t0;
      stats.latencies.push(dt);
      recordStatus(res.status);
      if (res.ok) {
        stats.ok++;
      } else {
        stats.errors++;
        if (!stats.firstErrorAt) {
          stats.firstErrorAt = new Date().toISOString();
          console.log(
            `[worker ${id}] first error at ${stats.firstErrorAt} status=${res.status}`
          );
        }
      }
      // Drain body so the connection can be reused.
      await res.text().catch(() => {});
    } catch (err) {
      const dt = Date.now() - t0;
      stats.latencies.push(dt);
      stats.errors++;
      recordStatus(0);
      if (!stats.firstErrorAt) {
        stats.firstErrorAt = new Date().toISOString();
        console.log(
          `[worker ${id}] first network error at ${stats.firstErrorAt}: ${err.message}`
        );
      }
    }
  }
}

async function main() {
  console.log(
    `load: ${CONCURRENCY} workers against ${TARGET} for ${DURATION_SECONDS}s` +
      ` (idempotency reuse rate ${IDEMPOTENCY_REUSE})`
  );

  const stopAt = Date.now() + DURATION_SECONDS * 1000;
  const ticker = setInterval(() => printStats("tick"), 10_000);

  process.on("SIGINT", () => {
    console.log("\nSIGINT — exiting");
    clearInterval(ticker);
    printStats("final");
    console.log(
      `done. first error at: ${stats.firstErrorAt ?? "never (pool may not have exhausted)"}`
    );
    process.exit(0);
  });

  const workers = Array.from({ length: CONCURRENCY }, (_, i) =>
    worker(i, stopAt)
  );
  await Promise.all(workers);
  clearInterval(ticker);
  printStats("final");
  console.log(
    `done. first error at: ${stats.firstErrorAt ?? "never (pool may not have exhausted)"}`
  );
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
