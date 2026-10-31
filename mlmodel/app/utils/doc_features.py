# app/utils/doc_features.py
# Used by both train/train_doc_model.py and app/routers/doc_scan.py, so training and the API
# always compute the same features.
import re

import numpy as np


def extract_phishing_features(text, indicators):
    """Extract phishing-related features from text (model input; substring counts, as trained)"""
    text_lower = text.lower()
    features = {}

    for category, words in indicators.items():
        count = sum(1 for word in words if word.lower() in text_lower)
        features[f'{category}_count'] = count

    features['url_count'] = len(re.findall(r'http[s]?://\S+', text))
    features['email_count'] = len(re.findall(r'[\w\.-]+@[\w\.-]+', text))
    features['phone_count'] = len(re.findall(r'\b\d{10}\b|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', text))
    features['exclamation_count'] = text.count('!')
    features['caps_ratio'] = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    features['word_count'] = len(text.split())
    features['avg_word_length'] = np.mean([len(w) for w in text.split()]) if text.split() else 0

    features['has_money_request'] = int(bool(re.search(r'(pay|send|transfer).{0,30}(rs|₹|\$|rupee|dollar)', text_lower)))
    features['has_credential_request'] = int(bool(re.search(r'(send|share|provide|enter).{0,30}(aadhaar|password|otp|pin|card)', text_lower)))
    features['has_urgency'] = int(bool(re.search(r'(urgent|immediate|asap|within.{0,10}(hour|day)|act now)', text_lower)))
    features['has_threat'] = int(bool(re.search(r'(suspend|block|terminate|arrest|legal action|penalty)', text_lower)))
    features['has_suspicious_domain'] = int(any(domain in text_lower for domain in indicators.get('suspicious_domains', [])))

    return features
