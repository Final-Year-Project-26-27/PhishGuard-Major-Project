from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse
import json
import os
import re
import uuid
import ipaddress
import socket

from fastapi import APIRouter
from pydantic import BaseModel, Field

import certifi
import urllib3

try:
    from bs4 import BeautifulSoup
except Exception:
    BeautifulSoup = None

from app.routers.link_scan import classify_url
from app.routers.offer_scan import classify_message

router = APIRouter()

SENSITIVE_PATTERNS = {
    "password": re.compile(r"\b(password|passcode|otp|pin)\b", re.IGNORECASE),
    "financial": re.compile(r"\b(account\s*number|ifsc|cvv|credit\s*card|debit\s*card|upi|bank\s*details?)\b", re.IGNORECASE),
    "identity": re.compile(r"\b(aadhaar|pan\s*card|passport|ssn|social\s*security)\b", re.IGNORECASE),
    "personal_email": re.compile(r"[\w.+%-]+@[\w.-]+\.[a-zA-Z]{2,}"),
    "phone": re.compile(r"\b(?:\+?\d{1,3}[\s-]?)?(?:\d[\s-]?){10,12}\b"),
}

EMAIL_SIGNAL_RULES = {
    "urgency": ["urgent", "immediately", "act now", "final notice", "deadline", "expires"],
    "credential_request": ["verify account", "confirm password", "share otp", "reset password"],
    "payment_pressure": ["pay now", "processing fee", "wire transfer", "refund claim"],
}


class UnifiedRiskRequest(BaseModel):
    email_text: Optional[str] = None
    sender_domain: Optional[str] = None
    url: Optional[str] = None
    platform: Optional[str] = None
    trusted_domains: List[str] = Field(default_factory=list)


class ComposeGuardRequest(BaseModel):
    draft_text: str
    recipients: List[str] = Field(default_factory=list)
    trusted_domains: List[str] = Field(default_factory=list)


class FeedbackRequest(BaseModel):
    event_id: Optional[str] = Field(default=None, max_length=64)
    platform: Optional[str] = Field(default=None, max_length=40)
    source: str = Field(default="extension", max_length=40)
    verdict: str = Field(max_length=100)
    is_helpful: bool
    note: Optional[str] = Field(default=None, max_length=500)


# Container filesystems are reset on every deploy; point this at persistent storage in production
FEEDBACK_LOG = Path(os.getenv("FEEDBACK_LOG", "app/models/unified_feedback_log.jsonl"))


class UrlIntelRequest(BaseModel):
    url: str
    trusted_domains: List[str] = Field(default_factory=list)


def _risk_level(score: int) -> str:
    if score >= 75:
        return "HIGH"
    if score >= 45:
        return "MEDIUM"
    return "LOW"


def _to_score_from_prediction(prediction: str, confidence: float) -> int:
    normalized = (prediction or "").lower()
    safe_conf = max(0.0, min(1.0, float(confidence or 0.0)))
    if any(word in normalized for word in ["phishing", "fake", "fraud"]):
        return int(round(safe_conf * 100))
    return int(round((1 - safe_conf) * 55))


def _normalize_domain(domain_or_url: str) -> str:
    candidate = (domain_or_url or "").strip().lower()
    if not candidate:
        return ""

    if "//" in candidate:
        parsed = urlparse(candidate)
        return (parsed.hostname or "").replace("www.", "")

    return candidate.replace("www.", "")


def _email_model_score(email_text: str) -> tuple[int, str, float]:
    # The sender domain is not a model input: it's easy to fake, so it only feeds the trusted-domain adjustment
    prediction, confidence = classify_message(email_text)
    return _to_score_from_prediction(prediction, confidence), prediction, confidence


def _link_model_score(url: str) -> tuple[int, str, float]:
    prediction, confidence, _ = classify_url(url or "")
    return _to_score_from_prediction(prediction, confidence), prediction, confidence


