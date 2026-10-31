import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.pipeline import Pipeline
import joblib
import os
import re
import json

# Run from mlmodel/ as a module (python -m train.train_doc_model) so `app` is importable
from app.utils.doc_features import extract_phishing_features
from app.utils.preprocess import preprocess_text as clean_text

# Phishing indicators for feature extraction
PHISHING_INDICATORS = {
    'urgency_words': [
        'urgent', 'immediately', 'act now', 'limited time', 'expires', 'deadline',
        'final notice', 'last chance', 'hurry', 'quick', 'asap', 'right away',
        'within 24 hours', 'today only', 'dont delay', 'time sensitive'
    ],
    'money_words': [
        'pay', 'payment', 'fee', 'charge', 'rupees', 'rs', '₹', 'dollar', '$',
        'prize', 'won', 'lottery', 'winner', 'jackpot', 'cash', 'money', 'free',
        'loan', 'credit', 'refund', 'compensation', 'reward', 'bonus'
    ],
    'credential_words': [
        'password', 'login', 'verify', 'confirm', 'account', 'credential',
        'ssn', 'social security', 'aadhaar', 'pan card', 'bank account',
        'credit card', 'debit card', 'cvv', 'otp', 'pin', 'identity'
    ],
    'threat_words': [
        'suspended', 'blocked', 'terminated', 'closed', 'locked', 'disabled',
        'legal action', 'arrest', 'penalty', 'fine', 'court', 'police',
        'unauthorized', 'compromised', 'hacked', 'infected', 'virus', 'malware'
    ],
    'suspicious_domains': [
        '.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.work', '.click',
        '.link', '.info', '.biz', '.co', '.io', '-verify', '-secure', '-login',
        'fakeinternship', 'scamjobs', 'quickjobs', 'verify-later', 'fraudsite'
    ],
    'action_words': [
        'click here', 'click below', 'click link', 'download', 'install',
        'open attachment', 'fill form', 'submit', 'send', 'share', 'provide',
        'enter details', 'update information', 'confirm identity'
    ]
}

# Read the file and handle mixed CSV/TSV format
data_rows = []
with open("datasets/documents.csv", 'r', encoding='utf-8') as f:
    lines = f.readlines()
    
for i, line in enumerate(lines):
    line = line.strip()
    if not line or line.startswith('text_content'):  # Skip header rows
        continue
    
    # Try to parse as CSV (comma-separated, possibly quoted)
    if line.startswith('"'):
        # Quoted CSV format: "text content",label
        try:
            last_quote = line.rfind('"')
            text = line[1:last_quote]  # Get text between quotes
            label_part = line[last_quote+1:].strip().lstrip(',')
            label = int(label_part)
            data_rows.append({'text_content': text, 'label': label})
        except:
            pass
    elif '\t' in line:
        # Tab-separated format: text content<TAB>label
        parts = line.rsplit('\t', 1)
        if len(parts) == 2:
            try:
                text = parts[0].strip()
                label = int(parts[1].strip())
                data_rows.append({'text_content': text, 'label': label})
            except:
                pass

df = pd.DataFrame(data_rows)
df.dropna(inplace=True)

print(f"Loaded {len(df)} documents")
print(f"Label distribution:\n{df['label'].value_counts()}")

# Clean text and extract features
df["cleaned"] = df["text_content"].apply(clean_text)

# Extract additional features
print("Extracting phishing features...")
feature_dicts = df["text_content"].apply(lambda t: extract_phishing_features(t, PHISHING_INDICATORS))
feature_df = pd.DataFrame(feature_dicts.tolist())

X_text = df["cleaned"]
y = df["label"]

# TF-IDF with n-grams for better phrase detection
print("Creating TF-IDF features...")
vectorizer = TfidfVectorizer(
    max_features=5000,
    ngram_range=(1, 3),  # Include unigrams, bigrams, and trigrams
    min_df=2,
    max_df=0.95,
    sublinear_tf=True
)
X_tfidf = vectorizer.fit_transform(X_text)

# Combine TF-IDF with extracted features
X_combined = np.hstack([X_tfidf.toarray(), feature_df.values])

print(f"Total features: {X_combined.shape[1]} (TF-IDF: {X_tfidf.shape[1]}, Custom: {feature_df.shape[1]})")

X_train, X_test, y_train, y_test = train_test_split(X_combined, y, test_size=0.2, random_state=42, stratify=y)

# Train multiple models and select best
print("\nTraining models...")

models = {
    'RandomForest': RandomForestClassifier(n_estimators=100, max_depth=20, random_state=42, class_weight='balanced'),
    'GradientBoosting': GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42),
    'LogisticRegression': LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
}

best_model = None
best_accuracy = 0
best_model_name = ""

for name, model in models.items():
    print(f"\nTraining {name}...")
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"{name} Accuracy: {accuracy:.4f}")
    print(classification_report(y_test, y_pred, target_names=['Fake/Phishing', 'Legitimate']))
    
    if accuracy > best_accuracy:
        best_accuracy = accuracy
        best_model = model
        best_model_name = name

print(f"\n{'='*50}")
print(f"Best Model: {best_model_name} with accuracy: {best_accuracy:.4f}")
print(f"{'='*50}")

# Cross-validation for robust evaluation
cv_scores = cross_val_score(best_model, X_combined, y, cv=5)
print(f"Cross-validation scores: {cv_scores}")
print(f"Mean CV Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")

# Save models and metadata
os.makedirs("app/models", exist_ok=True)
joblib.dump(best_model, "app/models/doc_model.pkl")
joblib.dump(vectorizer, "app/models/doc_vectorizer.pkl")

# Save feature names and phishing indicators
metadata = {
    'model_name': best_model_name,
    'accuracy': best_accuracy,
    'feature_names': list(feature_df.columns),
    'phishing_indicators': PHISHING_INDICATORS
}
with open("app/models/doc_metadata.json", 'w') as f:
    json.dump(metadata, f, indent=2)

print("\nModels saved successfully!")
print("- app/models/doc_model.pkl")
print("- app/models/doc_vectorizer.pkl")
print("- app/models/doc_metadata.json")
