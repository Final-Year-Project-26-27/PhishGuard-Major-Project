# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is two independently-run projects in one repo, plus a Chrome extension built from the frontend:

- **`phishguard/`** — Next.js 15 (App Router) + TypeScript frontend. Firebase Auth/Firestore for user data. Also doubles as the source for the Chrome extension (see below).
- **`mlmodel/`** — FastAPI backend serving three scikit-learn models (email, link, document classifiers) via `/scan/email`, `/scan/link`, `/scan/doc`.
- **`test_documents/`** — sample phishing/legitimate files for manually exercising the doc scanner.

There is no root-level build; each of `phishguard/` and `mlmodel/` is built, run, and deployed separately.

## Commands

### Frontend (`phishguard/`)
```bash
cd phishguard
npm install
npm run dev      # dev server at localhost:3000
npm run build    # static export (see next.config.ts note below)
npm run lint
```

### Backend (`mlmodel/`)
```bash
cd mlmodel
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Retrain models (writes .pkl files into app/models/) — only needed if datasets/ changes.
# Run as modules: `python train/x.py` fails with "No module named 'app'"
python -m train.train_email_model
python -m train.train_link_model
python -m train.train_doc_model

# Tests (need: pip install pytest httpx2) — hits all three routers, doc scan uses test_documents/
python -m pytest tests

# Run the API (must run from mlmodel/, routers load models via relative "app/models/..." paths)
python -m uvicorn app.main:app --reload   # localhost:8000, docs at /docs
```

`mlmodel/tests/test_scan.py` is the only test file. The frontend has none — verify frontend changes with `npm run build` (includes the type check) and by exercising the page in a browser.

`scikit-learn` is pinned to `1.7.1` because the committed `.pkl` files were pickled with it; only bump it together with a retrain.

## Architecture notes

### Backend request flow
`mlmodel/app/main.py` registers three routers under `/scan/*`. Each router (`app/routers/{email,link,doc}_scan.py`) loads its own `joblib`-pickled model + vectorizer **at import time** from `app/models/*.pkl`, using relative paths — this is why uvicorn must be started from inside `mlmodel/`, not the repo root.

- **Link scan**: URL → regex-stripped → TF-IDF → `GradientBoostingClassifier`. Straightforward.
- **Email scan**: takes `text_content` + `sender_domain` separately; preprocessing happens in `app/utils/preprocess.py` and must match `train/train_email_model.py` exactly or the vectorizer will mis-transform input.
- **Doc scan**: PDF/DOCX/TXT upload → text extracted via `app/utils/doc_parser.py` (PyMuPDF/python-docx) → TF-IDF **plus** a hand-engineered feature vector (urgency/money/credential/threat keyword counts, defined inline in `doc_scan.py` and mirrored in `app/models/doc_metadata.json`) → concatenated and fed to the model. `doc_metadata.json` is required (no fallback). The keyword lists are defined in `train/train_doc_model.py` and written to that JSON; the feature code lives once in `app/utils/doc_features.py`, used by both training and serving. The model features use substring counts (as trained); the user-facing `indicators`/`warnings` use whole-word and hostname matching (`_has_term`, `_is_suspicious_url`). Uploads are capped at 5 MB, and `predict_doc` is a plain `def` so parsing runs in the threadpool.
- `app/services/extractor.py` (OCR-based extraction via `textract`/`pytesseract`) is **not used by any router** — `doc_scan.py` uses `app/utils/doc_parser.py` instead. Don't assume OCR is in the live path.

Each `train_*_model.py` script is a self-contained pipeline: load `datasets/*.csv` → preprocess → vectorize → fit → save `.pkl` to `app/models/`. Retraining one model does not touch the others.

### Frontend/backend coupling
`app/{email,link,doc}/page.tsx` call the backend via `API_URL` from `lib/utils.ts` (`NEXT_PUBLIC_API_URL`, default `http://localhost:8000`; inlined at build time because of the static export). Call the routes with their trailing slash (`/scan/email/`) — without it FastAPI answers with a 307 redirect. On a failed request the pages show an error and save nothing to history; never add a client-side "mock" verdict.

### Chrome extension
`phishguard/next.config.ts` sets `output: "export"` (static site in `out/`, deployed via Firebase Hosting per `firebase.json`) and wraps the config with `next-pwa`, which regenerates `public/sw.js` and `public/workbox-*.js` on every build (don't hand-edit those). There is no server deploy for the frontend.

`phishguard/extension-build/` is the unpacked MV3 extension, all hand-written: `manifest.json`, `background.js` (service worker), `content-gmail.js` (Gmail content script: scan button + warning banner), `popup.html`/`popup.js`, `rules.json` (static declarativeNetRequest rules), `icon.png`. It does not use the Next.js build. `_metadata/` is generated by Chrome and gitignored. The install page serves `public/assets/phishguard.zip` — rebuild that zip from `extension-build/` whenever the extension changes.

**The extension does not call the FastAPI backend or Gemini.** `background.js` reads blocklists (`phishing_links`, `phishing_emails`, `suspicious_keywords`, `phishing_patterns`) from Firestore via the REST API and turns `phishing_links` into dynamic DNR block rules; the popup only asks it for `getStatus`. Site links in `popup.js`/`content-gmail.js` use a `SITE_URL` constant at the top of each file. Domain allow-lists match with `isDomainOrSubdomain` (exact or `.`-subdomain), never `endsWith`/`includes`.

### Firebase
`phishguard/lib/firebase.ts` has Firebase config (API key, project ID) committed directly in source — this is normal for Firebase web apps (the key isn't a secret; access is controlled by `firestore.rules`), but don't treat it as sensitive-needs-removing without checking `firestore.rules` first. The rules cover `users/{uid}/{scans,email_scans,settings}`, `reports` (create-as-self, no edits), `questions`, and the four public-read, admin-write blocklists; the admin is a hardcoded UID (also in `app/admin-chat/page.tsx`). Deploy rule changes with `firebase deploy --only firestore:rules` — editing the file alone changes nothing live. See `phishguard/FIREBASE_SETUP.md` for deploying Firestore security rules.

### Deployment
- Backend: `mlmodel/Dockerfile` (multi-stage, non-root user) + `mlmodel/render.yaml`, targeting Render. `/health` reports which `.pkl` models loaded successfully.
- Frontend: static export (`npm run build` → `out/`), deployed with Firebase Hosting (`firebase.json`). Set `NEXT_PUBLIC_API_URL` at build time.
- CORS in `mlmodel/app/main.py` is currently `allow_origins=["*"]` — the code comments flag this as needing restriction before production use.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
- `.graphifyignore` excludes generated code (next-pwa's `sw.js`/`workbox-*.js`). Add new generated paths there so minified bundles don't swamp the graph.
