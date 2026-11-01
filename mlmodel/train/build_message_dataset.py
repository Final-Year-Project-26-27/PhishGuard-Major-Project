"""
Build datasets/messages.csv (text, label, source, group) for the message model, the doc model and
the Gmail pipeline's L2 classifier. Label 1 = legit, 0 = scam/phishing.

Run from mlmodel/:  python -m train.build_message_dataset <raw_dir>

Sources (see datasets/SOURCES.md):
  datasets/offer_messages*.csv        student internship/job offers, real and fake (this repo)
  datasets/messages_curated.jsonl     modern Indian scams and genuine notices, OTPs, offers (this repo)
  <raw_dir>/nazario-20*.mbox          real phishing emails, Nazario phishing corpus 2023-2025 (CC BY 4.0)
  <raw_dir>/easy_ham*, hard_ham       real legitimate emails, SpamAssassin public corpus
  <raw_dir>/SMSSpamCollection         real SMS ham/spam, UCI SMS Spam Collection (CC BY 4.0)

"group" keeps near-copies together when splitting train/test: messages generated from the same
template share a group, so a test message is never just a reworded training one.
"""
import ast
import email
import email.policy
import mailbox
import re
import sys
from pathlib import Path

import pandas as pd
from bs4 import BeautifulSoup

MAX_CHARS = 3000
NAZARIO_CAP = 4000


def _templates() -> list[tuple[str, re.Pattern]]:
    """Recover generate_dataset.py's templates (without running it, it writes a file) as regexes."""
    tree = ast.parse(Path("datasets/generate_dataset.py").read_text(encoding="utf-8"))
    out = []
    for node in tree.body:
        if isinstance(node, ast.Assign) and node.targets[0].id in ("fake_templates", "legit_templates"):
            for i, tpl in enumerate(ast.literal_eval(node.value)):
                pattern = re.escape(tpl)
                pattern = re.sub(r"\\\{\w+\\\}", ".+?", pattern)
                out.append((f"{node.targets[0].id}:{i}", re.compile(f"^{pattern}$", re.S)))
    return out


def load_offers() -> pd.DataFrame:
    frames = []
    for name in ("offer_messages.csv", "offer_messages_extra.csv"):
        d = pd.read_csv(Path("datasets") / name).rename(columns={"message": "text"})
        frames.append(d.assign(source="offer_corpus"))
    gen = pd.read_csv("datasets/offer_messages_generated.csv").rename(columns={"message": "text"})
    templates = _templates()
    gen["group"] = [next((tid for tid, rx in templates if rx.match(t)), "generated:unmatched") for t in gen["text"]]
    frames.append(gen.assign(source="offer_generated"))
    curated = pd.read_json("datasets/messages_curated.jsonl", lines=True)
    frames.append(curated.assign(source="curated"))
    return pd.concat(frames, ignore_index=True)


def _body(msg) -> str:
    plain, html = [], []
    for part in msg.walk():
        if part.is_multipart() or part.get_content_disposition() == "attachment":
            continue
        try:
            payload = part.get_payload(decode=True)
        except Exception:
            continue
        if not payload:
            continue
        try:
            text = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
        except LookupError:  # spam often declares a made-up charset
            text = payload.decode("utf-8", errors="replace")
        (plain if part.get_content_type() == "text/plain" else html if part.get_content_type() == "text/html" else []).append(text)
    if plain:
        return "\n".join(plain)
    if html:
        return BeautifulSoup("\n".join(html), "html.parser").get_text(" ")
    return ""


def _clean_email(subject: str, body: str) -> str:
    body = re.split(r"\n_{10,}\s*\n", body)[0]                          # mailing-list footers
    text = f"{subject or ''}\n{body}"
    text = re.sub(r"(?i)\bjose(@monkey\.org)?\b|monkey\.org", "user", text)  # the honeypot's own address
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text).strip()
    return text[:MAX_CHARS]


def _english(text: str) -> bool:
    letters = [c for c in text if c.isalpha()]
    return len(letters) > 30 and sum(c.isascii() for c in letters) / len(letters) > 0.95


def load_emails(raw: Path) -> pd.DataFrame:
    rows = []
    for path in sorted(raw.glob("nazario-20*.mbox")):
        for msg in mailbox.mbox(path, factory=lambda f: email.message_from_binary_file(f, policy=email.policy.compat32)):
            text = _clean_email(str(msg.get("Subject", "")), _body(msg))
            if _english(text):
                rows.append((text, 0, "nazario"))
    for folder in ("easy_ham", "easy_ham_2", "hard_ham"):
        for path in sorted((raw / folder).glob("*")):
            if path.name == "cmds":
                continue
            msg = email.message_from_bytes(path.read_bytes(), policy=email.policy.compat32)
            text = _clean_email(str(msg.get("Subject", "")), _body(msg))
            if _english(text):
                rows.append((text, 1, "spamassassin"))
    df = pd.DataFrame(rows, columns=["text", "label", "source"]).drop_duplicates("text")
    naz = df[df.source == "nazario"]
    if len(naz) > NAZARIO_CAP:
        df = pd.concat([df[df.source != "nazario"], naz.sample(NAZARIO_CAP, random_state=42)])
    return df


def load_sms(raw: Path) -> pd.DataFrame:
    rows = [line.split("\t", 1) for line in (raw / "SMSSpamCollection").read_text(encoding="utf-8").splitlines() if "\t" in line]
    return pd.DataFrame([(t, int(lab == "ham"), "sms") for lab, t in rows], columns=["text", "label", "source"])


def main(raw_dir: str) -> None:
    raw = Path(raw_dir)
    df = pd.concat([load_offers(), load_emails(raw), load_sms(raw)], ignore_index=True)
    df["text"] = df["text"].astype(str).str.strip()
    df = df[df["text"].str.len() > 0]
    conflicts = df.groupby("text")["label"].nunique()
    df = df[~df["text"].isin(conflicts[conflicts > 1].index)].drop_duplicates("text").reset_index(drop=True)
    df["group"] = df["group"].fillna(df["source"] + ":" + df.index.astype(str))
    df[["text", "label", "source", "group"]].to_csv("datasets/messages.csv", index=False)
    print(df.groupby(["source", "label"]).size().to_string())
    print(f"{len(df)} messages, {df.group.nunique()} groups")


if __name__ == "__main__":
    main(sys.argv[1])