def _email_rule_signals(email_text: str) -> list[str]:
    text = (email_text or "").lower()
    findings: list[str] = []

    for category, words in EMAIL_SIGNAL_RULES.items():
        hits = [word for word in words if word in text]
        if hits:
            findings.append(f"{category.replace('_', ' ')}: {', '.join(hits[:3])}")

    link_count = len(re.findall(r"http[s]?://\S+", text))
    if link_count > 0:
        findings.append(f"contains {link_count} embedded link(s)")

    return findings


def _trusted_domain_adjustment(domain: str, trusted_domains: list[str]) -> tuple[int, Optional[str]]:
    if not domain:
        return 0, None

    normalized_domain = _normalize_domain(domain)
    normalized_trusted = [_normalize_domain(d) for d in trusted_domains if d]

    if any(_is_domain_or_subdomain(normalized_domain, td) for td in normalized_trusted if td):
        return -18, "sender matches trusted domain baseline"

    return 6, "sender is outside trusted-domain baseline"


def _is_domain_or_subdomain(domain: str, trusted: str) -> bool:
    return domain == trusted or domain.endswith("." + trusted)


def _extract_recipient_domains(recipients: list[str]) -> list[str]:
    domains: list[str] = []
    for recipient in recipients:
        text = (recipient or "").strip().lower()
        if "@" in text:
            domains.append(text.split("@")[-1])
    return domains


def _safe_domain_from_url(url: str) -> str:
    try:
        return _normalize_domain(urlparse(url).hostname or "")
    except Exception:
        return ""


def _domain_is_ip(domain: str) -> bool:
    try:
        ipaddress.ip_address(domain)
        return True
    except Exception:
        return False


def _public_ip(hostname: str) -> Optional[str]:
    """The host's IP if every address it resolves to is public, else None."""
    try:
        addresses = {info[4][0] for info in socket.getaddrinfo(hostname, None)}
    except (socket.gaierror, UnicodeError):
        return None
    if not addresses or not all(ipaddress.ip_address(a).is_global for a in addresses):
        return None
    return sorted(addresses)[0]


def _fetch_pinned(parsed, ip: str, headers: dict[str, str]) -> str:
    """GET the page from the IP we already checked. Connecting by IP (with the real hostname
    for TLS) means DNS can't be switched to a private address between the check and the fetch."""
    host = parsed.hostname or ""
    https = parsed.scheme == "https"
    port = parsed.port or (443 if https else 80)
    if https:
        pool = urllib3.HTTPSConnectionPool(
            ip, port=port, timeout=4, retries=False, server_hostname=host,
            assert_hostname=host, cert_reqs="CERT_REQUIRED", ca_certs=certifi.where(),
        )
    else:
        pool = urllib3.HTTPConnectionPool(ip, port=port, timeout=4, retries=False)
    path = (parsed.path or "/") + (f"?{parsed.query}" if parsed.query else "")
    response = pool.request("GET", path, headers={**headers, "Host": host}, redirect=False, preload_content=False)
    try:
        charset = re.search(r"charset=([\w-]+)", response.headers.get("Content-Type", ""))
        return response.read(450000, decode_content=True).decode(charset.group(1) if charset else "utf-8", errors="replace")
    finally:
        response.release_conn()


