# app/utils/url_features.py
# URL normalisation and features for the link model. Used by train/train_link_model.py and the
# routers, so training and serving always see a URL the same way.
import ipaddress
import math
import re
from urllib.parse import urlsplit

import numpy as np
import tldextract

# Bundled public-suffix snapshot (no network). Private suffixes on, so foo.github.io is its own site.
_extract = tldextract.TLDExtract(suffix_list_urls=(), include_psl_private_domains=True)

# Brands scammers imitate, most of all the ones Indian students deal with
BRANDS = [
    "paypal", "apple", "icloud", "microsoft", "outlook", "office365", "amazon", "netflix", "google", "gmail",
    "facebook", "instagram", "whatsapp", "linkedin", "telegram", "coinbase", "binance", "metamask", "dhl",
    "fedex", "sbi", "hdfc", "icici", "axis", "kotak", "paytm", "phonepe", "gpay", "airtel", "jio", "flipkart",
    "naukri", "internshala", "indeed", "tcs", "infosys", "wipro", "aadhaar", "uidai", "incometax", "irctc",
]
LURE_WORDS = [
    "login", "signin", "verify", "verification", "secure", "account", "update", "confirm", "wallet", "bank",
    "support", "unlock", "suspend", "recover", "billing", "payment", "kyc", "reward", "claim", "gift", "free",
    "bonus", "invoice", "refund", "auth", "webscr", "helpdesk",
]


def split_url(url: str) -> tuple[str, str, str]:
    """(host without www, path without query/fragment, original lowercased url)"""
    # Read the URL the way a browser does: it drops tabs/newlines and treats "\" as "/", so
    # "evil.com\@github.com" opens evil.com and must not parse as github.com here
    raw = re.sub(r"[\t\r\n]", "", str(url or "")).strip().lower().replace("\\", "/")
    candidate = raw if "://" in raw else "http://" + raw
    try:
        parts = urlsplit(candidate)
        host = parts.hostname or ""
        path = parts.path or ""
    except ValueError:
        host, path = "", ""
    host = re.sub(r"^www\d*\.", "", host.strip("."))
    return host, path.rstrip("/"), raw


def normalize_url(url: str) -> str:
    """What the model reads: host + path. Scheme, www, query and fragment are dropped, because the
    extension only sends origin + path and because "https"/"www" say nothing about intent."""
    host, path, _ = split_url(url)
    return (host + path)[:300]


def registrable_domain(host: str) -> str:
    """nmamit.nitte.edu.in -> nitte.edu.in; abc.github.io -> abc.github.io"""
    if _is_ip(host):
        return host
    ext = _extract(host)
    return ext.top_domain_under_public_suffix or host


def _is_ip(host: str) -> bool:
    try:
        ipaddress.ip_address(host.strip("[]"))
        return True
    except ValueError:
        return False


def _entropy(s: str) -> float:
    if not s:
        return 0.0
    counts = {c: s.count(c) for c in set(s)}
    return -sum(n / len(s) * math.log2(n / len(s)) for n in counts.values())


def _mentions_brand(host: str) -> bool:
    # Short names (sbi, jio, tcs) only as a whole token, so "website" or "rajio" don't count
    tokens = re.split(r"[.\-]", host)
    return any(t == b if len(b) <= 4 else b in t for t in tokens for b in BRANDS)


def lexical_features(url: str) -> list[float]:
    host, path, raw = split_url(url)
    ip = _is_ip(host)
    reg = registrable_domain(host)
    reg_label = reg.split(".")[0]
    sub = host[: -len(reg)].rstrip(".") if not ip and host.endswith(reg) else ""
    digits = sum(c.isdigit() for c in host)
    return [
        len(host),
        len(path),
        host.count(".") + 1 if host else 0,
        sub.count(".") + 1 if sub else 0,
        host.count("-"),
        digits,
        digits / max(len(host), 1),
        _entropy(host),
        int(ip),
        int("xn--" in host),
        int("@" in raw.split("?")[0]),
        int(bool(re.search(r":\d+$", raw.split("/")[2] if raw.count("/") >= 2 else ""))),
        path.count("/"),
        sum(c.isdigit() for c in path),
        # "paypal" in paypal-secure-login.com, or sbi in sbi.kyc-update.xyz, but the site isn't the brand's own
        int(_mentions_brand(host) and reg_label not in BRANDS),
        sum(w in host for w in LURE_WORDS),
        sum(w in path for w in LURE_WORDS),
        len(reg),
        len(reg.rsplit(".", 1)[-1]) if "." in reg else 0,
    ]


# Module-level so the pickled pipeline can find them (FunctionTransformer stores a reference)
def url_texts(urls) -> list[str]:
    return [normalize_url(u) for u in urls]


def url_matrix(urls) -> np.ndarray:
    return np.array([lexical_features(u) for u in urls], dtype=float)
