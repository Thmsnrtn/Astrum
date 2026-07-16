// The AI provider abstraction: config resolution, message conversion, and
// routing. Network is mocked; the on-device path is gated, not run.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resolveAIConfig, aiConfigured, toOpenAIMessages, askAI, AI_PROVIDERS } from "./client.js";

// jsdom-free localStorage shim
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  };
  vi.restoreAllMocks();
});

const setProfile = o => localStorage.setItem("astrum_profile", JSON.stringify(o));
const setAI = o => localStorage.setItem("astrum_ai", JSON.stringify(o));

describe("resolveAIConfig", () => {
  it("defaults to anthropic with the profile key", () => {
    setProfile({ apiKey: "sk-ant-xyz" });
    const c = resolveAIConfig();
    expect(c.provider).toBe("anthropic");
    expect(c.apiKey).toBe("sk-ant-xyz");
  });
  it("reads provider + local settings from astrum_ai", () => {
    setAI({ provider: "local", localUrl: "http://box:8080/v1", localModel: "mistral" });
    const c = resolveAIConfig();
    expect(c.provider).toBe("local");
    expect(c.localModel).toBe("mistral");
  });
  it("falls back to anthropic for an unknown provider", () => {
    setAI({ provider: "nonsense" });
    expect(resolveAIConfig().provider).toBe("anthropic");
  });
});

describe("aiConfigured", () => {
  it("anthropic needs a key", () => {
    setProfile({ apiKey: "" }); expect(aiConfigured()).toBe(false);
    setProfile({ apiKey: "sk" }); expect(aiConfigured()).toBe(true);
  });
  it("local needs a url", () => {
    setAI({ provider: "local", localUrl: "http://x/v1" });
    expect(aiConfigured()).toBe(true);
  });
});

describe("toOpenAIMessages", () => {
  it("prepends the system prompt as a system message", () => {
    const m = toOpenAIMessages("SYS", [{ role: "user", content: "hi" }]);
    expect(m[0]).toEqual({ role: "system", content: "SYS" });
    expect(m[1]).toEqual({ role: "user", content: "hi" });
  });
});

describe("askAI routing", () => {
  it("anthropic → posts to api.anthropic.com with the direct-browser header", async () => {
    setProfile({ apiKey: "sk-ant" });
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ content: [{ text: "cloud reply" }] }) });
    globalThis.fetch = fetchMock;
    const out = await askAI({ system: "s", messages: [{ role: "user", content: "q" }], maxTokens: 10 });
    expect(out).toBe("cloud reply");
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain("api.anthropic.com");
    expect(opts.headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
    expect(JSON.parse(opts.body).system).toBe("s");
  });

  it("local → posts OpenAI-shaped body to the endpoint + /chat/completions", async () => {
    setAI({ provider: "local", localUrl: "http://box:8080/v1", localModel: "mistral", localKey: "secret" });
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ choices: [{ message: { content: "local reply" } }] }) });
    globalThis.fetch = fetchMock;
    const out = await askAI({ system: "s", messages: [{ role: "user", content: "q" }], maxTokens: 10 });
    expect(out).toBe("local reply");
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("http://box:8080/v1/chat/completions");
    expect(opts.headers.Authorization).toBe("Bearer secret");
    const body = JSON.parse(opts.body);
    expect(body.model).toBe("mistral");
    expect(body.messages[0]).toEqual({ role: "system", content: "s" });
  });

  it("local → surfaces a clear error when the server is unreachable", async () => {
    setAI({ provider: "local", localUrl: "http://down:9/v1", localModel: "m" });
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(askAI({ system: "s", messages: [{ role: "user", content: "q" }] })).rejects.toThrow(/Unable to reach the local server/);
  });

  it("webllm → declines cleanly where WebGPU is absent (Node)", async () => {
    setAI({ provider: "webllm", webllmModel: "Llama-3.2-3B-Instruct-q4f16_1-MLC" });
    await expect(askAI({ system: "s", messages: [{ role: "user", content: "q" }] })).rejects.toThrow(/WebGPU/);
  });
});

describe("AI_PROVIDERS", () => {
  it("declares which providers are offline-capable", () => {
    expect(AI_PROVIDERS.anthropic.offline).toBe(false);
    expect(AI_PROVIDERS.local.offline).toBe(true);
    expect(AI_PROVIDERS.webllm.offline).toBe(true);
  });
});