def _scrape_url_signals(url: str) -> tuple[int, list[str], dict[str, str]]:
    score = 0
    reasons: list[str] = []
    snapshot = {
        "title": "",
        "meta_description": "",
    }

    parsed = urlparse(url)
    domain = _normalize_domain(parsed.hostname or "")
    path_and_query = f"{parsed.path or ''}?{parsed.query or ''}"
    risky_tlds = {"tk", "ml", "ga", "cf", "gq", "zip", "mov", "cam", "work", "top"}

    if parsed.scheme != "https":
        score += 10
        reasons.append("url does not use HTTPS")

    if len(url) > 120:
        score += 10
        reasons.append("unusually long URL")

    if "@" in url:
        score += 12
        reasons.append("contains @ obfuscation in URL")

    if _domain_is_ip(domain):
        score += 16
        reasons.append("uses raw IP address as hostname")

    if "xn--" in domain:
        score += 12
        reasons.append("contains punycode hostname")

    tld = domain.split(".")[-1] if "." in domain else ""
    if tld in risky_tlds:
        score += 12
        reasons.append("domain uses high-risk TLD")

    if re.search(r"(verify|secure|login|update|wallet|bank|signin)", domain + path_and_query, re.IGNORECASE):
        score += 8
        reasons.append("impersonation-style keywords found in URL")

    if BeautifulSoup is None:
        reasons.append("web scraping libraries unavailable; used structural URL heuristics only")
        return min(100, score), reasons, snapshot

    ip = _public_ip(parsed.hostname or "") if parsed.scheme in ("http", "https") else None
    if ip is None:
        reasons.append("page not fetched (non-public address); used URL heuristics")
        return min(100, score), reasons, snapshot

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; SafeNetAI-LinkScanner/1.0)"
        }
        html = _fetch_pinned(parsed, ip, headers)
        soup = BeautifulSoup(html, "html.parser")

        title = (soup.title.string.strip() if soup.title and soup.title.string else "")
        meta = soup.find("meta", attrs={"name": re.compile("description", re.IGNORECASE)})
        meta_desc = (meta.get("content", "") or "").strip() if meta else ""
        snapshot["title"] = title[:180]
        snapshot["meta_description"] = meta_desc[:220]

        combined = f"{title} {meta_desc}".lower()
        if re.search(r"(verify|suspended|password|confirm|bank|limited time|urgent)", combined):
            score += 10
            reasons.append("page title/meta uses urgency or credential bait terms")

        forms = soup.find_all("form")
        if forms:
            score += 6
            reasons.append("page contains data collection form")

        password_inputs = soup.find_all("input", attrs={"type": re.compile("password", re.IGNORECASE)})
        if password_inputs:
            score += 14
            reasons.append("page requests password input")

        external_form_action_found = False
        for form in forms[:8]:
            action = (form.get("action") or "").strip()
            if action.startswith("http"):
                action_domain = _safe_domain_from_url(action)
                if action_domain and action_domain != domain:
                    external_form_action_found = True
                    break
        if external_form_action_found:
            score += 16
            reasons.append("form submits to external domain")

        iframe_count = len(soup.find_all("iframe"))
        if iframe_count >= 3:
            score += 8
            reasons.append("page uses many embedded iframes")

    except Exception:
        reasons.append("live page content could not be fetched; used URL heuristics")

    return min(100, score), reasons, snapshot


@router.post("/")
def unified_risk_scan(payload: UnifiedRiskRequest):
    event_id = str(uuid.uuid4())
    reasons: list[str] = []
    raw_scores: list[int] = []

    email_prediction = None
    link_prediction = None

    if payload.email_text and len(payload.email_text.strip()) >= 10:
        email_score, prediction, confidence = _email_model_score(payload.email_text)
        email_prediction = {
            "prediction": prediction,
            "confidence": round(confidence, 3),
            "risk_score": email_score,
        }
        raw_scores.append(email_score)
        reasons.extend(_email_rule_signals(payload.email_text))

    if payload.url:
        link_score, prediction, confidence = _link_model_score(payload.url)
        link_prediction = {
            "prediction": prediction,
            "confidence": round(confidence, 3),
            "risk_score": link_score,
        }
        raw_scores.append(link_score)

        domain = _normalize_domain(payload.url)
        if any(token in domain for token in ["login", "verify", "secure", "update"]):
            reasons.append("url uses social-engineering style domain tokens")

    if not raw_scores:
        return {
            "event_id": event_id,
            "risk_score": 0,
            "risk_level": "LOW",
            "recommendation": "allow",
            "explanations": ["No valid scan input provided."],
            "signals": {
                "email": email_prediction,
                "link": link_prediction,
            },
        }

    base_score = max(raw_scores)
    adjustment, adjustment_reason = _trusted_domain_adjustment(payload.sender_domain or "", payload.trusted_domains)
    final_score = max(0, min(100, base_score + adjustment))

    if adjustment_reason:
        reasons.append(adjustment_reason)

    level = _risk_level(final_score)
    recommendation = "allow"
    if level == "MEDIUM":
        recommendation = "warn"
    if level == "HIGH":
        recommendation = "block_or_step_up"

    explanations = reasons[:6] if reasons else ["Model confidence-based risk scoring applied."]

    return {
        "event_id": event_id,
        "risk_score": final_score,
        "risk_level": level,
        "recommendation": recommendation,
        "explanations": explanations,
        "signals": {
            "email": email_prediction,
            "link": link_prediction,
        },
    }


