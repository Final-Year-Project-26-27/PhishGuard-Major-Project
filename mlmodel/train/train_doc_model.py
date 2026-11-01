"""
Train the document model: TF-IDF (1-3 grams) plus standardised phishing-indicator features, into
logistic regression. Saves one pipeline, app/models/doc_model.pkl (label 1 = legit).

Run from mlmodel/:  python -m train.train_doc_model
Data: datasets/documents.csv (short document snippets) plus datasets/messages.csv (full emails,
offers and letters), since an uploaded PDF or DOCX reads like a long message once it is text.
Checked on test_documents/ and tests/fixtures/challenge_messages*.jsonl, which are never trained on.
"""
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.preprocessing import FunctionTransformer, StandardScaler

from app.utils.doc_features import doc_matrix, doc_texts
from app.utils.message_features import message_matrix
from train.metrics import binary_report, challenge_reports, save_metrics

SAMPLES = Path("../test_documents")
SOURCE_WEIGHT = {"curated": 6.0, "offer_corpus": 6.0, "offer_generated": 2.0, "documents": 2.0}


def load_documents() -> pd.DataFrame:
    """documents.csv mixes quoted-CSV and tab-separated lines; read both."""
    rows = []
    for line in Path("datasets/documents.csv").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("text_content"):
            continue
        if line.startswith('"'):
            text, _, label = line[1:].rpartition('"')
            label = label.strip().lstrip(",")
        elif "\t" in line:
            text, label = line.rsplit("\t", 1)
        else:
            continue
        if label.strip() in ("0", "1"):
            rows.append((text.strip(), int(label)))
    df = pd.DataFrame(rows, columns=["text", "label"]).drop_duplicates("text")
    return df.assign(source="documents", group=lambda d: "documents:" + d.index.astype(str))


def build() -> Pipeline:
    features = FeatureUnion([
        ("words", Pipeline([
            ("clean", FunctionTransformer(doc_texts)),
            ("tfidf", TfidfVectorizer(ngram_range=(1, 3), min_df=2, max_features=60000, sublinear_tf=True)),
        ])),
        ("indicators", Pipeline([("extract", FunctionTransformer(doc_matrix)), ("scale", StandardScaler())])),
        # The message model's scam patterns (fee demands, UPI handles, account threats) catch fee letters
        ("scam_patterns", Pipeline([("extract", FunctionTransformer(message_matrix)), ("scale", StandardScaler())])),
    ])
    return Pipeline([("features", features), ("clf", LogisticRegression(C=4.0, max_iter=3000, class_weight="balanced"))])


def fit(df: pd.DataFrame) -> Pipeline:
    weights = df["source"].map(SOURCE_WEIGHT).fillna(1.0).to_numpy()
    return build().fit(df["text"], df["label"], clf__sample_weight=weights)


def main() -> None:
    messages = pd.read_csv("datasets/messages.csv", keep_default_na=False)
    df = pd.concat([load_documents(), messages], ignore_index=True)
    conflicts = df.groupby("text")["label"].nunique()
    df = df[~df["text"].isin(conflicts[conflicts > 1].index)].drop_duplicates("text")
    print(f"{len(df)} texts ({(df.source == 'documents').sum()} document snippets)")

    split = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    a, b = next(split.split(df, df["label"], groups=df["group"]))
    train, test = df.iloc[a], df.iloc[b]
    model = fit(train)
    report = binary_report(test["label"], model.predict_proba(test["text"])[:, 1])
    by_source = {s: binary_report(g["label"], model.predict_proba(g["text"])[:, 1])["accuracy"]
                 for s, g in test.groupby("source")}
    print(f"Held-out (n={len(test)}): {report}")
    print(f"Accuracy by source: {by_source}")

    final = fit(df)
    samples = sorted(SAMPLES.glob("*.txt"))
    sample_texts = [p.read_text(encoding="utf-8", errors="ignore") for p in samples]
    sample_labels = [int(p.name.startswith("LEGITIMATE")) for p in samples]
    sample_report = binary_report(sample_labels, final.predict_proba(sample_texts)[:, 1])
    print(f"test_documents/: {sample_report}")
    challenge = challenge_reports(final)

    joblib.dump(final, "app/models/doc_model.pkl", compress=3)
    save_metrics("doc", {
        "data": {"texts": len(df), "document_snippets": int((df.source == "documents").sum())},
        "split": "group split, 20% held out",
        "held_out": report,
        "held_out_accuracy_by_source": by_source,
        "test_documents": sample_report,
        "challenge_sets": challenge,
    })
    print("Saved app/models/doc_model.pkl")


if __name__ == "__main__":
    main()
