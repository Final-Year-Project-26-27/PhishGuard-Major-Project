# app/utils/message_features.py
# Scam patterns and features for the message model (offers, emails, chats). Used by
# train/train_message_model.py and the routers, so training and serving always match.
import math
import re

import numpy as np

# Payment demand: "pay fee/deposit", not "stipend Rs X"
PAYMENT_DEMAND_PATTERNS = [
    r'\bpay\b.*\b(fees?|deposits?|charges?|amount|registration|processing)\b',
    r'\b(fees?|deposits?|charges?|registration|processing)\b.*\bpay\b',
    r'\b(fees?|deposits?|charges?)\s*[:=]?\s*(of\s*)?(rs|₹|inr)\.?\s*\d+',
    r'(rs|₹|inr)\.?\s*\d+.{0,30}\b(fees?|deposits?|charges?|registration|processing)\b',
    r'\btransfer\s*(rs|₹|inr)\s*\d+',
    r'\bpay\s*(rs|₹|inr)\s*\d+',
    r'\bdeposit\s+\d+',           # e.g. "deposit 2000" without currency
    r'\bpay\s+\d{3,}',            # e.g. "pay 1500" without currency
    r'\bpay\s*via\b', r'\bpay\s*now\b', r'\bpay\s*here\b',
    r'\bpay\s*immediately\b', r'\bpay\s*to\b',
    r'\bupi\s*(id|:)\b', r'@(paytm|ybl|oksbi|okicici|okaxis|okhdfcbank|ibl|axl|upi)\b',
    r'\bgpay\s*to\b', r'\bphonepe\s*to\b', r'\bgoogle\s*pay\s*to\b',
    r'\bpurchase\b.*\b(kit|course|material)\b',
    r'\bbuy\b.*\b(kit|course|material)\b',
    r'\b(refundable|non-refundable)\s*(deposit|fee)\b',
]

URGENCY_PATTERNS = [
    r'within\s+\d+\s*hr', r'within\s+\d+\s*hour', r'within\s+\d+\s*minute',
    r'\bexpire[s]?\b', r'\bexpir(ing|ed)\b',
    r'\blast\s*chance\b', r'\blast\s*reminder\b', r'\bfinal\s*reminder\b',
    r'\bhurry\b', r'\bdon.t\s*miss\b', r'\bact\s*now\b', r'\bact\s*fast\b',
    r'\bfilling\s*fast\b', r'\bonly\s*\d+\s*(seats?|slots?|left)\b',
    r'(slot|offer|spot)\s*(will\s*be|about\s*to\s*be)\s*(given|released|cancelled|expire)',
    r'\b(last|final)\s*(notification|notice|warning)\b',
    r'\bmake\s*sure\b.{0,30}\bwithin\b',
    r'\basap\b', r'\bimmediately\b',
]

SUSPICIOUS_LINK_PATTERNS = [
    r'bit\.ly', r'forms\.gle', r'tinyurl', r'shorturl', r'cutt\.ly', r'rb\.gy', r'is\.gd',
    r'https?://[^\s]*\.(xyz|info|online|site|top|club|cc|shop|icu|cfd|buzz|live|vip)\b',
    r'https?://\d{1,3}(\.\d{1,3}){3}',
]

WHATSAPP_ONLY_PATTERNS = [
    r'(contact|reply|respond|message)\s*(only\s*)?(on|via)\s*(whatsapp|telegram)',
    r'(whatsapp|telegram)\s*(only|us|me|queries)',
    r'(dm|message)\s*(us|me)\s*(on\s*)?(whatsapp|insta|telegram)',
    r'details\s*(will\s*be\s*)?(shared|sent)\s*(only\s*)?after\s*payment',
    r'whatsapp\s*:\s*\+91',
    r'(call|whatsapp)\s*:\s*\+?91',
]

TOO_GOOD_PATTERNS = [
    r'no\s*(experience|skills?|coding|interview)\s*(needed|required)',
    r'guaranteed\s*(placement|job|offer|income|returns?)',
    r'100\s*%\s*placement', r'zero\s*experience',
    r'money\s*back\s*guarantee',
    r'free\s*(macbook|laptop|iphone)',
    r'all\s*expenses\s*paid',
    r'any\s*(degree|branch|year)\s*(accepted|eligible|welcome)',
    r'earn\s*(rs|₹|inr)?\s*[\d,]+\s*(per|a|/)\s*(day|hour)',
    r'\b(like|review|rate)\s*(youtube\s*)?(videos?|products?|hotels?)\b.{0,40}\b(earn|paid|income)',
]