@router.post("/compose-guard")
def compose_guard_scan(payload: ComposeGuardRequest):
    text = payload.draft_text or ""
    hits: list[dict[str, object]] = []

    for label, pattern in SENSITIVE_PATTERNS.items():
        matches = pattern.findall(text)
        if matches:
            sample = matches[0]
            if isinstance(sample, tuple):
                sample = " ".join(str(item) for item in sample if item)
            hits.append({
                "category": label,
                "count": len(matches),
                "sample": str(sample)[:80],
            })

    recipient_domains = _extract_recipient_domains(payload.recipients)
    trusted = [_normalize_domain(domain) for domain in payload.trusted_domains]
    external_domains = [
        domain for domain in recipient_domains if trusted and not any(_is_domain_or_subdomain(domain, td) for td in trusted)
    ]

    risk_score = min(100, len(hits) * 18 + len(external_domains) * 14)
    should_confirm = risk_score >= 30

    action = "send"
    if risk_score >= 65:
        action = "block_or_confirm"
    elif risk_score >= 30:
        action = "confirm"

    message = "No major sensitive-data indicators found."
    if should_confirm:
        message = "Sensitive details detected. Confirm before sending externally."

    return {
        "risk_score": risk_score,
        "risk_level": _risk_level(risk_score),
        "should_confirm": should_confirm,
        "recommended_action": action,
        "sensitive_hits": hits,
        "external_domains": external_domains,
        "message": message,
    }


@router.post("/url-intel")
def url_intel_scan(payload: UrlIntelRequest):
    event_id = str(uuid.uuid4())
    url = payload.url.strip()

    model_score, prediction, confidence = _link_model_score(url)
    scrape_score, scrape_reasons, snapshot = _scrape_url_signals(url)

    domain = _safe_domain_from_url(url)
    trusted_domains = [_normalize_domain(d) for d in payload.trusted_domains if d]
    trusted_adjustment = -20 if domain and any(_is_domain_or_subdomain(domain, d) for d in trusted_domains if d) else 0
    trusted_reason = "trusted-domain baseline match" if trusted_adjustment < 0 else None

    final_score = int(round(model_score * 0.55 + scrape_score * 0.45 + trusted_adjustment))
    final_score = max(0, min(100, final_score))

    reasons = [
        f"ML model prediction: {prediction} ({round(confidence * 100)}% confidence)",
        *scrape_reasons[:6],
    ]
    if trusted_reason:
        reasons.append(trusted_reason)

    level = _risk_level(final_score)
    recommendation = "allow"
    if level == "MEDIUM":
        recommendation = "warn"
    if level == "HIGH":
        recommendation = "block"

    return {
        "event_id": event_id,
        "url": url,
        "domain": domain,
        "risk_score": final_score,
        "risk_level": level,
        "recommendation": recommendation,
        "model": {
            "prediction": prediction,
            "confidence": round(confidence, 3),
            "risk_score": model_score,
        },
        "scrape": {
            "risk_score": scrape_score,
            "snapshot": snapshot,
        },
        "explanations": reasons,
    }


@router.post("/feedback")
def submit_feedback(payload: FeedbackRequest):
    feedback_path = FEEDBACK_LOG
    feedback_path.parent.mkdir(parents=True, exist_ok=True)

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_id": payload.event_id,
        "platform": payload.platform,
        "source": payload.source,
        "verdict": payload.verdict,
        "is_helpful": payload.is_helpful,
        "note": payload.note,
    }

    with feedback_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record) + "\n")

    return {
        "saved": True,
        "record": record,
    }
