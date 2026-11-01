# Run from mlmodel/: python -m pytest tests
# Quality checks on the committed models. The challenge sets are hand-written and never trained on;
# the named cases are the ones the previous models got wrong.
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers.link_scan import classify_url
from app.routers.offer_scan import classify_message
from app.utils.message_features import get_red_flags
from app.utils.url_features import normalize_url

client = TestClient(app)
FIXTURES = Path(__file__).parent / "fixtures"

LONG_POLITE_FEE_SCAM = (
    "Dear Applicant, I hope you are doing great. With reference to your application on our portal, we are happy to "
    "share that the management has approved your candidature for the post of Junior Web Developer (Work From Home). "
    "Your monthly remuneration will be Rs 28,000. Before we issue the appointment letter, a nominal fee of Rs 2,499 "
    "towards system access and verification has to be paid. Kindly transfer it to careers.onboard@ybl and share a "
    "screenshot of the payment on this chat. Regards, Kavitha Menon, HR Executive"
)
GENUINE_TCS = (
    "Dear Rahul, Congratulations! You have been selected for the position of Assistant System Engineer - Trainee at "
    "Tata Consultancy Services. Your offer letter has been uploaded to the TCS NextStep portal. Please log in to view "
    "and accept the offer within 7 days. TCS does not charge any fee at any stage of the recruitment process."
)
PLACEMENT_NOTICE = (
    "Dear Students, the Training and Placement Cell announces the campus drive of Bosch on 14 November for 2027 "
    "batch students. Eligible students must register on the placement portal by 10 November. - Placement Officer"
)

LEGIT_URLS = [
    "google.com", "https://www.google.com/", "https://nmamit.nitte.edu.in", "github.com/login",
    "https://www.linkedin.com/jobs", "https://www.onlinesbi.sbi", "https://www.hdfcbank.com",
    "https://www.icicibank.com/personal-banking", "https://www.amazon.in/", "en.wikipedia.org/wiki/Phishing",
    "https://internshala.com/internships", "https://www.naukri.com/software-jobs", "https://www.tcs.com/careers",
    "https://careers.infosys.com", "https://vtu.ac.in", "https://mail.google.com/mail/u/0/", "https://www.nmamit.in",
    "https://placement.nmamit.in", "https://www.india.gov.in",
]
PHISH_URLS = [
    "internship-confirm.tk/verify", "paypa1-secure.xyz/login", "https://www.sbi-kyc-update.com/",
    "https://careers.fake-hiring.tk/apply", "http://sbi-kyc-online.co/update", "https://netflix-billing-help.com/account",
    "https://office365-secure-verify.web.app/login", "hdfc-netbanking-verify.co.in", "flipkart-luckydraw.shop/claim",
    "https://github.com.evil-login.xyz/", "http://192.168.4.20/paypal/login.php", "https://metamask-usa-walet.godaddysites.com/",
    "https://incometax-refund-gov.in/claim", "https://tcs-offerletter-download.online/candidate",
    "https://login-microsoftonline.com.sec-check.ru/", "https://appleid.apple.com-verify.info/",
]


@pytest.mark.parametrize("name", ["challenge_messages.jsonl", "challenge_messages_2.jsonl"])
def test_message_model_on_unseen_challenge_sets(name):
    df = pd.read_json(FIXTURES / name, lines=True)
    predicted = [int(classify_message(t)[0] == "Legit") for t in df["text"]]
    accuracy = (pd.Series(predicted) == df["label"]).mean()
    assert accuracy >= 0.9, f"{name}: {accuracy:.2f}"


def test_message_model_fixes_the_old_misses():
    assert classify_message(LONG_POLITE_FEE_SCAM)[0] == "Fake"     # length used to make scams look legit
    assert classify_message(GENUINE_TCS)[0] == "Legit"
    assert classify_message(PLACEMENT_NOTICE)[0] == "Legit"


