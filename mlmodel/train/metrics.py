"""Shared evaluation helpers for the training scripts. Label 1 = legit, 0 = phish/scam."""
import json
from pathlib import Path

import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score

METRICS_PATH = Path("app/models/model_metrics.json")


def binary_report(y_true, p_legit, threshold: float = 0.5) -> dict:
    """Scores with the scam class as the positive class, since that's the one we must catch."""
    y_true = np.asarray(y_true)
    p_legit = np.asarray(p_legit)
    y_pred = (p_legit >= threshold).astype(int)
    scam_true, scam_pred = 1 - y_true, 1 - y_pred
    tn, fp, fn, tp = confusion_matrix(scam_true, scam_pred, labels=[0, 1]).ravel()
    return {
        "n": int(len(y_true)),
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "precision_phish": round(precision_score(scam_true, scam_pred, zero_division=0), 4),
        "recall_phish": round(recall_score(scam_true, scam_pred, zero_division=0), 4),
        "f1_phish": round(f1_score(scam_true, scam_pred, zero_division=0), 4),
        "false_positive_rate": round(float(fp / max(fp + tn, 1)), 4),
        "roc_auc": round(roc_auc_score(scam_true, 1 - p_legit), 4) if len(set(y_true)) == 2 else None,
        "confusion": {"legit_ok": int(tn), "legit_flagged": int(fp), "phish_missed": int(fn), "phish_caught": int(tp)},
    }


def challenge_reports(model) -> dict:
    """Score a message pipeline on every hand-written challenge set (never trained on), printing misses."""
    import pandas as pd

    reports = {}
    for path in sorted(Path("tests/fixtures").glob("challenge_messages*.jsonl")):
        df = pd.read_json(path, lines=True)
        p = model.predict_proba(df["text"])[:, 1]
        reports[path.stem] = binary_report(df["label"], p)
        print(f"{path.stem} (never trained on): {reports[path.stem]}")
        for text, y, q in zip(df["text"], df["label"], p):
            if (q >= 0.5) != bool(y):
                print("  MISS:", text[:90])
    return reports


def save_metrics(model: str, entry: dict) -> None:
    data = json.loads(METRICS_PATH.read_text(encoding="utf-8")) if METRICS_PATH.exists() else {}
    data[model] = entry
    METRICS_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
