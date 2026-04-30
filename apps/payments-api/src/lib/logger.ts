import { Writable } from "node:stream";
import pino from "pino";
import { Logging } from "@google-cloud/logging";

const level =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

const SERVICE_NAME = "payments-api";
const GCP_LOG_NAME = "payments-api";

// Map Pino's numeric levels to GCP severity strings. GCP filters on the
// LogEntry-level `severity` field, not on the embedded jsonPayload, so
// every entry MUST carry severity at the entry level — not just inside
// the body.
function pinoLevelToGcpSeverity(level: number): string {
  if (level >= 60) return "CRITICAL";
  if (level >= 50) return "ERROR";
  if (level >= 40) return "WARNING";
  if (level >= 30) return "INFO";
  return "DEBUG";
}

interface PinoRecord {
  level: number;
  time?: number;
  msg?: string;
  [key: string]: unknown;
}

// Build a Writable stream that ships each Pino line to Cloud Logging.
// Failures are logged to stderr and swallowed — GCP transport hiccups
// must not stall the request path or crash the process.
function createGcpStream(): Writable {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    // eslint-disable-next-line no-console
    console.warn(
      "[logger] GOOGLE_APPLICATION_CREDENTIALS not set; GCP log shipping disabled",
    );
    // No-op sink so multistream still has a writer.
    return new Writable({
      write(_chunk, _encoding, cb) {
        cb();
      },
    });
  }

  const logging = new Logging({
    keyFilename: credentialsPath,
    projectId: process.env.GCP_PROJECT_ID,
  });
  const log = logging.log(GCP_LOG_NAME);

  return new Writable({
    write(chunk: Buffer | string, _encoding, cb) {
      // Never let GCP write errors block the caller. Acknowledge first,
      // then fire-and-forget the actual write.
      cb();

      let record: PinoRecord;
      try {
        record = JSON.parse(chunk.toString()) as PinoRecord;
      } catch {
        return;
      }

      const severity = pinoLevelToGcpSeverity(record.level);
      const entry = log.entry(
        {
          severity,
          resource: { type: "global" },
          timestamp: record.time ? new Date(record.time) : new Date(),
        },
        record,
      );

      log.write(entry).catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error(
          "[logger] failed to write to GCP Cloud Logging",
          err instanceof Error ? err.message : err,
        );
      });
    },
  });
}

const stdoutStream = pino.destination({ dest: 1, sync: false });
const gcpStream = createGcpStream();

export const logger = pino(
  {
    name: SERVICE_NAME,
    level,
    base: {
      service: SERVICE_NAME,
      env: process.env.NODE_ENV ?? "development",
      release: process.env.RELEASE_SHA ?? null,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream([
    { level: level as pino.Level, stream: stdoutStream },
    { level: level as pino.Level, stream: gcpStream },
  ]),
);

export type Logger = typeof logger;
