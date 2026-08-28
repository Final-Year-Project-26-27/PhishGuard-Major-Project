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

# Retrain models (writes .pkl files into app/models/) — only needed if datasets/ changes
python train/train_email_model.py
python train/train_link_model.py
python train/train_doc_model.py

# Run the API (must run from mlmodel/, routers load models via relative "app/models/..." paths)
python -m uvicorn app.main:app --reload   # localhost:8000, docs at /docs
```

There is no test suite in either project — verify backend changes by hitting the running API (`/docs` Swagger UI, or `test_documents/` samples against `/scan/doc`) and verify frontend changes by exercising the page in a browser.

## Architecture notes

### Backend request flow
`mlmodel/app/main.py` registers three routers under `/scan/*`. Each router (`app/routers/{email,link,doc}_scan.py`) loads its own `joblib`-pickled model + vectorizer **at import time** from `app/models/*.pkl`, using relative paths — this is why uvicorn must be started from inside `mlmodel/`, not the repo root.

- **Link scan**: URL → regex-stripped → TF-IDF → `GradientBoostingClassifier`. Straightforward.
- **Email scan**: takes `text_content` + `sender_domain` separately; preprocessing happens in `app/utils/preprocess.py` and must match `train/train_email_model.py` exactly or the vectorizer will mis-transform input.
- **Doc scan**: PDF/DOCX/TXT upload → text extracted via `app/utils/doc_parser.py` (PyMuPDF/python-docx) → TF-IDF **plus** a hand-engineered feature vector (urgency/money/credential/threat keyword counts, defined inline in `doc_scan.py` and mirrored in `app/models/doc_metadata.json`) → concatenated and fed to the model. If `doc_metadata.json` is missing, `doc_scan.py` falls back to a hardcoded copy of the same keyword lists — keep both in sync if you change indicators.
- `app/services/extractor.py` (OCR-based extraction via `textract`/`pytesseract`) is **not used by any router** — `doc_scan.py` uses `app/utils/doc_parser.py` instead. Don't assume OCR is in the live path.

Each `train_*_model.py` script is a self-contained pipeline: load `datasets/*.csv` → preprocess → vectorize → fit → save `.pkl` to `app/models/`. Retraining one model does not touch the others.

### Frontend/backend coupling
`components/EmailScanForm.tsx` and `components/LinkScanForm.tsx` call the backend at a **hardcoded `http://localhost:8000`** — there's no env-based API base URL. When pointing the frontend at a deployed backend, these need manual edits (or introduce an env var if doing this properly).

### Chrome extension build
`phishguard/next.config.ts` sets `output: "export"` specifically so the Next.js build can be repackaged as the Chrome extension (`manifest.json` at repo root, `background.js`, `extension-build/`). Note the root `phishguard/Dockerfile` runs `npm start` (server mode), which is inconsistent with the static-export config — treat the Dockerfile and the extension packaging as two different consumers of the same `npm run build` output, not as the same deployment target.

`extension-build/` contains **committed, minified Next.js build output** (large bundled `.js` chunks) — this is generated, not hand-written; don't hand-edit files under `extension-build/next_assets/`.

### Firebase
`phishguard/lib/firebase.ts` has Firebase config (API key, project ID) committed directly in source — this is normal for Firebase web apps (the key isn't a secret; access is controlled by `firestore.rules`), but don't treat it as sensitive-needs-removing without checking `firestore.rules` first. See `phishguard/FIREBASE_SETUP.md` for deploying Firestore security rules.

### Deployment
- Backend: `mlmodel/Dockerfile` (multi-stage, non-root user) + `mlmodel/render.yaml`, targeting Render. `/health` reports which `.pkl` models loaded successfully.
- Frontend: `phishguard/Dockerfile` for containerized deploy; also configured for Vercel per the README.
- CORS in `mlmodel/app/main.py` is currently `allow_origins=["*"]` — the code comments flag this as needing restriction before production use.
