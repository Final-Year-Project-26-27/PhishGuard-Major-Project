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

- **Data:** 10,973 messages: real phishing emails (Nazario corpus 2023-2025), real legitimate email
  (SpamAssassin), real SMS (UCI SMS Spam Collection), 131 real redacted mails from a student's college
  inbox (2023-2026: pay-to-intern scams, placement-cell drives, college notices, job-portal alerts),
  student internship/job offers, and 173 curated modern Indian messages (fee offers, KYC, task jobs,
  courier and electricity scams; genuine offers, job alerts, bank alerts, OTPs). Student, inbox and
  Indian sources are weighted up.
- **Model:** word 1-2-gram TF-IDF plus 18 standardised scam-pattern features (fee demands, UPI handles,
  urgency, chat-only contact, unrealistic promises, credential requests, account threats, paid-training
  hints such as "mentor fees applicable" or a scholarship code, legitimacy markers, log length), logistic regression. Lengths are log-scaled and standardised, so a long, polite
  scam no longer reads as legit (the old model's main bug).
- **Decision threshold:** chosen on validation data at training time (Youden's J) and stored in the
  pipeline; it came out at 0.5. The website shows a scam verdict under 70% confidence as a caution
  (amber), not a red alert.
- **Held out (2,160 messages, by template family):** accuracy 98.1%, precision 96.1%, recall 93.5%,
  false-positive rate 0.85%, ROC AUC 0.996.
- **Real inbox mail from 2026, trained only on 2023-2025 data (61 mails):** 23/23 scams caught,
  31/38 genuine mails passed (accuracy 88.5%, ROC AUC 0.991). The 7 false alarms are job-portal alerts
  and product welcome mails whose wording ("verify your account", "no experience required") sounds like
  phishing; none were placement-cell or college notices.
- **Challenge sets:** set 1, 97.8% (44/45); set 2, 97.5% (39/40: 19/20 scams caught, 20/20 genuine).
- **Known limits:** an opening message with no fee, link or threat yet ("part-time job, shall I share
  details on Telegram?") can pass; a scam usually shows its hand in the next message. English only.

## Document model (`doc_model.pkl`): `/scan/doc`

- **Data:** the message corpus plus 792 document snippets (`documents.csv`); a PDF or DOCX reads like a
  long message once it is text.
- **Model:** word 1-3-gram TF-IDF plus standardised document indicators and the message model's
  scam patterns, logistic regression.
- **Held out (2,332 texts):** accuracy 98.2%, precision 95.1%, recall 95.3%, ROC AUC 0.995.
  `test_documents/`: 6/6. Challenge sets: 100% and 95.0%; a fee-demanding offer letter is caught.
- **Known limits:** tuned for letters; very short chat-style texts are better checked as messages.
  No OCR, so image-only PDFs are rejected.

## Gmail L2 classifier (`email/models/classifier.pkl`)

- **Data and model:** the message corpus, word TF-IDF and logistic regression on the raw body
  (`email/models/train_classifier.py`).
- **Held out:** accuracy 99%, phish precision 95%, recall 94%. Challenge sets: 95.6% and 95.0%.
  Real inbox mail from 2026 (trained on 2023-2025 only): 22/23 scams caught, 35/38 genuine passed (93.4%).
- It adds at most 3 of the pipeline's 10 points; authentication, heuristics and VirusTotal add the rest.

## Real inbox check

The models were checked against two real college inboxes (read only).

**Inbox 2** (`datasets/inbox_real.jsonl`, 131 mails, 2023-2026): bulk mail only (placement-cell and
college circulars, job-portal alerts, vendor spam), with email addresses, phone numbers, URL paths,
student names and USNs removed. Before it was added, the message model caught 54/54 scams but passed
only 47/77 genuine mails (Internshala alerts, fee and scholarship circulars, hackathon notices read as
scams). It is now part of training, and the 2026 mails are the time-based test reported above.

**Inbox 1** (no mail text stored in this repo). The scams there are mostly pay-to-intern "training programs": a
"shortlisted" mail to a whole batch, a Google Form, Microsoft/IBM/AICTE names, and a fee that is only
hinted at ("mentor fees applicable", a scholarship code). Genuine mail is placement-cell drive notices.

- First batch (14 mails): 8/8 scams caught, but 3/6 placement notices flagged. Two causes were fixed:
  "registration" alone counted as a fee demand, and this mail style was missing from training
  (paraphrased examples, no real text, were added to `datasets/messages_curated.jsonl`).
- Holdout batch (13 different mails, never used for training): message model 11/13 at first, both misses
  being drives that register students through Google Forms. Google Forms links stopped counting as
  suspicious (placement cells use them as much as scammers); after that, 13/13 for the message and doc
  models. The Gmail L2 classifier was 13/13 throughout. That change was made after seeing the holdout,
  so treat 13/13 as optimistic and 11/13 as the untouched score. The final models (after inbox 2 was
  added) score 14/14 and 13/13 on these two batches.

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
