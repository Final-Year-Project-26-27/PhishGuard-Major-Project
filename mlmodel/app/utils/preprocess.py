# app/utils/preprocess.py
import re

def preprocess_text(text: str) -> str:
    """Text cleaning for the doc model (used by app/utils/doc_features.py for training and serving)"""
    text = str(text).lower()
    text = re.sub(r"http\S+", " URL_FOUND ", text)  # Mark URLs instead of removing
    text = re.sub(r"[^a-zA-Z0-9\s₹$@.]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text
