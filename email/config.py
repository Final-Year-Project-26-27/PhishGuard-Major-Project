"""
config.py — Central configuration loader for PhishGuard.
All runtime settings are sourced from the .env file via python-dotenv.
Add new env vars here so every module imports from one place.
"""

import os
from dotenv import load_dotenv

# Load .env from the project root before any other module reads env vars
load_dotenv()

# ── OAuth / credentials ──────────────────────────────────────────────────────
# Path to the credentials.json downloaded from Google Cloud Console
GOOGLE_CLIENT_CREDENTIALS_PATH: str = os.getenv(
    "GOOGLE_CLIENT_CREDENTIALS_PATH", "credentials.json"
)

# Path where the OAuth token will be persisted after the first login
GOOGLE_TOKEN_PATH: str = os.getenv("GOOGLE_TOKEN_PATH", "token.json")

# ── Pub/Sub ──────────────────────────────────────────────────────────────────
# Full Pub/Sub topic resource name:  projects/{PROJECT_ID}/topics/{TOPIC}
PUBSUB_TOPIC_NAME: str = os.getenv("PUBSUB_TOPIC_NAME", "")

# ── Gmail ────────────────────────────────────────────────────────────────────
# The Gmail address being watched, or the literal string "me"
GMAIL_USER_ID: str = os.getenv("GMAIL_USER_ID", "me")

# ── Endpoint secrets ─────────────────────────────────────────────────────────
# The webhook and dashboard are reachable through the public ngrok URL, so both require a token.
# Pub/Sub push endpoint must be configured as  {PUBLIC_BASE_URL}/webhook/gmail?token={PUBSUB_VERIFICATION_TOKEN}
PUBSUB_VERIFICATION_TOKEN: str = os.getenv("PUBSUB_VERIFICATION_TOKEN", "")
# Sent by the dashboard as /api/stream?token=... (frontend: VITE_DASHBOARD_TOKEN)
DASHBOARD_TOKEN: str = os.getenv("DASHBOARD_TOKEN", "")

# Public URL of this service (the ngrok URL), used for links inside warning drafts
PUBLIC_BASE_URL: str = os.getenv("PUBLIC_BASE_URL", "http://localhost:8080")

# ── Pipeline test trigger (Phase 1 only — not used in Phase 2) ───────────────
TEST_TRIGGER_WORD: str = os.getenv("TEST_TRIGGER_WORD", "ABCDEFGH")

# ── VirusTotal MCP (Phase 2 — L3 threat intel) ───────────────────────────────
# Free API key from https://www.virustotal.com/gui/join-us
# 500 lookups/day, 4/min on free tier
VIRUSTOTAL_API_KEY: str = os.getenv("VIRUSTOTAL_API_KEY", "")

# The VT MCP server itself is started separately: python start_mcp_tcp.py (TCP 127.0.0.1:8081)

# ── NLP model paths (Phase 2 — L2 NLP) ───────────────────────────────────────
# Directory containing vectorizer.pkl and classifier.pkl
# Run models/train_classifier.py once to generate these files
NLP_MODEL_DIR: str = os.getenv("NLP_MODEL_DIR", "models")
