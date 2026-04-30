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
//
// Credentials can be supplied two ways:
//   - GOOGLE_APPLICATION_CREDENTIALS_JSON  (full JSON of the SA key, suitable
//     for platforms like Railway that don't provide a writable secrets path)
//   - GOOGLE_APPLICATION_CREDENTIALS       (path to a key file, suitable for
//     local dev via `gcloud auth` or a mounted secret)
// JSON takes precedence when both are set.
function createGcpStream(): Writable {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  const noopStream = new Writable({
    write(_chunk, _encoding, cb) {
      cb();
    },
  });

  const loggingOpts: ConstructorParameters<typeof Logging>[0] = {
    projectId: process.env.GCP_PROJECT_ID,
  };

  if (credentialsJson) {
    try {
      loggingOpts.credentials = JSON.parse(credentialsJson) as {
        client_email: string;
        private_key: string;
      };
    } catch {
      // eslint-disable-next-line no-console
      console.warn(
        "[logger] GOOGLE_APPLICATION_CREDENTIALS_JSON is set but not valid JSON; GCP log shipping disabled",
      );
      return noopStream;
    }
  } else if (credentialsPath) {
    loggingOpts.keyFilename = credentialsPath;
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      "[logger] no GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS set; GCP log shipping disabled",
    );
    return noopStream;
  }

  const logging = new Logging(loggingOpts);
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
