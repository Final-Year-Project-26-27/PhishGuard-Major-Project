# app/routers/link_scan.py
import json

import joblib
from fastapi import APIRouter
from pydantic import BaseModel

from app.utils.url_features import registrable_domain, split_url

router = APIRouter()

# One pipeline: URL character n-grams + lexical features + logistic regression (train/train_link_model.py)
model = joblib.load("app/models/link_model.pkl")

# Popular sites (Tranco top 10k) that phishing has never been seen on, written by train/build_link_dataset.py.
# Hosts where anyone can publish (sites.google.com, forms.gle, ...) are left out, so those still go to the model.
with open("app/models/trusted_domains.json", encoding="utf-8") as f:
    _trusted = json.load(f)
TRUSTED_DOMAINS = set(_trusted["domains"])
UNTRUSTED_HOSTS = set(_trusted["untrusted_hosts"])


def _on_shared_host(host: str) -> bool:
    return any(host == h or host.endswith("." + h) for h in UNTRUSTED_HOSTS)


def is_well_known(url: str) -> bool:
    host = split_url(url)[0]
    return not _on_shared_host(host) and registrable_domain(host) in TRUSTED_DOMAINS


def classify_url(url: str) -> tuple[str, float, str]:
    """("Legit" | "Phishing", probability of that label 0-1, "well_known_site" | "shared_host" | "model")"""
    if is_well_known(url):
        return "Legit", 0.99, "well_known_site"
    p_legit = float(model.predict_proba([url])[0][1])
    prediction, confidence = ("Legit", p_legit) if p_legit >= 0.5 else ("Phishing", 1 - p_legit)
    confidence = min(confidence, 0.99)  # never claim certainty
    if _on_shared_host(split_url(url)[0]):
        # docs.google.com/forms/... looks the same whether it's a college form or a phishing one, so the
        # URL alone can only ever give a weak verdict here; the page check in url-intel decides
        return prediction, min(confidence, 0.6), "shared_host"
    return prediction, confidence, "model"


class LinkRequest(BaseModel):
    url: str

class LinkResponse(BaseModel):
    prediction: str
    confidence: float
    source: str


@router.post("/", response_model=LinkResponse)
def predict_link_legitimacy(data: LinkRequest):
    prediction, confidence, source = classify_url(data.url)
    return {"prediction": prediction, "confidence": round(confidence, 3), "source": source}
