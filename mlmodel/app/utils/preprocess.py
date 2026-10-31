# app/utils/preprocess.py
import re

def preprocess_text(text: str) -> str:
    """Preprocess text for model prediction - matches training preprocessing"""
    text = str(text).lower()
    text = re.sub(r"http\S+", " URL_FOUND ", text)  # Mark URLs instead of removing
    text = re.sub(r"[^a-zA-Z0-9\s₹$@.]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def preprocess_url(url: str) -> str:
    """Preprocess a URL for model prediction - matches training preprocessing"""
    url = str(url).lower()
    url = re.sub(r"https?://", "", url)
    url = re.sub(r"[^a-zA-Z0-9./]", "", url)
    return url


def clean_email_text(text: str) -> str:
    """Text cleaning for email_model.pkl - must match clean_text in train/train_email_model.py"""
    text = str(text).lower()
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[^a-zA-Z\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text