CREDENTIAL_PATTERNS = [
    r'\b(aadhaar|aadhar|pan\s*card|passport)\s*(number|copy|details|card)?\b.{0,40}\b(send|share|upload|provide)',
    r'\b(send|share|upload|provide)\b.{0,40}\b(aadhaar|aadhar|pan\s*card|passport)',
    r'\bbank\s*(account|details)\b',
    # "send us the OTP", but not the bank's own "do not share your OTP"
    r'(?<!not )(?<!never )(?<!n.t )\b(share|send|tell|enter)\b.{0,20}\b(otp|password|pin|cvv)\b',
]

PRESSURE_PATTERNS = [
    r'share\s*(this|with)\s*\d+\s*friend',
    r'share\s*(screenshot|receipt|proof)\b',
    r'(will\s*be|get)\s*(deleted|removed|cancelled)',
    r'no\s*further\s*reminders?',
    r'this\s*(is\s*)?not\s*a\s*scam',
    r'(send|share)\s*(payment\s*)?proof',
]

# Generic phishing: account threats, verification bait, prizes, delivery and bill scams
ACCOUNT_THREAT_PATTERNS = [
    r'\b(account|card|sim|wallet|mailbox|number)\b.{0,40}\b(suspend|block|lock|deactivat|disabl|terminat|restrict)',
    r'\b(suspend|block|lock|deactivat|disabl|terminat|restrict)\w*\b.{0,40}\b(account|card|sim|wallet|mailbox)\b',
    r'\bkyc\b.{0,40}\b(update|pending|expir|verify|complete)',
    r'\b(verify|update|confirm|validate)\s+(your\s+)?(account|details|identity|kyc|pan|information|payment)\b',
    r'\b(you\s*(have\s*)?won|winner|lottery|lucky\s*draw|claim\s*(your\s*)?(prize|reward|gift))\b',
    r'\b(electricity|power|gas)\b.{0,50}\b(disconnect|cut\s*off|cut)\b',
    r'\b(customs|courier|parcel|package|shipment)\b.{0,60}\b(fee|charge|pay|held|on\s*hold)',
    r'\bunusual\s*(sign[\s-]*in|login|activity)\b',
    r'\b(penalty|fine|arrest|legal\s*action|warrant)\b.{0,80}\b(pay|avoid|cancel|verify|transfer)',
    r'\b(pay|avoid|cancel|verify|transfer)\b.{0,80}\b(penalty|fine|arrest|legal\s*action|warrant)\b',
]

LEGIT_INDICATORS = [
    r'\b\w+@(google|microsoft|amazon|flipkart|razorpay|swiggy|zomato|uber|adobe|oracle|infosys|tcs|wipro|samsung|qualcomm|jpmorgan|mckinsey|deloitte|atlassian|phonepe|paytm|goldman|cognizant|accenture|capgemini|kpmg|ola)\.\w+',
    r'\b(docusign|hireright|sterling|first\s*advantage|adobe\s*sign)\b',
    r'\bbackground\s*(check|verification)\b',
    r'\b(hr\s*portal|careers?\s*portal|onboarding\s*portal|taleo|workday|successfactors)\b',
    r'\boffer\s*letter\s*(will\s*be\s*)?(sent|shared|emailed|dispatched)\b',
    r'\bno\s*fees?\s*(are\s*)?(associated|charged|required|at\s*any\s*stage)\b',
    r'\bnever\s*(ask|charge[s]?|request[s]?)\b.{0,30}\b(payment|money|fee|otp|password)',
    r'\b(do\s*not|don.t|never)\s*share\b.{0,30}\b(otp|password|pin|cvv)\b',
    r'\bpre-joining\b',
    r'\bacademic\s*transcripts?\b',
]

PATTERN_GROUPS = {
    "payment_demand": PAYMENT_DEMAND_PATTERNS,
    "urgency": URGENCY_PATTERNS,
    "suspicious_link": SUSPICIOUS_LINK_PATTERNS,
    "chat_only": WHATSAPP_ONLY_PATTERNS,
    "too_good": TOO_GOOD_PATTERNS,
    "credential": CREDENTIAL_PATTERNS,
    "pressure": PRESSURE_PATTERNS,
    "account_threat": ACCOUNT_THREAT_PATTERNS,
    "legit": LEGIT_INDICATORS,
}

