# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

PhishGuard: independently-run modules in one repo, no root-level build. (The ML backend, extension, Gmail pipeline and WhatsApp bot were merged in from the former "SafeNet AI" v2 repo; v2's tRPC/Prisma web app was not kept.)

- **`phishguard/`** — Next.js 15 (App Router) + TypeScript static site. Firebase Auth/Firestore for user data. Also holds the Chrome extension in `extension-build/`.
- **`mlmodel/`** — FastAPI backend: `/scan/email`, `/scan/link`, `/scan/doc`, `/scan/offer`, `/scan/unified`.
- **`email/`** — standalone FastAPI Gmail security pipeline (Pub/Sub webhook, SPF/DKIM/DMARC, heuristics, VirusTotal via MCP) with its own React/Vite dashboard in `email/frontend/`.
- **`whatsapp-bot/`** — one Node/Express process: Twilio webhook that calls `mlmodel` `/scan/offer/`.
- **`test_documents/`** — sample phishing/legitimate files for the doc scanner (also used by `mlmodel/tests/test_samples.py`).

## Commands

### Frontend (`phishguard/`)
```bash
cd phishguard
npm install
npm run dev      # dev server at localhost:3000
npm run build    # static export to out/ (includes the type check)
npm run lint
```
No frontend tests — verify with `npm run build` and by using the page in a browser.

### Backend (`mlmodel/`)
```bash
cd mlmodel
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Retrain (writes .pkl into app/models/) — only if datasets/ changes. Run as modules,
# `python train/x.py` fails with "No module named 'app'"
python -m train.train_email_model
python -m train.train_link_model
python -m train.train_doc_model
python -m train.train_offer_model

# Tests (need: pip install pytest httpx2)
python -m pytest tests

# Run from mlmodel/ — routers load models via relative "app/models/..." paths
python -m uvicorn app.main:app --reload   # localhost:8000, docs at /docs
```
`scikit-learn` is pinned to `1.8.0`, the version every committed `.pkl` was pickled with; bump it only together with a retrain.

### `email/`
```bash
cd email
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
ngrok http 8080             # expose the webhook, update the Pub/Sub push subscription
python -m pytest tests      # security tests; need pytest + httpx2, no Gmail access
```
The Pub/Sub push endpoint must include the secret: `{PUBLIC_BASE_URL}/webhook/gmail?token={PUBSUB_VERIFICATION_TOKEN}`. The dashboard needs `VITE_DASHBOARD_TOKEN` equal to `DASHBOARD_TOKEN`. Both endpoints fail closed when the token is unset. The README's `python models/train_classifier.py` step refers to a script that doesn't exist: there is no `email/models/`, so the L2 NLP stage logs a warning and scores 0.

`email/frontend/`: `npm install`, `npm run dev` (vite), `npm run build`, `npm run lint`.

### `whatsapp-bot/`
```bash
cd whatsapp-bot
npm install
node server.js     # or: npm start — Twilio webhook, port 5000
```
Refuses to start without `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `PUBLIC_WEBHOOK_URL`; `twilio.webhook({ url: PUBLIC_WEBHOOK_URL })` rejects requests without a valid Twilio signature, so `PUBLIC_WEBHOOK_URL` must equal the URL configured in Twilio.

## Architecture notes

### `mlmodel/` — ML backend
`app/main.py` registers five routers under `/scan/*`. Each loads its model(s) from `app/models/*.pkl` **at import time** using relative paths, so uvicorn must start from inside `mlmodel/`. Every route returns `confidence` on a 0-1 scale, except `/scan/offer`, which returns a 0-100 percentage for the WhatsApp bot.

- **Link scan** (`/scan/link`): URL → `preprocess_url` → TF-IDF → `GradientBoostingClassifier`. `preprocess_url` lives once in `app/utils/preprocess.py`, used by training, `link_scan` and `unified_scan`.
- **Offer scan** (`/scan/offer`): fake internship/job-offer detection over 18 hand-engineered features plus TF-IDF; gates on `_is_offer_related()` first. Its pattern lists must equal those in `train/train_offer_model.py` (a test checks this; retrain after changing them).
- **Email scan** (`/scan/email`): a thin wrapper that runs the **offer** model and helpers imported from `offer_scan.py`, because the generic `email_model.pkl` misses the fee/internship scams this project targets. `sender_domain` is accepted but unused.
- **Unified scan** (`/scan/unified`): max of the email (`email_model.pkl`) and link model scores, then a trusted-domain adjustment (exact-or-subdomain match). Email text is cleaned with `clean_email_text`, which must equal `clean_text` in `train/train_email_model.py` (tested). `/scan/unified/url-intel` resolves the host once, refuses non-public IPs, then connects to that pinned IP (hostname kept for TLS) without following redirects. `/scan/unified/feedback` appends to `FEEDBACK_LOG` (default `app/models/unified_feedback_log.jsonl`, gitignored; container disks reset on deploy).
- **Doc scan** (`/scan/doc`): PDF/DOCX/TXT → `app/utils/doc_parser.py` → TF-IDF **plus** a hand-engineered feature vector → model. The keyword lists are defined in `train/train_doc_model.py` and written to `app/models/doc_metadata.json` (required, no fallback); the feature code lives once in `app/utils/doc_features.py`. Model features use substring counts (as trained); the user-facing `indicators`/`warnings` use whole-word and hostname matching. Uploads are capped at 5 MB, and `predict_doc` is a plain `def` so parsing runs in the threadpool. Risk cut-offs are 75 (HIGH) / 45 (MEDIUM). There is no OCR, so image-only PDFs are rejected.

### Frontend/backend coupling
`app/{email,link,doc}/page.tsx` call the backend via `API_URL` from `lib/utils.ts` (`NEXT_PUBLIC_API_URL`, default `http://localhost:8000`; inlined at build time because of the static export). Call routes with their trailing slash (`/scan/email/`) — without it FastAPI answers with a 307. On a failed request the pages show an error and save nothing to history; never add a client-side "mock" verdict.

### Chrome extension (`phishguard/extension-build/`)
Unpacked MV3 extension, all hand-written: `manifest.json`, `background.js` (service worker), content scripts for Gmail, WhatsApp Web, LinkedIn and a global link guard (`content-link-guard.js` + `blocked.html/js/css` interstitial), `popup.html`/`popup.js`, `rules.json` (static DNR rules), `gemini-config.js`, `icon.png`. `_metadata/` is generated by Chrome and gitignored.

- **ML calls** go to the `mlmodel` backend (`/scan/unified/*`), base URL from `GEMINI_CONFIG.modelApiBaseUrl`, `chrome.storage.local.phishguardModelApiBaseUrl`, or `http://localhost:8000`.
- **Gemini** is called directly from `background.js`. Keep `apiKey` empty in `gemini-config.js`; for local testing put `GEMINI_CONFIG.apiKey = "..."` in the gitignored `gemini-config.local.js`, or set `chrome.storage.local.geminiApiKey`.
- **Blocklists** are read from Firestore (`phishing_links`, `phishing_emails`, `suspicious_keywords`, `phishing_patterns`) and matched exact-or-subdomain (`isDomainOrSubdomain`). The extension never writes to Firestore.
- **User reports** stay in the extension's `chrome.storage.local` (`scamReports`); there is no report API for the extension.
- Site links use a `SITE_URL` constant at the top of each content script and `popup.js`.

The install page serves `public/assets/phishguard.zip`. Rebuild it from `extension-build/` whenever the extension changes, **excluding `gemini-config.local.js` and `_metadata/`**.

`phishguard/next.config.ts` wraps the config with `next-pwa`, which regenerates `public/sw.js` and `public/workbox-*.js` on every build (don't hand-edit those).

### `email/` — Gmail pipeline
`main.py`'s `_process_message()` runs `pipeline/orchestrator.py::run_pipeline()` on every new inbox message (`agents.md` still calls this "Phase 2, not built", which is stale):
1. `email_parser.py` — raw MIME → `EmailContext`.
2. `l1_authentication.py` — SPF/DKIM/DMARC/display-name spoofing, max +4.
3. `l2_heuristics.py` — 9 regex rules, max +4.
4. `l2_nlp.py` — TF-IDF + LogisticRegression, max +3; model files are missing, so it scores 0 (see Commands).
5. `l3_threat_intel.py` (+`mcp_client.py`) — VirusTotal via MCP over TCP `127.0.0.1:8081`, served by `python start_mcp_tcp.py` (run it in a separate terminal first); max +3, in-memory cache (capped), 4 req/min limiter.
6. `scoring.py::aggregate_scores()` → SCL 0–10 verdict (CLEAN / SUSPICIOUS / LIKELY_PHISH / PHISH) → labels via `label_manager.py`; a warning draft (`warning_composer.py`, HTML-escaped) is added for the last three.

The orchestrator never raises (failures return CLEAN) so `/webhook/gmail` always answers 200. `history.list` follows pagination, and a failed call still advances `last_history_id`. The Gmail watch is renewed every 24 h. `GET /api/report` only shows a confirmation form; `POST /api/report` writes to Supabase `pending_reports`. `GET /api/stream?token=` is the SSE feed for `email/frontend/`. Supabase access reads `SUPABASE_URL`/`SUPABASE_KEY` via `os.getenv` in `l3_threat_intel.py`, not through `config.py`.

### Firebase
`phishguard/lib/firebase.ts` has the Firebase web config committed — normal for Firebase (the key isn't a secret; access is controlled by `firestore.rules`). The rules cover `users/{uid}/{scans,email_scans,settings}`, `reports` (create-as-self, no edits), `questions`, and the four public-read, admin-write blocklists; the admin is a hardcoded UID (also in `app/admin-chat/page.tsx`). Deploy rule changes with `firebase deploy --only firestore:rules`. See `phishguard/FIREBASE_SETUP.md`.

### Deployment
- Backend: `mlmodel/Dockerfile` (multi-stage, non-root) + `mlmodel/render.yaml`, targeting Render. `/health` reports which `.pkl` models loaded.
- Frontend: static export (`npm run build` → `out/`) on Firebase Hosting (`firebase.json`). Set `NEXT_PUBLIC_API_URL` at build time.
- CORS is `allow_origins=["*"]` in both `mlmodel/app/main.py` and `email/main.py`; restrict before production.

## Environment variables

| Variable | Module | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | phishguard | Base URL of `mlmodel` (build time) |
| `FEEDBACK_LOG` | mlmodel | Unified-scan feedback JSONL path |
| `GOOGLE_CLIENT_CREDENTIALS_PATH` / `GOOGLE_TOKEN_PATH` | email | OAuth `credentials.json` / persisted token |
| `PUBSUB_TOPIC_NAME` | email | Full Pub/Sub topic resource name |
| `GMAIL_USER_ID` | email | Gmail user to watch (default `me`) |
| `PUBSUB_VERIFICATION_TOKEN` | email | Secret query param required on `/webhook/gmail` |
| `DASHBOARD_TOKEN` | email | Secret query param required on `/api/stream` (frontend: `VITE_DASHBOARD_TOKEN`) |
| `PUBLIC_BASE_URL` | email | Public (ngrok) URL used for the report link in warning drafts |
| `VIRUSTOTAL_API_KEY` | email | VirusTotal key (L3) |
| `NLP_MODEL_DIR` | email | Dir for the L2 `vectorizer.pkl`/`classifier.pkl` (currently absent) |
| `SUPABASE_URL` / `SUPABASE_KEY` | email | Supabase project for `pending_reports` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | whatsapp-bot | Twilio credentials |
| `TWILIO_WHATSAPP_NUMBER` | whatsapp-bot | Sending number (defaults to the Twilio sandbox) |
| `PUBLIC_WEBHOOK_URL` | whatsapp-bot | Exact webhook URL configured in Twilio |
| `ML_API_URL` | whatsapp-bot | Offer-scan endpoint (default `http://localhost:8000/scan/offer/`) |

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
- `.graphifyignore` excludes generated code (next-pwa's `sw.js`/`workbox-*.js`). Add new generated paths there so minified bundles don't swamp the graph.
