console.log("Content Studio worker starting...");

// Worker will poll for jobs from Supabase and execute Claude tasks.
// Implementation in PR #7+.

const shutdown = () => {
  console.log("Worker shutting down...");
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Keep process alive
setInterval(() => {
  // Poll loop placeholder
}, 5000);