RED_FLAG_TEXT = {
    "payment_demand": "Payment or fee demanded from you",
    "urgency": "Urgency/pressure language used",
    "suspicious_link": "Suspicious or shortened links found",
    "chat_only": "Communication restricted to WhatsApp or Telegram",
    "too_good": "Unrealistic promises (no experience needed, guaranteed income)",
    "credential": "Asks for sensitive documents, bank details or OTP",
    "pressure": "Social pressure tactics detected",
    "account_threat": "Threatens your account or asks you to verify details",
}


# Training texts are at most 3,000 characters; capping input keeps the ".*" patterns fast on huge pastes
MAX_CHARS = 5000


def count_matches(text: str, patterns: list[str]) -> int:
    t = text[:MAX_CHARS].lower()
    return sum(1 for p in patterns if re.search(p, t))


def has_fee_demand(text: str) -> bool:
    return count_matches(text, PAYMENT_DEMAND_PATTERNS) >= 1


def extract_features(text: str) -> list[float]:
    text = str(text)[:MAX_CHARS]
    counts = [count_matches(text, patterns) for patterns in PATTERN_GROUPS.values()]
    return counts + [
        int(counts[0] >= 1),
        # Log-scaled and then standardised in the pipeline, so length can't outweigh the scam signals
        math.log1p(len(text)),
        math.log1p(len(text.split())),
        int(bool(re.search(r'\b\w+@\w+\.\w+', text))),
        min(text.count('!'), 10),
        sum(1 for c in text if c.isupper()) / max(len(text), 1),
        min(len(re.findall(r'https?://\S+', text)), 10),
        min(len(re.findall(r'\+91[\s-]?\d{10}|\b\d{10}\b', text)), 10),
    ]


def get_red_flags(text: str) -> list[str]:
    flags = [RED_FLAG_TEXT[g] for g, patterns in PATTERN_GROUPS.items()
             if g in RED_FLAG_TEXT and count_matches(text, patterns) >= 1]
    if not re.search(r'\b\w+@\w+\.\w+', text) and len(text) > 150 and has_fee_demand(text):
        flags.append("No official email address provided")
    return flags


def clean_text(text: str) -> str:
    text = str(text)[:MAX_CHARS].lower()
    text = re.sub(r"http\S+", " URL ", text)
    text = re.sub(r"\+91[\s-]?\d{10}", " PHONE ", text)
    text = re.sub(r"\b\w+@\w+\.\w+\b", " EMAIL ", text)
    text = re.sub(r"[₹$]?\s*\d[\d,]*", " NUM ", text)
    text = re.sub(r"[^a-zA-Z\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


OFFER_TOPIC_KEYWORDS = [
    r'\binternship\b', r'\bintern\b', r'\btrainee\b',
    r'\bjob\s*offer\b', r'\bemployment\b', r'\bjoining\b',
    r'\bstipend\b', r'\bsalary\b', r'\bcompensation\b',
    r'\bjd\b', r'\bjob\s*description\b',
    r'\bselected\s*for\b', r'\bshortlisted\b',
    r'\brecruitment\b', r'\bhiring\b', r'\bcandidate\b',
    r'\boffer\s*letter\b', r'\bjoining\s*(letter|date|kit)\b',
    r'\bplacement\b', r'\bppo\b',
    r'\bonboarding\b', r'\bpre-joining\b',
    r'\bhr\s*(team|portal|department)\b',
    r'\bwork\s*from\s*home\b', r'\bwfh\b', r'\bremote\s*(work|job|intern)\b',
    r'\bfull\s*time\b', r'\bpart\s*time\b',
    r'\bjob\b.*\b(opportunity|opening|role|position)\b',
    r'\b(software|marketing|design|data|content|finance|product)\s*(intern|developer|engineer|analyst)\b',
]


def is_offer_related(text: str) -> bool:
    """True if the message is about a job or internship offer (the WhatsApp bot only answers those)."""
    return count_matches(text, OFFER_TOPIC_KEYWORDS) >= 1


# Module-level so the pickled pipeline can find them (FunctionTransformer stores a reference)
def message_texts(texts) -> list[str]:
    return [clean_text(t) for t in texts]


def message_matrix(texts) -> np.ndarray:
    return np.array([extract_features(t) for t in texts], dtype=float)
