# Run from email/: python -m pytest tests
from pipeline import l2_nlp


def test_nlp_model_is_loaded_and_flags_a_fee_scam():
    assert l2_nlp._model_available, "run: python models/train_classifier.py"
    score, label, _ = l2_nlp.check_nlp(
        "Congratulations you are shortlisted for the internship. Pay the registration fee "
        "of Rs 2999 within 24 hours via UPI to confirm your seat."
    )
    assert label == "phish" and score >= 1


def test_nlp_leaves_ordinary_mail_alone():
    score, label, _ = l2_nlp.check_nlp(
        "Hi team, the project review meeting is moved to Thursday 3pm in room 204. Please bring your slides."
    )
    assert label == "ham" and score == 0
