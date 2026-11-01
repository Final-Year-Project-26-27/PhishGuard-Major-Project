# Run from mlmodel/: python -m pytest tests
from fastapi.testclient import TestClient

from app.main import app
from app.routers import unified_scan

client = TestClient(app)

SCAM = "Pay the registration fee of Rs 2999 within 24 hours to confirm your internship. WhatsApp only: +91 9876543210"
LEGIT = "Your offer letter will be sent via our careers portal. No fees are charged at any stage."


def test_email_confidence_is_0_to_1():
    for text in (SCAM, LEGIT):
        body = client.post("/scan/email/", json={"text_content": text, "sender_domain": "example.com"}).json()
        assert body["prediction"] in {"Legit", "Fake"}
        assert 0 <= body["confidence"] <= 1


def test_trusted_domain_needs_exact_or_subdomain_match():
    assert unified_scan._is_domain_or_subdomain("mail.google.com", "google.com")
    assert not unified_scan._is_domain_or_subdomain("evilgoogle.com", "google.com")


def test_unified_score_keeps_the_most_dangerous_signal(monkeypatch):
    monkeypatch.setattr(unified_scan, "_email_model_score", lambda *_: (95, "Fake", 0.95))
    monkeypatch.setattr(unified_scan, "_link_model_score", lambda *_: (12, "Legit", 0.78))
    body = client.post("/scan/unified/", json={"email_text": SCAM, "url": "https://example.com"}).json()
    assert body["risk_score"] >= 95 - 18 and body["risk_level"] == "HIGH"


def test_unified_ignores_a_spoofable_sender_domain():
    # A fee scam sent from gmail.com used to pass because the old email model trusted the domain
    body = client.post("/scan/unified/", json={"email_text": SCAM, "sender_domain": "gmail.com"}).json()
    assert body["signals"]["email"]["prediction"] == "Fake" and body["risk_level"] == "HIGH"


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


def test_email_scan_flags_fee_scam():
    body = client.post("/scan/email/", json={"text_content": SCAM, "sender_domain": "gmail.com"}).json()
    assert body["prediction"] == "Fake" and body["red_flag_words"]


def test_offer_scan_skips_messages_that_are_not_offers():
    body = client.post("/scan/offer/", json={"message": "Are we still meeting for lunch at 1?"}).json()
    assert body == {"is_offer": False, "prediction": "N/A", "confidence": 0.0, "red_flags": []}


def test_offer_scan_reports_a_percentage():
    body = client.post("/scan/offer/", json={"message": SCAM}).json()
    assert body["prediction"] == "Fake" and 50 < body["confidence"] <= 99


def test_link_scan_trusts_popular_sites_but_not_their_user_content_hosts():
    from app.routers.link_scan import is_well_known

    assert is_well_known("https://github.com/login")
    assert is_well_known("en.wikipedia.org/wiki/Phishing")
    assert not is_well_known("https://sites.google.com/view/anything")      # anyone can publish here
    assert not is_well_known("https://evil-login.godaddysites.com")
    assert not is_well_known("https://github.com.evil-login.xyz/")          # the real domain is evil-login.xyz
    assert not is_well_known("https://dropbox.com/s/abc/invoice.html")      # file-sharing: anyone can host a page


def test_link_trust_cannot_be_borrowed_with_url_tricks():
    from app.routers.link_scan import is_well_known
    from app.utils.url_features import split_url

    # Browsers open evil.com for both of these; neither may borrow github.com's trust
    assert split_url("http://evil.com\\@github.com/")[0] == "evil.com"
    assert not is_well_known("http://evil.com\\@github.com/")
    assert not is_well_known("https://github.com@evil-login.xyz/")
    assert not is_well_known("https://user:pass@github.com/")
    assert split_url("https://git\thub.com/\n")[0] == "github.com"


def test_padding_cannot_hide_a_scam_at_the_end():
    padding = "Our company values teamwork, learning and growth. We are glad to welcome new interns. " * 80
    tail = " To confirm your internship, pay the Rs 2,499 registration fee by UPI to hr.desk@ybl within 24 hours."
    body = client.post("/scan/email/", json={"text_content": padding + tail}).json()
    assert len(padding) > 5000 and body["prediction"] == "Fake" and body["red_flag_words"]
    offer = client.post("/scan/offer/", json={"message": padding + tail}).json()
    assert offer["is_offer"] and offer["prediction"] == "Fake"
    doc = client.post("/scan/doc/", files={"file": ("offer.txt", (padding + tail).encode(), "text/plain")}).json()
    assert doc["prediction"] == "Phishing/Fake"


def test_huge_inputs_are_fast_or_rejected():
    import time

    start = time.perf_counter()
    body = client.post("/scan/email/", json={"text_content": "pay " * 12000}).json()
    assert body["prediction"] in {"Legit", "Fake"} and time.perf_counter() - start < 5
    assert client.post("/scan/email/", json={"text_content": "x" * 50001}).status_code == 422
    assert client.post("/scan/link/", json={"url": "a" * 4097}).status_code == 422
