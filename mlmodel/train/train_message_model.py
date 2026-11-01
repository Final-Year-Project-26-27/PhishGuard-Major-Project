"""
Train the message model (offers, emails, chats): word TF-IDF plus standardised scam-pattern
features, into logistic regression. Saves one pipeline, app/models/message_model.pkl (label 1 = legit).
Serves /scan/offer, /scan/email and the email half of /scan/unified.

Run from mlmodel/:  python -m train.train_message_model
Data: datasets/messages.csv, built by train/build_message_dataset.py.

Held-out score: split by group (messages from one template stay together), plus a separate
challenge sets (tests/fixtures/challenge_messages*.jsonl) that are never trained on.
"""
import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.preprocessing import FunctionTransformer, StandardScaler

from app.utils.message_features import message_matrix, message_texts
from train.metrics import binary_report, challenge_reports, save_metrics

C_GRID = [0.5, 2.0, 8.0]
# The student-scam sources are small next to the public corpora; weight them up so they count
SOURCE_WEIGHT = {"curated": 6.0, "inbox": 6.0, "offer_corpus": 6.0, "offer_generated": 2.0}
# Real inbox mail from this date on is held out once, to score the model the way it is used: on later mail
INBOX_CUTOFF = "2026-01-01"


def build(C: float) -> Pipeline:
    features = FeatureUnion([
        ("words", Pipeline([
            ("clean", FunctionTransformer(message_texts)),
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=60000, sublinear_tf=True)),
        ])),
        ("patterns", Pipeline([("extract", FunctionTransformer(message_matrix)), ("scale", StandardScaler())])),
    ])
    clf = LogisticRegression(C=C, max_iter=3000, class_weight="balanced")
    return Pipeline([("features", features), ("clf", clf)])


def weights(df: pd.DataFrame) -> np.ndarray:
    return df["source"].map(SOURCE_WEIGHT).fillna(1.0).to_numpy()


def fit(C: float, df: pd.DataFrame) -> Pipeline:
    return build(C).fit(df["text"], df["label"], clf__sample_weight=weights(df))


def pick_threshold(y_true, p_legit) -> float:
    """The cut-off that best separates the classes on validation data (max recall - false-positive rate)."""
    best = max(np.arange(0.10, 0.55, 0.05), key=lambda t: (lambda r: r["recall_phish"] - r["false_positive_rate"])(
        binary_report(y_true, p_legit, t)))
    return round(float(best), 2)


def group_split(df: pd.DataFrame, test_size: float, seed: int):
    split = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=seed)
    a, b = next(split.split(df, df["label"], groups=df["group"]))
    return df.iloc[a], df.iloc[b]


def main() -> None:
    df = pd.read_csv("datasets/messages.csv", keep_default_na=False)
    print(f"{len(df)} messages, scam share {(df.label == 0).mean():.2f}")

    # Later real inbox mail is set aside before anything is tuned, so its score stays honest
    later = df[(df.source == "inbox") & (df.date >= INBOX_CUTOFF)]
    dev = df.drop(later.index)

    train, test = group_split(dev, 0.2, seed=42)
    fit_part, val = group_split(train, 0.2, seed=7)
    scores = {}
    for C in C_GRID:
        model = fit(C, fit_part)
        # Pick C on the student-facing sources, the ones this model exists for
        focus = val[val.source.isin(SOURCE_WEIGHT)]
        scores[C] = binary_report(focus["label"], model.predict_proba(focus["text"])[:, 1])["f1_phish"]
        print(f"C={C}: validation F1 (scam, student sources) {scores[C]:.4f}")
    best_C = max(scores, key=scores.get)
    threshold = pick_threshold(val["label"], fit(best_C, fit_part).predict_proba(val["text"])[:, 1])
    print(f"Decision threshold (Youden's J on validation): legit if P(legit) >= {threshold}")

    model = fit(best_C, train)
    report = binary_report(test["label"], model.predict_proba(test["text"])[:, 1], threshold)
    by_source = {s: binary_report(g["label"], model.predict_proba(g["text"])[:, 1], threshold)["accuracy"]
                 for s, g in test.groupby("source")}
    print(f"Held-out (n={len(test)}): {report}")
    print(f"Accuracy by source: {by_source}")

    inbox_later = binary_report(later["label"], fit(best_C, dev).predict_proba(later["text"])[:, 1], threshold)
    print(f"Real inbox mail from {INBOX_CUTOFF} on, trained only on older data (n={len(later)}): {inbox_later}")

    final = fit(best_C, df)
    final.threshold_ = threshold  # read by classify_message() in app/routers/offer_scan.py
    challenge = challenge_reports(final, threshold)

    joblib.dump(final, "app/models/message_model.pkl", compress=3)
    save_metrics("message", {
        "data": {"messages": len(df), "scam": int((df.label == 0).sum()),
                 "by_source": df.groupby("source").size().to_dict()},
        "C": best_C,
        "threshold": threshold,
        "split": "group split (template families kept together), 20% held out",
        "held_out": report,
        "held_out_accuracy_by_source": by_source,
        "challenge_sets": challenge,
        "real_inbox_later_mail": {"trained_on": f"everything before {INBOX_CUTOFF}", **inbox_later},
    })
    print("Saved app/models/message_model.pkl")


if __name__ == "__main__":
    main()
