"""
Build datasets/links.csv and app/models/trusted_domains.json from public URL sources.

Run from mlmodel/:  python -m train.build_link_dataset <raw_dir>

<raw_dir> must hold (see datasets/SOURCES.md for where each comes from):
  phishtank.csv                      PhishTank verified online phish
  openphish.txt                      OpenPhish community feed
  pdb_active_links.txt               Phishing.Database active links
  PhiUSIIL_Phishing_URL_Dataset.csv  PhiUSIIL (UCI): phishing and legitimate URLs
  top-1m.csv                         Tranco top sites
  cc_legit.jsonl                     real page URLs of popular sites, read from their own sitemaps

Every URL is stored normalised (host + path, see app/utils/url_features.py). Bare domains and URLs
with a path are balanced separately, so "has a path" alone can't tell the classes apart.
"""
import json
import random
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

import pandas as pd

from app.utils.url_features import normalize_url, registrable_domain, split_url

SEED = 42
PER_STRATUM = {"bare": 45000, "path": 45000}
TRUSTED_TOP_N = 10000
MUST_KEEP = 5000
PER_SITE = 50
SUBDOMAIN_LABELS = [
    "careers", "jobs", "placement", "placements", "mail", "webmail", "blog", "shop", "store", "support", "help",
    "docs", "portal", "student", "students", "exam", "results", "admissions", "library", "alumni", "news",
    "events", "app", "my", "m", "en", "in", "api", "dev", "cdn", "static", "media", "forum", "community",
    "learn", "lms", "erp", "hr", "intranet", "research", "dept", "cse", "ece", "status", "investors",
]
# A short link's destination is unknown, so a shortener is never trusted however popular it is
SHORTENERS = {
    "bit.ly", "bitly.com", "tinyurl.com", "t.co", "goo.gl", "forms.gle", "is.gd", "v.gd", "rb.gy", "cutt.ly",
    "ow.ly", "buff.ly", "rebrand.ly", "shorturl.at", "tiny.cc", "s.id", "lnkd.in", "qrco.de", "t.ly", "linktr.ee",
    "shorte.st", "adf.ly", "tinyurl.is", "surl.li", "u.to", "clck.ru", "reurl.cc", "ln.run",
}


def load_phish(raw: Path) -> pd.DataFrame:
    rows = [(u, "phishtank") for u in pd.read_csv(raw / "phishtank.csv")["url"]]
    rows += [(u, "openphish") for u in (raw / "openphish.txt").read_text().split()]
    p = pd.read_csv(raw / "PhiUSIIL_Phishing_URL_Dataset.csv", usecols=["URL", "label"])
    rows += [(u, "phiusiil") for u in p.loc[p.label == 0, "URL"]]
    pdb = (raw / "pdb_active_links.txt").read_text(encoding="utf-8", errors="replace").split()
    rows += [(u, "phishing_database") for u in random.Random(SEED).sample(pdb, min(150000, len(pdb)))]
    return pd.DataFrame(rows, columns=["raw", "source"]).assign(label=0)


def load_legit(raw: Path) -> pd.DataFrame:
    p = pd.read_csv(raw / "PhiUSIIL_Phishing_URL_Dataset.csv", usecols=["URL", "label"])
    rows = [(u, "phiusiil") for u in p.loc[p.label == 1, "URL"]]
    tranco = [line.split(",", 1)[1].strip() for line in (raw / "top-1m.csv").read_text().splitlines()]
    # The most visited sites are kept whatever the sampling below picks
    rows += [(d, "tranco_top" if i < MUST_KEEP else "tranco") for i, d in enumerate(tranco[:150000])]
    # Popularity lists hold bare domains, so without these the model would read any subdomain
    # (careers.infosys.com, placement.nmamit.in) as phishing. A subdomain belongs to the site's owner.
    # Lure words (login, secure, verify) are left out on purpose.
    rng = random.Random(SEED)
    rows += [(f"{rng.choice(SUBDOMAIN_LABELS)}.{d}", "tranco_subdomain")
             for d in rng.sample(tranco[1000:150000], 12000)]
    for line in (raw / "cc_legit.jsonl").read_text(encoding="utf-8").splitlines():
        url = json.loads(line)["url"]
        if url:
            rows.append((url, "sitemaps"))
    return pd.DataFrame(rows, columns=["raw", "source"]).assign(label=1)