def test_pay_to_intern_training_programs_are_flagged():
    # The most common "internship" scam in student inboxes: the fee is only hinted at
    text = (
        "Congratulations! You have been shortlisted for the Online Internship Program powered by a global tech brand. "
        "Complete your application at the form link to confirm your seat. You will receive a co-branded certificate, "
        "an AICTE and NSDC approved traineeship certificate and lifetime job assistance. Use scholarship code TECH@30 "
        "for a 30% concession. Note: mentor charges are applicable. Forward this to classmates who missed it."
    )
    assert classify_message(text)[0] == "Fake"
    assert any("training, mentoring or certificates" in f for f in get_red_flags(text))


def test_placement_cell_drive_with_a_google_form_is_legit():
    text = (
        "Dear students, kindly go through the campus drive details for the Analyst role. Eligible students register "
        "in the Google Form https://forms.gle/abc123 by 15th October, 10.00 am. Stipend: Rs 20,000 per month. "
        "Registration link closes at 10 am. Online test at college labs on 17th October, interviews on 24th October. "
        "All Good Wishes, Head - Department of Training & Placement"
    )
    assert classify_message(text)[0] == "Legit"
    assert get_red_flags(text) == []


def test_doc_model_flags_a_fee_demanding_offer_letter():
    letter = (
        "OFFER LETTER\n\nDate: 28 October 2026\n\nDear Candidate,\n\nWe are pleased to offer you the position of "
        "Software Developer Intern at Nexora Technologies Pvt Ltd for a period of six months with a monthly stipend of "
        "Rs 18,000. Your joining date is 10 November 2026.\n\nAs per company policy, all interns must pay a refundable "
        "onboarding and laptop security deposit of Rs 2,499 before joining. Please transfer the amount to our UPI ID "
        "nexora.hr@ybl and email the payment screenshot to confirm your seat. Unpaid offers will be cancelled after "
        "48 hours.\n\nRegards,\nHR Manager\nNexora Technologies"
    ).encode()
    body = client.post("/scan/doc/", files={"file": ("offer.txt", letter, "text/plain")}).json()
    assert body["prediction"] == "Phishing/Fake" and body["risk_level"] in {"MEDIUM", "HIGH"}


def test_doc_model_passes_a_genuine_offer_letter():
    letter = (
        "Tata Consultancy Services Limited\n\nLetter of Offer\n\nDear Priya Sharma,\n\nWe are pleased to offer you "
        "employment as Assistant System Engineer - Trainee. Your annual compensation will be as detailed in Annexure 1. "
        "Your date of joining and location will be communicated through the TCS NextStep portal. Please bring your "
        "original academic certificates for verification on the day of joining. TCS does not charge any fee from "
        "candidates at any stage of recruitment.\n\nYours sincerely,\nTalent Acquisition Group"
    ).encode()
    body = client.post("/scan/doc/", files={"file": ("tcs_offer.txt", letter, "text/plain")}).json()
    assert body["prediction"] == "Legitimate"


def test_unified_scan_no_longer_trusts_the_sender_domain():
    body = client.post("/scan/unified/", json={"email_text": GENUINE_TCS}).json()
    assert body["signals"]["email"]["prediction"] == "Legit" and body["risk_level"] == "LOW"


@pytest.mark.parametrize("url", LEGIT_URLS)
def test_link_model_passes_real_sites(url):
    assert classify_url(url)[0] == "Legit", url


@pytest.mark.parametrize("url", PHISH_URLS)
def test_link_model_flags_phishing(url):
    assert classify_url(url)[0] == "Phishing", url


def test_scheme_and_www_do_not_change_the_verdict():
    # The old model learned "has www = legit"; normalisation makes that impossible now
    assert normalize_url("https://www.Example.com/a/?q=1#x") == normalize_url("http://example.com/a") == "example.com/a"
    for url in ("sbi-kyc-update.com", "nitte.edu.in/aboutNitte.php"):
        assert classify_url(url)[0] == classify_url("https://www." + url)[0]
