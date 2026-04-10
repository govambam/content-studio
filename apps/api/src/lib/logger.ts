import pino from "pino";

const level =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

export const logger = pino({
  name: "content-studio-api",
  level,
  base: {
    service: "content-studio-api",
    env: process.env.NODE_ENV ?? "development",
    release: process.env.RELEASE_SHA ?? null,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;
