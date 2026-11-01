"""
Train the link model: character n-grams of the normalised URL plus scaled lexical features,
into logistic regression. Saves one pipeline, app/models/link_model.pkl (label 1 = legit).

Run from mlmodel/:  python -m train.train_link_model
Data: datasets/links.csv, built by train/build_link_dataset.py.

The held-out score uses a split by registrable domain, so no site appears in both train and test.
"""
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.preprocessing import FunctionTransformer, StandardScaler

from app.utils.url_features import url_matrix, url_texts
from train.metrics import binary_report, save_metrics

C_GRID = [1.0, 4.0, 16.0]


def build(C: float) -> Pipeline:
    features = FeatureUnion([
        ("chars", Pipeline([
            ("norm", FunctionTransformer(url_texts)),
            ("tfidf", TfidfVectorizer(analyzer="char", ngram_range=(2, 6), min_df=2, max_features=1000000,
                                      sublinear_tf=True)),
        ])),
        ("lexical", Pipeline([("extract", FunctionTransformer(url_matrix)), ("scale", StandardScaler())])),
    ])
    return Pipeline([("features", features), ("clf", LogisticRegression(C=C, max_iter=3000, solver="liblinear"))])


def group_split(df: pd.DataFrame, test_size: float, seed: int):
    split = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=seed)
    train_idx, test_idx = next(split.split(df, df["label"], groups=df["domain"]))
    return df.iloc[train_idx], df.iloc[test_idx]


def main() -> None:
    df = pd.read_csv("datasets/links.csv", keep_default_na=False)
    print(f"{len(df)} URLs, {df.domain.nunique()} sites, phish share {(df.label == 0).mean():.2f}")

    train, test = group_split(df, 0.2, seed=42)
    fit, val = group_split(train, 0.2, seed=7)
    scores = {}
    for C in C_GRID:
        model = build(C).fit(fit["url"], fit["label"])
        scores[C] = binary_report(val["label"], model.predict_proba(val["url"])[:, 1])["f1_phish"]
        print(f"C={C}: validation F1 (phish) {scores[C]:.4f}")
    best_C = max(scores, key=scores.get)

    model = build(best_C).fit(train["url"], train["label"])
    report = binary_report(test["label"], model.predict_proba(test["url"])[:, 1])
    by_source = {
        src: round(float((model.predict(g["url"]) == g["label"]).mean()), 4)
        for src, g in test.groupby("source")
    }
    print(f"Held-out (unseen sites, n={len(test)}): {report}")
    print(f"Accuracy by source: {by_source}")

    final = build(best_C).fit(df["url"], df["label"])
    joblib.dump(final, "app/models/link_model.pkl", compress=3)
    save_metrics("link", {
        "data": {"urls": len(df), "sites": int(df.domain.nunique()), "phish": int((df.label == 0).sum())},
        "C": best_C,
        "split": "group by registrable domain, 20% of sites held out",
        "held_out": report,
        "held_out_accuracy_by_source": by_source,
    })
    print("Saved app/models/link_model.pkl")


if __name__ == "__main__":
    main()
