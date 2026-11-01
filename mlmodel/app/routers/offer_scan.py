# app/routers/offer_scan.py
"""
Fake internship/job offer detection for the WhatsApp bot. Loads the message model, which
/scan/email and /scan/unified also use through classify_message().
"""
from typing import List

import joblib
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.utils.message_features import get_red_flags, is_offer_related

router = APIRouter()

# One pipeline: pattern features + TF-IDF + logistic regression (train/train_message_model.py)
message_model = joblib.load("app/models/message_model.pkl")


def classify_message(text: str) -> tuple[str, float]:
    """("Fake" | "Legit", probability of that label, 0-1)"""
    p_legit = float(message_model.predict_proba([text])[0][1])
    prediction, confidence = ("Legit", p_legit) if p_legit >= 0.5 else ("Fake", 1 - p_legit)
    return prediction, min(confidence, 0.99)  # never claim certainty


class OfferRequest(BaseModel):
    message: str = Field(max_length=50000)

class OfferResponse(BaseModel):
    is_offer: bool
    prediction: str        # "Fake" | "Legit" | "N/A"
    confidence: float
    red_flags: List[str] = []


@router.post("/", response_model=OfferResponse)
def detect_offer_scam(data: OfferRequest):
    """
    Detect whether a WhatsApp message is a fake/scam internship or job offer.

    Returns:
    - is_offer: whether the message is about a job/internship at all
    - prediction: "Fake" | "Legit" | "N/A" (if not an offer)
    - confidence: percentage confidence (0-100), for the WhatsApp bot
    - red_flags: list of human-readable scam indicators found in the message
    """
    text = data.message

    # Step 1: is this even about a job/internship?
    if not is_offer_related(text):
        return {"is_offer": False, "prediction": "N/A", "confidence": 0.0, "red_flags": []}

    # Step 2: run the ML model
    prediction, confidence = classify_message(text)
    return {
        "is_offer": True,
        "prediction": prediction,
        # Don't claim 100% certainty
        "confidence": round(min(confidence * 100, 99.0), 2),
        "red_flags": get_red_flags(text) if prediction == "Fake" else [],
    }
