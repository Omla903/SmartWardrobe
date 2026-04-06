// ─────────────────────────────────────────────
//  Garde — Client-side config
//  API keys live in Vercel environment variables (server-side only).
//  Nothing secret here.
// ─────────────────────────────────────────────

const CONFIG = {
  // Groq model names — used by /api/chat and /api/vision proxies
  GROQ_VISION_MODEL: "meta-llama/llama-4-scout-17b-16e-instruct",
  GROQ_CHAT_MODEL:   "llama-3.3-70b-versatile",
};
