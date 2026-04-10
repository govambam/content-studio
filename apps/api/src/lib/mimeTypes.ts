// Server-side MIME allowlist. The client sends `mime_type` from
// File.type, but we do NOT trust it — a caller could send whatever
// label they like. This module exists so the asset POST path resolves
// the type on the server (file extension first, client hint second)
// and then rejects anything outside the allowlist.
//
// Notable omissions: SVG (stored-XSS vector if ever served inline),
// HTML, anything+xml, application/octet-stream (the "I don't know"
// label), javascript, wasm.

export const ALLOWED_MIME_TYPES = new Set<string>([
  // images (no SVG — served inline would be an XSS vector)
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  // documents
  "application/pdf",
  "text/markdown",
  "text/plain",
  "text/csv",
  // video — common screencast formats
  "video/mp4",
  "video/quicktime",
  "video/webm",
  // audio — voiceover / interview clips
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  // archives
  "application/zip",
  "application/x-tar",
  "application/gzip",
]);

// Extension → canonical MIME. When the client sends a type we don't
// trust (octet-stream, missing, or anything not in the allowlist) we
// try to derive a type from the filename. If that fails, the upload is
// rejected.
const EXTENSION_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
  csv: "text/csv",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  zip: "application/zip",
  tar: "application/x-tar",
  gz: "application/gzip",
};

function extensionOf(filename: string): string | null {
  const dot = filename.lastIndexOf(".");
  if (dot < 0 || dot === filename.length - 1) return null;
  return filename.slice(dot + 1).toLowerCase();
}

export interface ResolvedMime {
  ok: boolean;
  mimeType: string;
  reason?: string;
}

// Prefer the client-sent type when it's in the allowlist. Otherwise try
// the filename extension. Return `ok: false` if neither lands in the
// allowlist so the route can 400 with a clear reason.
export function resolveMimeType(
  filename: string,
  clientMime: string | undefined
): ResolvedMime {
  const trimmed = (clientMime ?? "").trim().toLowerCase();
  if (trimmed && ALLOWED_MIME_TYPES.has(trimmed)) {
    return { ok: true, mimeType: trimmed };
  }
  const ext = extensionOf(filename);
  if (ext) {
    const fromExt = EXTENSION_MIME[ext];
    if (fromExt && ALLOWED_MIME_TYPES.has(fromExt)) {
      return { ok: true, mimeType: fromExt };
    }
  }
  return {
    ok: false,
    mimeType: "",
    reason: trimmed
      ? `mime type "${trimmed}" is not allowed`
      : `could not determine an allowed mime type for "${filename}"`,
  };
}
