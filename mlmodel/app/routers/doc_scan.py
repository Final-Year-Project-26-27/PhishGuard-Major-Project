# app/routers/doc_scan.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import joblib
import tempfile
import re
from urllib.parse import urlparse

from app.utils.doc_parser import extract_text_from_pdf, extract_text_from_docx
from app.utils.doc_features import PHISHING_INDICATORS
from app.utils.message_features import windows

router = APIRouter()

# One pipeline: TF-IDF + indicator features + logistic regression (train/train_doc_model.py)
model = joblib.load("app/models/doc_model.pkl")


def _has_term(term, text_lower):
    """Whole-word match, so 'rs' does not match 'yours' (works for symbols like '₹' too)"""
    return re.search(r'(?<!\w)' + re.escape(term.lower()) + r'(?!\w)', text_lower) is not None


def _is_suspicious_url(url, suspicious_domains):
    """Check the URL's hostname, so '.co' matches 'x.co' but not 'tcs.com'"""
    host = (urlparse(url).hostname or '').lower()
    return any(host.endswith(d) if d.startswith('.') else d in host for d in suspicious_domains)


def find_suspicious_indicators(text):
    """Find specific suspicious indicators in the document"""
    text_lower = text.lower()
    # Warnings shown to the user match whole words. The model's own features still use plain
    # substring counts, because that's what it was trained on.
    categories = {
        'urgency_indicators': 'urgency_words',
        'money_indicators': 'money_words',
        'credential_requests': 'credential_words',
        'threats': 'threat_words',
        'action_requests': 'action_words',
    }
    findings = {
        key: sorted({w for w in PHISHING_INDICATORS.get(source, []) if _has_term(w, text_lower)})
        for key, source in categories.items()
    }

    urls = re.findall(r'http[s]?://[^\s<>"{}|\\^`\[\]]+', text)
    domains = [d.lower() for d in PHISHING_INDICATORS.get('suspicious_domains', [])]
    findings['suspicious_urls'] = sorted({u for u in urls if _is_suspicious_url(u, domains)})

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
    # 75 / 45 are the same cut-offs the v2 dashboard and unified scan use. Change them together.
    if risk_score >= 75:
        return "HIGH"
    elif risk_score >= 45:
        return "MEDIUM"
    else:
        return "LOW"


MAX_UPLOAD_BYTES = 5 * 1024 * 1024


# Not async on purpose: FastAPI runs plain functions in a thread pool, so a slow PDF
# won't hold up link and email scans.
@router.post("/")
def predict_doc(file: UploadFile = File(...)):
    ext = file.filename.split('.')[-1].lower()
    if ext not in ["pdf", "docx", "txt"]:
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, or TXT files are supported")

    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 5 MB)")

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(data)
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

        # The whole text, plus its last part on its own for a long document, so a fee demand at the
        # end of a padded letter isn't missed; the less legit verdict wins
        p_legit = float(model.predict_proba([extracted_text] + windows(extracted_text)[1:])[:, 1].min())
        is_phishing = p_legit < 0.5
        confidence = min(1 - p_legit if is_phishing else p_legit, 0.99)  # never claim certainty
        
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
