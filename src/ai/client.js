// ═══════════════════════════════════════════════════════════════════════
// AI CLIENT — single gateway to the Anthropic API
// ═══════════════════════════════════════════════════════════════════════
// Every AI feature calls the API through here. The user's own key is sent
// straight from the browser, which requires the dangerous-direct-browser-
// access header on every request — without it the API rejects the CORS
// preflight and the feature silently fails on the web build.

export const AI_MODEL = "claude-sonnet-4-5";

export async function askClaude({ apiKey, system, messages, maxTokens = 800, model = AI_MODEL }) {
  if (!apiKey) throw new Error("Configure your Anthropic API key in Profile to use AI features.");
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
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
    });
  } catch {
    throw new Error("Unable to reach the API — check your connection.");
  }
  const data = await resp.json().catch(() => ({}));
  const text = data.content?.[0]?.text;
  if (text) return text;
  throw new Error(data.error?.message || "An error occurred — check API key configuration.");
}
