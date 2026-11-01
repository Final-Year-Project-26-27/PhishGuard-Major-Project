# app/routers/email_scan.py
from typing import List

from fastapi import APIRouter
from pydantic import BaseModel

# Email scan runs the message model, trained on real phishing and legitimate emails as well as
# the fee and internship scams this project targets.
from app.routers.offer_scan import classify_message
from app.utils.message_features import get_red_flags

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
    prediction, confidence = classify_message(data.text_content)
    return {
        "prediction": prediction,
        # 0-1, same as every other /scan/* route
        "confidence": round(confidence, 3),
        "red_flag_words": get_red_flags(data.text_content) if prediction == "Fake" else [],
    }
