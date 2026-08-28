# app/routers/doc_scan.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import joblib
import tempfile
import json
import re
import numpy as np

from app.utils.doc_parser import extract_text_from_pdf, extract_text_from_docx
from app.utils.preprocess import preprocess_text

router = APIRouter()

# Load models
model = joblib.load("app/models/doc_model.pkl")
vectorizer = joblib.load("app/models/doc_vectorizer.pkl")

# Load metadata with phishing indicators (written by train/train_doc_model.py)
with open("app/models/doc_metadata.json", 'r') as f:
    metadata = json.load(f)
PHISHING_INDICATORS = metadata.get('phishing_indicators', {})
FEATURE_NAMES = metadata.get('feature_names', [])


def extract_phishing_features(text):
    """Extract phishing-related features from text"""
    text_lower = text.lower()
    features = {}
    
    for category, words in PHISHING_INDICATORS.items():
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
    features['has_suspicious_domain'] = int(any(domain in text_lower for domain in PHISHING_INDICATORS.get('suspicious_domains', [])))
    
    return features


def find_suspicious_indicators(text):
    """Find specific suspicious indicators in the document"""
    text_lower = text.lower()
    findings = {
        'urgency_indicators': [],
        'money_indicators': [],
        'credential_requests': [],
        'threats': [],
        'suspicious_urls': [],
        'action_requests': []
    }
    
    # Find urgency words
    for word in PHISHING_INDICATORS.get('urgency_words', []):
        if word.lower() in text_lower:
            findings['urgency_indicators'].append(word)
    
    # Find money-related words
    for word in PHISHING_INDICATORS.get('money_words', []):
        if word.lower() in text_lower:
            findings['money_indicators'].append(word)
    
    # Find credential requests
    for word in PHISHING_INDICATORS.get('credential_words', []):
        if word.lower() in text_lower:
            findings['credential_requests'].append(word)
    
    # Find threats
    for word in PHISHING_INDICATORS.get('threat_words', []):
        if word.lower() in text_lower:
            findings['threats'].append(word)
    
    # Find suspicious URLs
    urls = re.findall(r'http[s]?://[^\s<>"{}|\\^`\[\]]+', text)
    for url in urls:
        for domain in PHISHING_INDICATORS.get('suspicious_domains', []):
            if domain.lower() in url.lower():
                findings['suspicious_urls'].append(url)
                break
    
    # Find action requests
    for phrase in PHISHING_INDICATORS.get('action_words', []):
        if phrase.lower() in text_lower:
            findings['action_requests'].append(phrase)
    
    # Remove duplicates
    for key in findings:
        findings[key] = list(set(findings[key]))
    
    return findings


def calculate_risk_score(indicators, confidence, is_phishing):
    """Calculate an overall risk score based on indicators"""
    risk_score = 0
    
    # Base score from model prediction
    if is_phishing:
        risk_score += confidence * 40
    else:
        risk_score += (1 - confidence) * 10
    
    # Add scores for each type of indicator
    risk_weights = {
        'urgency_indicators': 8,
        'money_indicators': 10,
        'credential_requests': 15,
        'threats': 12,
        'suspicious_urls': 20,
        'action_requests': 5
    }
    
    for indicator_type, weight in risk_weights.items():
        count = len(indicators.get(indicator_type, []))
        risk_score += min(count * weight, weight * 3)  # Cap at 3x weight max
    
    return min(round(risk_score), 100)  # Cap at 100


def get_risk_level(risk_score):
    """Get risk level based on score"""
    if risk_score >= 70:
        return "HIGH"
    elif risk_score >= 40:
        return "MEDIUM"
    else:
        return "LOW"


@router.post("/")
async def predict_doc(file: UploadFile = File(...)):
    ext = file.filename.split('.')[-1].lower()
    if ext not in ["pdf", "docx", "txt"]:
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, or TXT files are supported")

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        # Extract text based on file type
        if ext == "pdf":
            extracted_text = extract_text_from_pdf(tmp_path)
        elif ext == "docx":
            extracted_text = extract_text_from_docx(tmp_path)
        else:  # txt
            with open(tmp_path, 'r', encoding='utf-8', errors='ignore') as f:
                extracted_text = f.read()

        if not extracted_text or len(extracted_text.strip()) < 10:
            raise HTTPException(status_code=400, detail="Could not extract sufficient text from document")

        # Preprocess for model
        cleaned = preprocess_text(extracted_text)
        
        # Get TF-IDF features
        vec = vectorizer.transform([cleaned])
        
        # Extract additional features
        features = extract_phishing_features(extracted_text)
        feature_values = np.array([[features.get(name, 0) for name in FEATURE_NAMES]]) if FEATURE_NAMES else np.array([[]])
        
        # Combine features (if we have additional features)
        if feature_values.shape[1] > 0:
            combined = np.hstack([vec.toarray(), feature_values])
        else:
            combined = vec.toarray()
        
        # Get prediction
        try:
            prob = model.predict_proba(combined)[0]
            label = model.predict(combined)[0]
            confidence = float(max(prob))
        except:
            # Fallback if model expects different features
            prob = model.predict_proba(vec)[0]
            label = model.predict(vec)[0]
            confidence = float(max(prob))
        
        is_phishing = label == 0
        
        # Find specific indicators
        indicators = find_suspicious_indicators(extracted_text)
        
        # Calculate risk score
        risk_score = calculate_risk_score(indicators, confidence, is_phishing)
        risk_level = get_risk_level(risk_score)
        
        # Determine verdict
        if is_phishing:
            prediction = "Phishing/Fake"
            verdict = "This document appears to be a phishing attempt or fraudulent document."
        else:
            prediction = "Legitimate"
            verdict = "This document appears to be legitimate."
        
        # Build detailed analysis
        warnings = []
        if indicators['suspicious_urls']:
            warnings.append(f"Contains suspicious URLs: {', '.join(indicators['suspicious_urls'][:3])}")
        if indicators['credential_requests']:
            warnings.append(f"Requests sensitive information: {', '.join(indicators['credential_requests'][:5])}")
        if indicators['urgency_indicators']:
            warnings.append(f"Creates false urgency: {', '.join(indicators['urgency_indicators'][:5])}")
        if indicators['threats']:
            warnings.append(f"Contains threats: {', '.join(indicators['threats'][:5])}")
        if indicators['money_indicators']:
            warnings.append(f"Money-related language: {', '.join(indicators['money_indicators'][:5])}")
        
        return JSONResponse({
            "prediction": prediction,
            "confidence": round(confidence, 3),
            "risk_score": risk_score,
            "risk_level": risk_level,
            "verdict": verdict,
            "warnings": warnings,
            "indicators": {
                "urgency": indicators['urgency_indicators'],
                "money": indicators['money_indicators'],
                "credentials": indicators['credential_requests'],
                "threats": indicators['threats'],
                "suspicious_urls": indicators['suspicious_urls'],
                "actions": indicators['action_requests']
            },
            "extracted_text": extracted_text.strip()[:5000],  # Limit text length
            "filename": file.filename
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")
    finally:
        os.remove(tmp_path)
