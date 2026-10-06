import sharp from "sharp";

const VISION_API_BASE = "https://vision.googleapis.com/v1";

// The synchronous files:annotate endpoint caps out at 5 pages per request
// without a GCS bucket for async batch processing. Fine for lab reports,
// leaflets, and visit notes; longer documents would need the async API.
const MAX_SYNC_PDF_PAGES = 5;

function requireApiKey(): string {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) throw new Error("Document transcription isn't configured (missing API key).");
  return apiKey;
}

async function extractFromImage(base64: string, apiKey: string): Promise<string> {
  const res = await fetch(`${VISION_API_BASE}/images:annotate?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Vision API request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const result = data.responses?.[0];
  if (result?.error) throw new Error(`Vision API error: ${result.error.message}`);

  return result?.fullTextAnnotation?.text ?? "";
}

async function extractFromPdf(base64: string, apiKey: string): Promise<string> {
  const res = await fetch(`${VISION_API_BASE}/files:annotate?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          inputConfig: { content: base64, mimeType: "application/pdf" },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          pages: Array.from({ length: MAX_SYNC_PDF_PAGES }, (_, i) => i + 1),
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Vision API request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const fileResult = data.responses?.[0];
  if (fileResult?.error) throw new Error(`Vision API error: ${fileResult.error.message}`);

  const pages = fileResult?.responses ?? [];
  return pages
    .map((page: { fullTextAnnotation?: { text?: string } }) => page.fullTextAnnotation?.text ?? "")
    .filter(Boolean)
    .join("\n\n");
}

export async function extractDocumentText(file: File): Promise<string> {
  const apiKey = requireApiKey();
  const bytes = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    return (await extractFromPdf(bytes.toString("base64"), apiKey)).trim();
  }

  // Vision silently returns no text for some RGBA PNGs (alpha channel trips up
  // its decoder), so flatten onto a white background and re-encode as JPEG,
  // which it handles reliably, before sending.
  const normalized = await sharp(bytes).flatten({ background: "#ffffff" }).jpeg().toBuffer();
  return (await extractFromImage(normalized.toString("base64"), apiKey)).trim();
}
