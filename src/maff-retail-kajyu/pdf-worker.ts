/**
 * PDF text extraction in Cloudflare Workers.
 * Wrangler-bundled unpdf/pdfjs breaks class static initializers; load from CDN at runtime instead.
 */
const UNPDF_BASE = "https://esm.sh/unpdf@1.9.1";

type UnpdfModule = typeof import("unpdf");

let unpdfReady: Promise<UnpdfModule> | null = null;

function loadUnpdf(): Promise<UnpdfModule> {
  if (!unpdfReady) {
    unpdfReady = (async () => {
      const mod = (await import(/* webpackIgnore: true */ UNPDF_BASE)) as UnpdfModule;
      await mod.definePDFJSModule(async () =>
        import(/* webpackIgnore: true */ `${UNPDF_BASE}/pdfjs`)
      );
      return mod;
    })();
  }
  return unpdfReady;
}

export async function extractPdfTextInWorker(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await loadUnpdf();
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  if (!text?.trim()) {
    throw new Error("MAFF kajyu PDF had no extractable text");
  }
  return text;
}
