# app/routers/email_scan.py
from typing import List

import pandas as pd
from fastapi import APIRouter
from pydantic import BaseModel
from scipy.sparse import csr_matrix, hstack

# Email scan runs the offer-scam model. The generic email_model.pkl misses the fee and
# internship scams this project targets, so it is only used by /scan/unified.
from app.routers.offer_scan import (
    FEATURE_NAMES,
    _clean_text,
    _extract_features,
    _get_red_flags,
    offer_model,
    offer_tfidf,
)

router = APIRouter()


class EmailRequest(BaseModel):
    text_content: str
    sender_domain: str = ""

class EmailPrediction(BaseModel):
    prediction: str
    confidence: float
    red_flag_words: List[str] = []


@router.post("/", response_model=EmailPrediction)
def predict_email(data: EmailRequest):
    text = data.text_content
    X_custom = csr_matrix(pd.DataFrame([_extract_features(text)])[FEATURE_NAMES].values)
    X = hstack([X_custom, offer_tfidf.transform([_clean_text(text)])])

    pred = offer_model.predict(X)[0]  # 0 = Fake, 1 = Legit
    confidence = float(max(offer_model.predict_proba(X)[0]))

    return {
        "prediction": "Legit" if pred == 1 else "Fake",
        # 0-1, same as every other /scan/* route
        "confidence": round(confidence, 3),
        "red_flag_words": _get_red_flags(text) if pred == 0 else [],
    }