def trusted_domains(raw: Path, phish_urls: list[str]) -> dict:
    """Tranco's top sites, minus what phishing has been hosted on:
    - a platform where anyone gets a subdomain (anything.godaddysites.com: phish on many different
      subdomains), a shortener, or a site with 3+ phish on its own address (bit.ly/x, a hacked site)
      is out entirely;
    - otherwise only the subdomains that served phish 3+ times are (sites.google.com, not mail.google.com).
    Open-redirect abuse on a big site's own address (google.com/url?q=...) doesn't count: the
    redirect points elsewhere, and the site itself is fine."""
    top_set = set(_top_domains(raw, TRUSTED_TOP_N))
    apex_hits: dict[str, int] = {}
    sub_hosts: dict[str, dict[str, int]] = {}
    for url in phish_urls:
        host = split_url(url)[0]
        reg = registrable_domain(host)
        if reg not in top_set:
            continue
        if host == reg:
            # google.com/url?q=..., google.com/amp/s/..., linkedin.com/redir?... are open-redirect abuse
            # and don't count; any other phish on the site's own address (bit.ly/AbC12, a hacked
            # page) does
            path = urlsplit(url if "://" in url else "http://" + url).path or ""
            if "?" not in url and not re.match(r"(?i)/+(amp|url|redir|redirect|r|out|away|link)\b", path):
                apex_hits[reg] = apex_hits.get(reg, 0) + 1
        else:
            hosts = sub_hosts.setdefault(reg, {})
            hosts[host] = hosts.get(host, 0) + 1

    def first_labels(reg: str) -> set[str]:
        return {h[: -len(reg) - 1].rsplit(".", 1)[-1] for h in sub_hosts.get(reg, ())}

    banned = {reg for reg in top_set if apex_hits.get(reg, 0) >= 3 or len(first_labels(reg)) >= 25} | SHORTENERS
    # One stray report doesn't cost a service host (meet.google.com) its trust; three do
    risky_hosts = {h for reg, hosts in sub_hosts.items() if reg not in banned for h, n in hosts.items() if n >= 3}
    return {
        "domains": sorted(top_set - banned),
        # Shorteners hide where a link really goes, so the API answers them like any shared host
        "untrusted_hosts": sorted(risky_hosts | SHORTENERS),
        "note": f"Tranco top {TRUSTED_TOP_N} registrable domains minus sites and hosts seen serving phishing",
    }


def _top_domains(raw: Path, n: int) -> list[str]:
    tranco = [line.split(",", 1)[1].strip() for line in (raw / "top-1m.csv").read_text().splitlines()]
    return list(dict.fromkeys(registrable_domain(d) for d in tranco[: n * 2]))[:n]


def main(raw_dir: str) -> None:
    raw = Path(raw_dir)
    df = pd.concat([load_phish(raw), load_legit(raw)], ignore_index=True)
    df["url"] = df["raw"].map(normalize_url)
    df["host"] = df["url"].map(lambda u: split_url(u)[0])
    df = df[df["host"].str.contains(r"\.", regex=True)]

    # Phish hosted on the biggest platforms (docs.google.com/forms, linkedin.com/redir) looks exactly like
    # the platform's own pages, so the URL can't tell them apart; leave it to the live page check
    platforms = set(_top_domains(raw, 1000))
    df = df[~((df.label == 0) & df["host"].map(registrable_domain).isin(platforms))]
    # A URL listed on both sides is unreliable either way
    conflicts = df.groupby("url")["label"].nunique()
    df = df[~df["url"].isin(conflicts[conflicts > 1].index)]
    # When a URL comes from several lists, keep the top-sites copy so the sampling below can't drop it
    df = df.sort_values("source", key=lambda s: s != "tranco_top", kind="stable").drop_duplicates("url")
    # Popularity lists occasionally include phishing sites; a bare host confirmed as phish can't be a legit example
    phish_hosts = set(df.loc[(df.label == 0) & (df["url"] == df["host"]), "host"])
    df = df[~((df.label == 1) & df["host"].isin(phish_hosts))]

    # At most PER_SITE URLs from one site, so a single redirector (qrco.de had 2,000+) can't dominate
    df["domain"] = df["host"].map(registrable_domain)
    df = df.sample(frac=1, random_state=SEED).groupby("domain", group_keys=False).head(PER_SITE)
    df["stratum"] = (df["url"] != df["host"]).map({True: "path", False: "bare"})
    parts = []
    for stratum, cap in PER_STRATUM.items():
        sub = df[df.stratum == stratum]
        n = min(cap, (sub.label == 0).sum(), (sub.label == 1).sum())
        for label in (0, 1):
            side = sub[sub.label == label]
            keep = side[side.source.isin(["tranco_top", "tranco_subdomain"])]
            parts += [keep, side.drop(keep.index).sample(n - len(keep), random_state=SEED)]
    out = pd.concat(parts).sample(frac=1, random_state=SEED)
    out[["url", "label", "source", "domain"]].to_csv("datasets/links.csv", index=False)

    print(out.groupby(["stratum", "label"]).size().to_string())
    print(out.groupby(["label", "source"]).size().to_string())

    # Every phish host we know of (the whole Phishing.Database list, not the training sample)
    all_phish = list(load_phish(raw)["raw"]) + (raw / "pdb_active_links.txt").read_text(
        encoding="utf-8", errors="replace").split()
    trusted = trusted_domains(raw, all_phish)
    Path("app/models/trusted_domains.json").write_text(json.dumps(trusted, indent=1) + "\n", encoding="utf-8")
    print(f"trusted: {len(trusted['domains'])} domains, {len(trusted['untrusted_hosts'])} hosts excluded")


if __name__ == "__main__":
    main(sys.argv[1])
