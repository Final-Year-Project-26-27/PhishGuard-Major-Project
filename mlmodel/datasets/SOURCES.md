# Dataset sources

The training CSVs here are built from public data by the scripts in `train/`. The raw downloads are
not committed (several hundred MB); fetch them into one folder and pass that folder to the builders.

## `links.csv` (link model)

Built by `python -m train.build_link_dataset <raw_dir>`. Columns: `url` (normalised: host + path, no
scheme, `www`, query or fragment), `label` (1 legit, 0 phishing), `source`, `domain` (registrable domain,
used to split train/test by site).

| File in `<raw_dir>` | Source | Class |
| --- | --- | --- |
| `phishtank.csv` | PhishTank verified online phish, `data.phishtank.com/data/online-valid.csv` (downloaded 2026-11-01) | phishing |
| `openphish.txt` | OpenPhish community feed, `openphish.com/feed.txt` | phishing |
| `pdb_active_links.txt` | Phishing.Database active links, `github.com/mitchellkrogza/Phishing.Database` (MIT) | phishing |
| `PhiUSIIL_Phishing_URL_Dataset.csv` | PhiUSIIL Phishing URL Dataset, UCI ML Repository #967 (CC BY 4.0) | both |
| `top-1m.csv` | Tranco top sites list, `tranco-list.eu` | legit |
| `cc_legit.jsonl` | Real page URLs of ~600 popular sites (Indian banks, colleges, government and job sites included), read from each site's own `robots.txt`/sitemap (the first two sites, nitte.edu.in and naukri.com, from the Common Crawl index) | legit |

Balancing: bare domains and URLs with a path are balanced separately, so "has a path" alone says
nothing; at most 50 URLs per site; phish on the 1,000 biggest platforms (Google Docs forms, LinkedIn
redirects) is left out because its URL looks exactly like the platform's own pages.

`app/models/trusted_domains.json` comes from the same run: the Tranco top 10,000 sites, minus link
shorteners, platforms where anyone can get a subdomain, sites with 3+ phish on their own address
(open-redirect links like `google.com/url?q=` don't count), and any subdomain seen serving phishing 3+ times.

## `messages.csv` (message model, doc model, Gmail L2 classifier)

Built by `python -m train.build_message_dataset <raw_dir>`. Columns: `text`, `label` (1 legit, 0 scam),
`source`, `group` (template family; used to split train/test), `date` (inbox mails only; used for the
time-based test).

| Source | Where from | Class |
| --- | --- | --- |
| `offer_corpus` | `offer_messages.csv`, `offer_messages_extra.csv`: student internship/job offers | both |
| `offer_generated` | `offer_messages_generated.csv`, from `generate_dataset.py` templates (grouped by template) | both |
| `inbox` | `inbox_real.jsonl`: 131 real bulk mails from a student's college inbox (2023-2026), read with the owner's permission; addresses, phone numbers, URL paths, names and USNs removed | both |
| `curated` | `messages_curated.jsonl`: modern Indian scams (fee offers, KYC, task jobs, courier, scholarship) and genuine placement notices, offers, bank alerts, OTPs | both |
| `nazario` | Nazario phishing corpus 2023-2025, `monkey.org/~jose/phishing/` (CC BY 4.0) | phishing |
| `spamassassin` | SpamAssassin public corpus, easy_ham, easy_ham_2, hard_ham | legit |
| `sms` | UCI SMS Spam Collection (CC BY 4.0) | both |

## Other files

- `documents.csv`: short document snippets for the doc model (mixed CSV/TSV, read by `train_doc_model.py`).
- `generate_dataset.py`: the script that produced `offer_messages_generated.csv`.
- `../tests/fixtures/challenge_messages*.jsonl`: hand-written test messages that are never trained on.
