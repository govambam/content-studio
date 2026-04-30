import pg from "pg";

// Singleton pg.Pool. Raw pg (not @supabase/supabase-js) because the
// /charge handler manages a connection lifecycle by hand and we want
// pool semantics, not a thin REST wrapper.
const connectionString = process.env.DATABASE_URL;

export const pool = new pg.Pool({
  connectionString,
  // Conservative pool size for a single Railway replica. Tune up if we
  // ever scale this service beyond demo load.
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// A pool error event is unrecoverable per-client but not fatal to the
// process — log it and let pg replace the bad client on the next acquire.
pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("[db] unexpected error on idle pg client", err);
});
