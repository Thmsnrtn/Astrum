// ═══════════════════════════════════════════════════════════════════════
// AI CLIENT — one gateway, three engines
// ═══════════════════════════════════════════════════════════════════════
// Every AI feature calls askClaude/askAI here. The provider is chosen in
// Profile → AI Engine:
//   anthropic  — the cloud default; user's own key, sent from the browser
//                (requires the dangerous-direct-browser-access header, or
//                the CORS preflight fails and the feature silently dies)
//   local      — any OpenAI-compatible endpoint (Ollama, llama.cpp server,
//                LM Studio, a LAN box) — for a self-hosted brain
//   webllm     — a quantized model running fully on-device via WebGPU, so
//                a dedicated iPad works with no network at all
// Call sites are unchanged: they still call askClaude({apiKey, system,
// messages, maxTokens}); the provider is resolved from stored settings.

import { loadJSON } from "../lib/storage.js";
import { askWebLLM, webgpuAvailable } from "./webllm.js";

export const AI_MODEL = "claude-sonnet-4-5";

export const AI_PROVIDERS = {
  anthropic: { label: "Anthropic (cloud)", needs: "key", offline: false },
  local:     { label: "Local server (OpenAI-compatible)", needs: "endpoint", offline: true },
  webllm:    { label: "On-device (WebGPU)", needs: "webgpu", offline: true },
};

// Resolve the active AI configuration from the saved profile.
export function resolveAIConfig() {
  const p = loadJSON("astrum_profile", {}) || {};
  const ai = loadJSON("astrum_ai", {}) || {};
  return {
    provider: AI_PROVIDERS[ai.provider] ? ai.provider : "anthropic",
    apiKey: p.apiKey || "",
    localUrl: ai.localUrl || "http://localhost:11434/v1",
    localModel: ai.localModel || "llama3.1",
    localKey: ai.localKey || "",
    webllmModel: ai.webllmModel || "Llama-3.2-3B-Instruct-q4f16_1-MLC",
  };
}

// Is the active provider usable right now? (For call-site guards / UI.)
export function aiConfigured() {
  const c = resolveAIConfig();
  if (c.provider === "anthropic") return !!c.apiKey;
  if (c.provider === "local") return !!c.localUrl;
  if (c.provider === "webllm") return webgpuAvailable();
  return false;
}

export function aiProviderInfo() {
  const c = resolveAIConfig();
  return { provider: c.provider, label: AI_PROVIDERS[c.provider]?.label || c.provider, configured: aiConfigured() };
}

// The message that call-site guards show when AI isn't ready.
export function aiUnconfiguredMessage() {
  const c = resolveAIConfig();
  if (c.provider === "anthropic") return "Configure an AI engine in Profile → AI Engine (an Anthropic key, a local server, or on-device).";
  if (c.provider === "webllm") return webgpuAvailable() ? "On-device model not ready." : "This device has no WebGPU — choose the Anthropic or local engine in Profile → AI Engine.";
  return "Set your local server URL in Profile → AI Engine.";
}

// ── Provider implementations ────────────────────────────────────────────

async function askAnthropic({ apiKey, system, messages, maxTokens, model }) {
  if (!apiKey) throw new Error(aiUnconfiguredMessage());
  let resp;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model: model || AI_MODEL, max_tokens: maxTokens, system, messages }),
    });
  } catch { throw new Error("Unable to reach the Anthropic API — check your connection."); }
  const data = await resp.json().catch(() => ({}));
  const text = data.content?.[0]?.text;
  if (text) return text;
  throw new Error(data.error?.message || "An error occurred — check API key configuration.");
}

// Any OpenAI-compatible /chat/completions endpoint (Ollama, llama.cpp, LM
// Studio, vLLM…). system is folded in as the first system message.
export function toOpenAIMessages(system, messages) {
  return [{ role: "system", content: system }, ...messages.map(m => ({ role: m.role, content: m.content }))];
}

async function askOpenAICompatible({ baseUrl, apiKey, model, system, messages, maxTokens }) {
  const url = baseUrl.replace(/\/+$/, "") + "/chat/completions";
  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ model, messages: toOpenAIMessages(system, messages), max_tokens: maxTokens, temperature: 0.7, stream: false }),
    });
  } catch { throw new Error(`Unable to reach the local server at ${baseUrl}. Is it running?`); }
  const data = await resp.json().catch(() => ({}));
  const text = data.choices?.[0]?.message?.content;
  if (text) return text;
  throw new Error(data.error?.message || "The local server returned no completion.");
}

// ── Dispatch ────────────────────────────────────────────────────────────

export async function askAI({ system, messages, maxTokens = 800, model, apiKey, config, onProgress }) {
  const cfg = config || resolveAIConfig();
  switch (cfg.provider) {
    case "local":
      return askOpenAICompatible({ baseUrl: cfg.localUrl, apiKey: cfg.localKey, model: cfg.localModel, system, messages, maxTokens });
    case "webllm":
      return askWebLLM({ model: cfg.webllmModel, system, messages, maxTokens, onProgress });
    default:
      return askAnthropic({ apiKey: apiKey ?? cfg.apiKey, system, messages, maxTokens, model });
  }
}

// Back-compatible entry point — unchanged signature for every call site.
export async function askClaude(opts) { return askAI(opts); }
