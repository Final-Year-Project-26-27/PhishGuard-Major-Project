// Put a real key in gemini-config.local.js (gitignored) as GEMINI_CONFIG.apiKey = "...",
// or set chrome.storage.local.geminiApiKey at runtime.
// Do not commit real keys to source control.
const GEMINI_CONFIG = {
  apiKey: "", // leave empty in git; set chrome.storage.local.geminiApiKey instead
  model: "gemini-2.5-flash",
};
