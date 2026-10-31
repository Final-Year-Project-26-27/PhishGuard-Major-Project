# Run from email/: python -m pytest tests  (no Gmail access needed: lifespan is not started)
import asyncio
import base64
import json
from types import SimpleNamespace

from fastapi.testclient import TestClient

import main
from pipeline import warning_composer

client = TestClient(main.app)


def test_webhook_ignores_calls_without_token(monkeypatch):
    monkeypatch.setattr(main, "PUBSUB_VERIFICATION_TOKEN", "s3cret")
    monkeypatch.setattr(main, "last_history_id", "500")
    data = base64.b64encode(json.dumps({"emailAddress": "x", "historyId": "1"}).encode()).decode()
    assert client.post("/webhook/gmail", json={"message": {"data": data}}).status_code == 200
    assert main.last_history_id == "500"  # forged historyId did not move the cursor


def test_stream_requires_dashboard_token(monkeypatch):
    monkeypatch.setattr(main, "DASHBOARD_TOKEN", "")
    assert client.get("/api/stream").status_code == 401  # fails closed when unset
    monkeypatch.setattr(main, "DASHBOARD_TOKEN", "dash")
    assert client.get("/api/stream?token=wrong").status_code == 401


def test_report_get_never_writes(monkeypatch):
    calls = []
    monkeypatch.setattr(main, "get_supabase_client", lambda: calls.append(1))
    page = client.get("/api/report?url=https://evil.example/<script>").text
    assert calls == [] and "<script>" not in page and 'method="post"' in page


def test_warning_draft_escapes_attacker_html():
    created = {}

    class Drafts:
        def create(self, userId, body):
            created["raw"] = body["message"]["raw"]
            return SimpleNamespace(execute=lambda: None)

    service = SimpleNamespace(users=lambda: SimpleNamespace(drafts=lambda: Drafts()))
    ctx = SimpleNamespace(
        thread_id="t1", message_id="<m1>", subject="Hi", sender_domain="evil.example",
        body_text='<a href="https://evil.example">Restore your account</a>', urls=[],
    )
    result = SimpleNamespace(verdict="PHISH", scl_score=9, fired_rules=['Display name "<b>IT</b>"'],
                             flagged_urls=["https://evil.example/?a=<x>"])
    asyncio.run(warning_composer.inject_warning_draft(service, ctx, result))
    mime = base64.urlsafe_b64decode(created["raw"]).decode(errors="replace")
    payload = mime.split("\n\n", 2)[-1]
    body = base64.b64decode("".join(payload.split())).decode() if "base64" in mime else payload
    assert '<a href="https://evil.example">' not in body
    assert "&lt;a href=" in body


def test_planted_auth_results_header_is_ignored():
    from pipeline.email_parser import parse_email
    from pipeline.l1_authentication import _parse_auth_results

    # Gmail prepends its own header; the sender planted a second "all pass" one further down
    raw = (
        "Authentication-Results: mx.google.com; spf=fail smtp.mailfrom=evil.example; dkim=none\r\n"
        "Authentication-Results: mx.google.com; spf=pass; dkim=pass; dmarc=pass\r\n"
        "From: IT Support <it@evil.example>\r\nSubject: hi\r\n\r\nbody\r\n"
    )
    ctx = parse_email(raw, "m1")
    assert _parse_auth_results(ctx.headers)["spf"] == "fail"
    # A header not written by Gmail is not trusted at all
    assert _parse_auth_results({"authentication-results": "evil.example; spf=pass"})["spf"] == "none"


def test_admin_endpoints_require_dashboard_token(monkeypatch):
    monkeypatch.setattr(main, "DASHBOARD_TOKEN", "dash")
    assert client.get("/api/admin/pending").status_code == 401
    assert client.post("/api/admin/pending/1/approve", headers={"X-Dashboard-Token": "wrong"}).status_code == 401
    assert client.delete("/api/admin/blocklist/urls/1").status_code == 401


def test_admin_approve_uses_the_stored_report(monkeypatch):
    calls = []

    class Query:
        def __init__(self, table): self.table = table
        def select(self, *_): return self
        def eq(self, *_): return self
        def delete(self): calls.append(("delete", self.table)); return self
        def insert(self, row): calls.append(("insert", self.table, row)); return self
        def execute(self):
            rows = [{"id": 1, "url": "https://evil.example", "domain": "evil.example"}]
            return SimpleNamespace(data=rows if self.table == "pending_reports" else [])

    monkeypatch.setattr(main, "DASHBOARD_TOKEN", "dash")
    monkeypatch.setattr(main, "get_supabase_client", lambda: SimpleNamespace(table=Query))
    assert client.post("/api/admin/pending/1/approve", headers={"X-Dashboard-Token": "dash"}).status_code == 200
    assert ("insert", "scam_urls", {"url": "https://evil.example"}) in calls
    assert ("delete", "pending_reports") in calls
