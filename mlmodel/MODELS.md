# PhishGuard models

Three models in `app/models/`, plus the Gmail pipeline's L2 classifier in `email/models/`. Each is one
scikit-learn pipeline whose feature code lives in `app/utils/`, imported by both the training script
and the API, so training and serving can't drift apart. Every score below is on data the model never
trained on; the raw numbers are in `app/models/model_metrics.json`. Data sources: `datasets/SOURCES.md`.

**How the scores were measured.** Train/test splits are by site (links) or by template family
(messages), never random rows. A random split would put copies of the same URL or template on both
sides and inflate the score, which is what happened with the previous models (98-99.6% of their test
rows were also in training). The challenge sets in `tests/fixtures/` are hand-written messages kept out
of training. Set 1 was looked at while improving the data; set 2 was written afterwards and used once
for the final message-model score.

## Link model (`link_model.pkl`): `/scan/link`, `/scan/unified`, extension link guard

- **Data:** 140,596 URLs from 103,111 sites. Phishing comes from PhishTank (verified, 2026-11-01),
  OpenPhish, Phishing.Database and PhiUSIIL; legitimate URLs from Tranco top sites, PhiUSIIL, real pages
  from ~600 sites' sitemaps (Indian banks, colleges, government, job portals) and genuine subdomains.
- **Model:** character 2-6-grams of the normalised URL plus 19 lexical features (subdomain depth, digits,
  IP host, punycode, brand name on a site that isn't the brand's, lure words), logistic regression.
- **Normalisation:** scheme, `www`, query and fragment are dropped, so "https"/"www" can't decide the
  verdict (the old model's 61% "www" shortcut is gone) and it sees what the extension sends.
- **Held out, unseen sites (28,088 URLs):** accuracy 88.5%, precision 90.3%, recall 85.8%, ROC AUC 0.95.
  Today's PhishTank phish caught: 95.0%. Real site pages passed: 91.8%; genuine subdomains: 98.2%.
- **Before the model:** the Tranco top 10,000 sites are answered directly, minus link shorteners,
  platforms where anyone can publish (godaddysites, weebly, dropbox, notion, jotform) and hosts seen
  serving phish 3+ times (docs.google.com, sites.google.com). On those shared hosts the verdict's
  confidence is capped at 0.6. URLs with `user@host` or a backslash in them never get this shortcut.
- **Known limits:** a bare domain of a small, unknown site is the hardest case (79% on PhiUSIIL), because
  the URL alone says little; the extension's url-intel adds the live page check (password forms,
  external form targets) on top. A phish page on a big shared platform looks identical to a real one by
  URL. No domain-age or reputation lookup.

## Message model (`message_model.pkl`): `/scan/offer`, `/scan/email`, `/scan/unified`, WhatsApp bot

- **Data:** 10,812 messages: real phishing emails (Nazario corpus 2023-2025), real legitimate email
  (SpamAssassin), real SMS (UCI SMS Spam Collection), student internship/job offers, and 143 curated
  modern Indian messages (fee offers, KYC, task jobs, courier and electricity scams; placement notices,
  genuine offers, bank alerts, OTPs). Student and Indian sources are weighted up.
- **Model:** word 1-2-gram TF-IDF plus 17 standardised scam-pattern features (fee demands, UPI handles,
  urgency, chat-only contact, unrealistic promises, credential requests, account threats, legitimacy
  markers, log length), logistic regression. Lengths are log-scaled and standardised, so a long, polite
  scam no longer reads as legit (the old model's main bug).
- **Held out (2,158 messages, by template family):** accuracy 98.5%, precision 95.5%, recall 96.0%,
  false-positive rate 0.95%, ROC AUC 0.996.
- **Challenge sets:** set 1, 97.8% (44/45); set 2, 97.5% (39/40: 19/20 scams caught, 20/20 genuine).
- **Known limits:** an opening message with no fee, link or threat yet ("part-time job, shall I share
  details on Telegram?") can pass; a scam usually shows its hand in the next message. English only.

## Document model (`doc_model.pkl`): `/scan/doc`

- **Data:** the message corpus plus 792 document snippets (`documents.csv`); a PDF or DOCX reads like a
  long message once it is text.
- **Model:** word 1-3-gram TF-IDF plus standardised document indicators and the message model's
  scam patterns, logistic regression.
- **Held out (2,317 texts):** accuracy 98.3%, precision 95.0%, recall 95.8%, ROC AUC 0.996.
  `test_documents/`: 6/6. Challenge sets: 95.6% and 95.0%; a fee-demanding offer letter is caught.
- **Known limits:** tuned for letters; very short chat-style texts are better checked as messages.
  No OCR, so image-only PDFs are rejected.

## Gmail L2 classifier (`email/models/classifier.pkl`)

- **Data and model:** the message corpus, word TF-IDF and logistic regression on the raw body
  (`email/models/train_classifier.py`).
- **Held out:** accuracy 98%, phish precision 94%, recall 96%. Challenge sets: 95.6% and 95.0%.
- It adds at most 3 of the pipeline's 10 points; authentication, heuristics and VirusTotal add the rest.

## Retraining

```bash
cd mlmodel
python -m train.build_link_dataset <raw_dir>      # needs the downloads listed in datasets/SOURCES.md
python -m train.build_message_dataset <raw_dir>
python -m train.train_link_model                  # ~10 min
python -m train.train_message_model
python -m train.train_doc_model
cd ../email && python models/train_classifier.py
cd ../mlmodel && python -m pytest tests           # includes model-quality checks
```
