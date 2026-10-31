"""
Train the L2 NLP classifier used by pipeline/l2_nlp.py.

Run from email/:  python models/train_classifier.py
Writes models/vectorizer.pkl and models/classifier.pkl (labels "ham" / "phish").

Training data comes from the ML backend's datasets (label 1 = legit, 0 = scam):
  ../mlmodel/datasets/emails.csv            (text_content)
  ../mlmodel/datasets/offer_messages*.csv   (message) - fake internship / job offers
"""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

HERE = Path(__file__).resolve().parent
DATASETS = HERE.parent.parent / "mlmodel" / "datasets"


def load_corpus() -> pd.DataFrame:
    frames = [pd.read_csv(DATASETS / "emails.csv").rename(columns={"text_content": "text"})[["text", "label"]]]
    for path in sorted(DATASETS.glob("offer_messages*.csv")):
        frames.append(pd.read_csv(path).rename(columns={"message": "text"})[["text", "label"]])
    df = pd.concat(frames, ignore_index=True).dropna()
    df["text"] = df["text"].astype(str)
    # l2_nlp.py looks up the "phish" class by name
    df["label"] = df["label"].map({1: "ham", 0: "phish"})
    return df.dropna().drop_duplicates(subset="text")


def main() -> None:
    df = load_corpus()
    x_train, x_test, y_train, y_test = train_test_split(
        df["text"], df["label"], test_size=0.2, random_state=42, stratify=df["label"]
    )

    # Same preprocessing as serving: l2_nlp.py passes the raw stripped body text to the vectorizer
    vectorizer = TfidfVectorizer(lowercase=True, ngram_range=(1, 2), max_features=20000, sublinear_tf=True)
    classifier = LogisticRegression(max_iter=1000, class_weight="balanced")
    classifier.fit(vectorizer.fit_transform(x_train), y_train)

    print(f"{len(df)} unique messages ({(df['label'] == 'phish').sum()} phish)")
    print(classification_report(y_test, classifier.predict(vectorizer.transform(x_test))))

    joblib.dump(vectorizer, HERE / "vectorizer.pkl")
    joblib.dump(classifier, HERE / "classifier.pkl")
    print(f"Saved vectorizer.pkl and classifier.pkl to {HERE}")


if __name__ == "__main__":
    main()
