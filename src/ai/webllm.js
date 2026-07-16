// ═══════════════════════════════════════════════════════════════════════
// WEBLLM — true on-device inference (offline after first download)
// ═══════════════════════════════════════════════════════════════════════
// Runs a quantized model entirely in the browser via WebGPU. The library
// and weights are lazy-loaded (dynamic import; weights fetched once from
// the model CDN and cached in the browser), so nothing here touches the
// main bundle and the app runs normally where WebGPU is absent. After the
// first download the model works with no network — the point of a
// dedicated offline iPad.
//
// VERIFICATION BOUNDARY: the plumbing, gating, and routing here are tested,
// but actual on-device WebGPU inference in the iOS WKWebView can only be
// confirmed on the device itself. Where WebGPU is missing, webgpuAvailable()
// returns false and the provider declines cleanly.

export function webgpuAvailable() {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

// A few small, capable instruct models suited to a tablet's memory.
export const WEBLLM_MODELS = [
  { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", label: "Llama 3.2 3B (balanced)", size: "~1.8 GB" },
  { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B (lightest)", size: "~0.9 GB" },
  { id: "Qwen2.5-3B-Instruct-q4f16_1-MLC", label: "Qwen 2.5 3B (strong)", size: "~2.0 GB" },
  { id: "Phi-3.5-mini-instruct-q4f16_1-MLC", label: "Phi-3.5 mini (reasoning)", size: "~2.2 GB" },
];

let enginePromise = null;
let engineModel = null;

// Load (or reuse) the engine for a model. onProgress receives the library's
// {progress, text} during the one-time weight download/compile.
export async function getEngine(model, onProgress) {
  if (!webgpuAvailable()) throw new Error("This device has no WebGPU — on-device AI is unavailable here. Use a local server or the Anthropic engine instead.");
  if (enginePromise && engineModel === model) return enginePromise;
  engineModel = model;
  enginePromise = (async () => {
    const webllm = await import("@mlc-ai/web-llm");
    return webllm.CreateMLCEngine(model, { initProgressCallback: onProgress || (() => {}) });
  })();
  return enginePromise;
}

export function engineLoaded(model) {
  return !!enginePromise && engineModel === model;
}

export async function askWebLLM({ model, system, messages, maxTokens = 800, onProgress }) {
  const engine = await getEngine(model, onProgress);
  const msgs = [{ role: "system", content: system }, ...messages];
  const r = await engine.chat.completions.create({ messages: msgs, max_tokens: maxTokens, temperature: 0.7 });
  const text = r?.choices?.[0]?.message?.content;
  if (!text) throw new Error("The on-device model returned nothing.");
  return text;
}
