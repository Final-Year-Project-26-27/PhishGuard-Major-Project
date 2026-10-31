"""
pipeline/l1_authentication.py — SPF / DKIM / DMARC verification + display name spoofing.

Mirrors Microsoft EOP's L1 edge filter (cryptographic sender authentication).

Gmail includes all auth results in the 'Authentication-Results' header when
it receives inbound mail. We parse that header rather than performing live DNS
queries, since Gmail has already done the verification on the receiving MTA.

Only Gmail's own header is trusted (authserv-id mx.google.com). If it is missing, every
result counts as "none"; there is no DNS fallback, because finding an SPF record says nothing
about whether this message came from an allowed server.

Maximum contribution: 4 points (L1_CAP in scoring.py).
"""

import re
import logging

from pipeline.email_parser import EmailContext

logger = logging.getLogger(__name__)

# ── Display name spoofing keywords ───────────────────────────────────────────
# If the From display name contains any of these while the actual email domain
# doesn't match the implied organization, that's a spoofing signal.
_SPOOF_KEYWORDS = re.compile(
    r'\b(admin|security|helpdesk|it[\s\-]support|university|professor|'
    r'noreply|no-reply|hr|payroll|accounts?|finance|registrar|bursar)\b',
    re.IGNORECASE,
)

_FREE_DOMAINS = frozenset({
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
    "aol.com", "protonmail.com", "icloud.com", "live.com",
    "mail.com", "zoho.com", "yandex.com", "gmx.com",
})

# ── Auth-Results parser ───────────────────────────────────────────────────────
_AUTH_RE = re.compile(r'(spf|dkim|dmarc)=(\S+)', re.IGNORECASE)
# The receiving server that writes the Authentication-Results we trust
_TRUSTED_AUTHSERV_ID = "mx.google.com"


def _parse_auth_results(headers: dict) -> dict[str, str]:
    """
    Extract spf=, dkim=, dmarc= results from the Authentication-Results header.

    Returns:
        dict like {"spf": "pass", "dkim": "fail", "dmarc": "none"}
        Missing checks default to "none".
    """
    auth_header = headers.get("authentication-results", "")
    results = {"spf": "none", "dkim": "none", "dmarc": "none"}
    if auth_header.split(";", 1)[0].strip().lower() != _TRUSTED_AUTHSERV_ID:
        return results
    seen: set[str] = set()
    for key, val in _AUTH_RE.findall(auth_header):
        key = key.lower()
        if key not in seen:  # first result per method; later ones may be injected text
            seen.add(key)
            results[key] = val.lower().rstrip(";")
    return results


def _check_spf(auth: dict, sender_domain: str, headers: dict) -> tuple[int, str | None]:
    """
    Score the SPF result from Gmail's Authentication-Results.

    Returns:
        (score_delta, reason_string | None)
    """
    result = auth.get("spf", "none")

    if result == "fail":
        return 3, f"L1:spf_fail (sender_domain={sender_domain})"
    if result in ("softfail", "neutral", "none", "temperror", "permerror"):
        return 1, f"L1:spf_{result} (sender_domain={sender_domain})"
    return 0, None  # pass


def _check_dkim(auth: dict) -> tuple[int, str | None]:
    """Score DKIM result from Authentication-Results."""
    result = auth.get("dkim", "none")
    if result in ("fail", "none", "permerror", "temperror"):
        return 2, f"L1:dkim_{result}"
    return 0, None


def _check_dmarc(auth: dict) -> tuple[int, str | None]:
    """Score DMARC result from Authentication-Results."""
    result = auth.get("dmarc", "none")
    if result == "fail":
        return 3, f"L1:dmarc_fail"
    if result in ("none", "temperror", "permerror"):
        return 1, f"L1:dmarc_{result}"
    return 0, None


def _check_display_name_spoofing(
    sender: str, sender_domain: str
) -> tuple[int, str | None]:
    """
    Check if the From display name contains institutional-sounding keywords
    while the actual sending domain is a free provider.

    Example: "IT Support <attacker@gmail.com>" → spoofing signal.
    """
    if not sender:
        return 0, None

    display_name = sender.split("<")[0].strip().strip('"')
    if not display_name:
        return 0, None

    has_keyword = bool(_SPOOF_KEYWORDS.search(display_name))
    is_free = sender_domain in _FREE_DOMAINS

    if has_keyword and is_free:
        return 2, (
            f"L1:display_name_spoofing "
            f"(display={display_name!r}, domain={sender_domain})"
        )
    return 0, None


def check_authentication(ctx: EmailContext) -> tuple[int, list[str]]:
    """
    Run all L1 authentication checks against the email context.

    Stages:
        1. SPF (from Authentication-Results header or DNS fallback)
        2. DKIM (from Authentication-Results header)
        3. DMARC (from Authentication-Results header)
        4. Display name spoofing heuristic

    Args:
        ctx: Parsed EmailContext from email_parser.parse_email().

    Returns:
        (total_score, list_of_fired_reason_strings)
        Score is not capped here — scoring.py applies the L1_CAP.
    """
    auth = _parse_auth_results(ctx.headers)
    total = 0
    reasons: list[str] = []

    checks = [
        _check_spf(auth, ctx.sender_domain, ctx.headers),
        _check_dkim(auth),
        _check_dmarc(auth),
        _check_display_name_spoofing(ctx.sender, ctx.sender_domain),
    ]

    for score, reason in checks:
        if score > 0 and reason:
            total += score
            reasons.append(reason)

    logger.info(
        "[L1] [%s] spf=%s dkim=%s dmarc=%s score=%d",
        ctx.message_id,
        auth.get("spf"),
        auth.get("dkim"),
        auth.get("dmarc"),
        total,
    )

    return total, reasons
