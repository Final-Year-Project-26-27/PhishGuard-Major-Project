# Run from mlmodel/: python -m pytest tests
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
SAMPLES = Path(__file__).resolve().parents[2] / "test_documents"


def scan_doc(path):
    with open(path, "rb") as f:
        return client.post("/scan/doc/", files={"file": (path.name, f, "text/plain")})


def test_phishing_samples_are_flagged():
    for path in SAMPLES.glob("PHISHING_*.txt"):
        assert scan_doc(path).json()["prediction"] == "Phishing/Fake", path.name


def test_legitimate_samples_have_no_false_warnings():
    for path in SAMPLES.glob("LEGITIMATE_*.txt"):
        body = scan_doc(path).json()
        assert body["prediction"] == "Legitimate", path.name
        assert body["indicators"]["suspicious_urls"] == [], path.name
        assert "rs" not in body["indicators"]["money"], path.name


def test_oversized_upload_is_rejected():
    big = ("big.txt", b"a" * (5 * 1024 * 1024 + 1), "text/plain")
    assert client.post("/scan/doc/", files={"file": big}).status_code == 413


def test_email_and_link_return_known_labels():
    email = client.post("/scan/email/", json={"text_content": "Your internship offer letter", "sender_domain": "tcs.com"}).json()
    assert email["prediction"] in {"Legit", "Fake"} and 0 <= email["confidence"] <= 1
    link = client.post("/scan/link/", json={"url": "https://example.com"}).json()
    assert link["prediction"] in {"Legit", "Phishing"} and 0 <= link["confidence"] <= 1
