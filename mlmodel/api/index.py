# Vercel entry point: serves the FastAPI app from app/main.py as one Python function.
import os
import sys

# Routers load their models from relative "app/models/..." paths, so run from mlmodel/
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, ROOT)
# The deployment disk is read-only except /tmp
os.environ.setdefault("FEEDBACK_LOG", "/tmp/unified_feedback_log.jsonl")
os.environ.setdefault("TLDEXTRACT_CACHE", "/tmp/tldextract")

from app.main import app  # noqa: E402,F401
