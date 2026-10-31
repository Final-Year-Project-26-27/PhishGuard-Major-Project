# Run from mlmodel/: python -m pytest tests
from fastapi.testclient import TestClient

from app.main import app
from app.routers import unified_scan
from app.utils.preprocess import clean_email_text
from train.train_email_model import clean_text as train_clean_text

client = TestClient(app)

SCAM = "Pay the registration fee of Rs 2999 within 24 hours to confirm your internship. WhatsApp only: +91 9876543210"
LEGIT = "Your offer letter will be sent via our careers portal. No fees are charged at any stage."


def test_email_confidence_is_0_to_1():
    for text in (SCAM, LEGIT):
        body = client.post("/scan/email/", json={"text_content": text, "sender_domain": "example.com"}).json()
        assert body["prediction"] in {"Legit", "Fake"}
        assert 0 <= body["confidence"] <= 1


def test_email_serving_cleaner_matches_training():
    for text in ("Don't miss: e-mail http://x.co/a NOW!!", SCAM, LEGIT, "₹500 fee @ 9am"):
        assert clean_email_text(text) == train_clean_text(text)


def test_trusted_domain_needs_exact_or_subdomain_match():
    assert unified_scan._is_domain_or_subdomain("mail.google.com", "google.com")
    assert not unified_scan._is_domain_or_subdomain("evilgoogle.com", "google.com")


def test_unified_score_keeps_the_most_dangerous_signal(monkeypatch):
    monkeypatch.setattr(unified_scan, "_email_model_score", lambda *_: (95, "Fake", 0.95))
    monkeypatch.setattr(unified_scan, "_link_model_score", lambda *_: (12, "Legit", 0.78))
    body = client.post("/scan/unified/", json={"email_text": SCAM, "url": "https://example.com"}).json()
    assert body["risk_score"] >= 95 - 18 and body["risk_level"] == "HIGH"


def test_url_intel_never_fetches_internal_addresses():
    assert unified_scan._public_ip("127.0.0.1") is None
    assert unified_scan._public_ip("169.254.169.254") is None
    body = client.post("/scan/unified/url-intel", json={"url": "http://127.0.0.1:8000/health"}).json()
    assert any("not fetched" in reason for reason in body["explanations"])


def test_feedback_rejects_oversized_fields():
    payload = {"verdict": "correct_alert", "is_helpful": True, "note": "x" * 501}
    assert client.post("/scan/unified/feedback", json=payload).status_code == 422


def test_doc_scan_rejects_oversized_upload():
    big = ("big.txt", b"a" * (5 * 1024 * 1024 + 1), "text/plain")
    assert client.post("/scan/doc/", files={"file": big}).status_code == 413


def test_doc_scan_has_no_substring_false_positives():
    text = b"Dear candidate, yours sincerely. Verify your joining at https://tcs.com/verify within office hours."
    body = client.post("/scan/doc/", files={"file": ("offer.txt", text, "text/plain")}).json()
    assert body["indicators"]["suspicious_urls"] == []
    assert "rs" not in body["indicators"]["money"]


def test_offer_patterns_match_training():
    import train.train_offer_model as train_offer
    from app.routers import offer_scan

    for name in ("PAYMENT_DEMAND_PATTERNS", "URGENCY_PATTERNS", "SUSPICIOUS_LINK_PATTERNS", "WHATSAPP_ONLY_PATTERNS",
                 "TOO_GOOD_PATTERNS", "CREDENTIAL_PATTERNS", "PRESSURE_PATTERNS", "LEGIT_INDICATORS"):
        assert getattr(train_offer, name) == getattr(offer_scan, name), name


def test_email_scan_flags_fee_scam():
    body = client.post("/scan/email/", json={"text_content": SCAM, "sender_domain": "gmail.com"}).json()
    assert body["prediction"] == "Fake" and body["red_flag_words"]
