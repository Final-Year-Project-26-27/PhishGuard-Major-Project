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
