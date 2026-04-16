import { Hono } from "hono";
import PDFDocument from "pdfkit";
import { parseBody } from "../lib/validate.js";
import { exportViewSchema } from "../lib/schemas.js";

const views = new Hono();

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "view"
  );
}

function today(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildPdf(imageBuffer: Buffer, viewName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const header = `Content Studio — ${viewName} — ${today()}`;
    doc.fontSize(12).fillColor("#000000").text(header, { align: "left" });
    doc.moveDown(0.5);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const remainingHeight =
      doc.page.height - doc.page.margins.bottom - doc.y;

    try {
      doc.image(imageBuffer, {
        fit: [pageWidth, remainingHeight],
        align: "center",
      });
    } catch (err) {
      reject(err);
      return;
    }

    doc.end();
  });
}

views.post("/export", async (c) => {
  const parsed = await parseBody(c, exportViewSchema);
  if (!parsed.ok) return parsed.response;

  const { imageData, viewName, format } = parsed.data;

  const imageBuffer = Buffer.from(imageData, "base64");
  if (imageBuffer.length === 0) {
    return c.json({ data: null, error: "imageData decoded to empty buffer" }, 400);
  }

  const slug = slugify(viewName);
  const date = today();
  const ext = format === "pdf" ? "pdf" : "png";
  const filename = `content-studio-${slug}-${date}.${ext}`;
  const contentType = format === "pdf" ? "application/pdf" : "image/png";

  let body: Buffer;
  if (format === "pdf") {
    try {
      body = await buildPdf(imageBuffer, viewName);
    } catch (err) {
      const log = c.get("logger");
      log?.error(
        { err: err instanceof Error ? err.message : String(err) },
        "pdf_export_failed"
      );
      return c.json({ data: null, error: "failed to build pdf" }, 500);
    }
  } else {
    body = imageBuffer;
  }

  const ab = new ArrayBuffer(body.byteLength);
  new Uint8Array(ab).set(body);
  c.header("Content-Type", contentType);
  c.header("Content-Disposition", `attachment; filename="${filename}"`);
  c.header("Content-Length", String(ab.byteLength));
  return c.body(ab);
});

export default views;
