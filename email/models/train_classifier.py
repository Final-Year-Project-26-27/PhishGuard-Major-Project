"""
Train the L2 NLP classifier used by pipeline/l2_nlp.py.

Run from email/:  python models/train_classifier.py
Writes models/vectorizer.pkl and models/classifier.pkl (labels "ham" / "phish").

Training data is the ML backend's message corpus (label 1 = legit, 0 = scam):
  ../mlmodel/datasets/messages.csv - real phishing and legitimate emails, SMS, and student
  internship/job offers (built by mlmodel/train/build_message_dataset.py, see datasets/SOURCES.md)
"""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import GroupShuffleSplit

HERE = Path(__file__).resolve().parent
DATASETS = HERE.parent.parent / "mlmodel" / "datasets"
# Same weighting as the ML backend's message model: the student-scam and modern Indian sources are
# small next to the public corpora, so they're weighted up to count
SOURCE_WEIGHT = {"curated": 6.0, "inbox": 6.0, "offer_corpus": 6.0, "offer_generated": 2.0}


def load_corpus() -> pd.DataFrame:
    df = pd.read_csv(DATASETS / "messages.csv", keep_default_na=False)
    # l2_nlp.py looks up the "phish" class by name
    df["label"] = df["label"].map({1: "ham", 0: "phish"})
    return df


def main() -> None:
    df = load_corpus()
    # Split by group so messages generated from one template never sit on both sides
    split = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(split.split(df, df["label"], groups=df["group"]))
    x_train, x_test = df["text"].iloc[train_idx], df["text"].iloc[test_idx]
    y_train, y_test = df["label"].iloc[train_idx], df["label"].iloc[test_idx]

    # Same preprocessing as serving: l2_nlp.py passes the raw stripped body text to the vectorizer
    vectorizer = TfidfVectorizer(lowercase=True, ngram_range=(1, 2), min_df=2, max_features=60000, sublinear_tf=True)
    classifier = LogisticRegression(C=4.0, max_iter=2000, class_weight="balanced")
    weights = df["source"].map(SOURCE_WEIGHT).fillna(1.0).to_numpy()
    classifier.fit(vectorizer.fit_transform(x_train), y_train, sample_weight=weights[train_idx])

    print(f"{len(df)} unique messages ({(df['label'] == 'phish').sum()} phish)")
    print(classification_report(y_test, classifier.predict(vectorizer.transform(x_test))))

    # Ship a model fit on everything; the split above is only for the report
    classifier.fit(vectorizer.fit_transform(df["text"]), df["label"], sample_weight=weights)

    joblib.dump(vectorizer, HERE / "vectorizer.pkl")
    joblib.dump(classifier, HERE / "classifier.pkl")
    print(f"Saved vectorizer.pkl and classifier.pkl to {HERE}")


if __name__ == "__main__":
    main()
