# app/utils/doc_features.py
# Used by both train/train_doc_model.py and app/routers/doc_scan.py, so training and the API
# always compute the same features.
import re

import numpy as np

from app.utils.preprocess import preprocess_text

PHISHING_INDICATORS = {
    'urgency_words': [
        'urgent', 'immediately', 'act now', 'limited time', 'expires', 'deadline',
        'final notice', 'last chance', 'hurry', 'quick', 'asap', 'right away',
        'within 24 hours', 'today only', 'dont delay', 'time sensitive'
    ],
    'money_words': [
        'pay', 'payment', 'fee', 'charge', 'rupees', 'rs', '₹', 'dollar', '$',
        'prize', 'won', 'lottery', 'winner', 'jackpot', 'cash', 'money', 'free',
        'loan', 'credit', 'refund', 'compensation', 'reward', 'bonus'
    ],
    'credential_words': [
        'password', 'login', 'verify', 'confirm', 'account', 'credential',
        'ssn', 'social security', 'aadhaar', 'pan card', 'bank account',
        'credit card', 'debit card', 'cvv', 'otp', 'pin', 'identity'
    ],
    'threat_words': [
        'suspended', 'blocked', 'terminated', 'closed', 'locked', 'disabled',
        'legal action', 'arrest', 'penalty', 'fine', 'court', 'police',
        'unauthorized', 'compromised', 'hacked', 'infected', 'virus', 'malware'
    ],
    'suspicious_domains': [
        '.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.work', '.click',
        '.link', '.info', '.biz', '.co', '.io', '-verify', '-secure', '-login',
        'fakeinternship', 'scamjobs', 'quickjobs', 'verify-later', 'fraudsite'
    ],
    'action_words': [
        'click here', 'click below', 'click link', 'download', 'install',
        'open attachment', 'fill form', 'submit', 'send', 'share', 'provide',
        'enter details', 'update information', 'confirm identity'
    ]
}


def extract_phishing_features(text, indicators=PHISHING_INDICATORS):
    """Extract phishing-related features from text (model input; substring counts)"""
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
    # log-scaled so a long document doesn't outweigh the scam signals
    features['log_word_count'] = float(np.log1p(len(text.split())))
    features['avg_word_length'] = np.mean([len(w) for w in text.split()]) if text.split() else 0

    features['has_money_request'] = int(bool(re.search(r'(pay|send|transfer|deposit).{0,40}(rs|₹|\$|rupee|dollar|inr)', text_lower)))
    features['has_credential_request'] = int(bool(re.search(r'(send|share|provide|enter|upload).{0,30}(aadhaar|password|otp|pin|card|bank)', text_lower)))
    features['has_urgency'] = int(bool(re.search(r'(urgent|immediate|asap|within.{0,10}(hour|day)|act now)', text_lower)))
    features['has_threat'] = int(bool(re.search(r'(suspend|block|terminate|arrest|legal action|penalty)', text_lower)))
    features['has_suspicious_domain'] = int(any(domain in text_lower for domain in indicators.get('suspicious_domains', [])))

    return features


# Module-level so the pickled pipeline can find them (FunctionTransformer stores a reference)
def doc_texts(texts):
    return [preprocess_text(t) for t in texts]


def doc_matrix(texts):
    return np.array([list(extract_phishing_features(str(t)).values()) for t in texts], dtype=float)
