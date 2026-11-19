// The scam warning shown in Gmail, WhatsApp Web and LinkedIn, and the link to report a message on the site.
// Loaded before each content script (see manifest.json); SITE_URL comes from the content script that loads it.

const PHISHGUARD_WARNING_CSS = `
.phishguard-warning {
  --pg-sev: #c81e1e; --pg-on-sev: #ffffff;
  --pg-bg: #ffffff; --pg-ink: #0c0d0e; --pg-muted: #45484d; --pg-rule: #d9dadc;
  margin: 8px 0 16px; border: 2px solid var(--pg-sev); border-radius: 0;
  background: var(--pg-bg); color: var(--pg-ink);
  font: 14px/1.5 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: left;
}
.phishguard-warning[data-level="caution"] { --pg-sev: #e8a500; --pg-on-sev: #0c0d0e; }
.phishguard-warning[data-theme="dark"] { --pg-bg: #141517; --pg-ink: #f4f4f5; --pg-muted: #b3b5b9; --pg-rule: #2c2e32; }
.phishguard-warning[data-size="compact"] { max-width: 440px; margin: 8px 0 4px; font-size: 13px; }
.phishguard-warning * { box-sizing: border-box; font: inherit; color: inherit; margin: 0; }
.phishguard-warning .pg-bar {
  display: flex; align-items: center; gap: 8px; padding: 5px 6px 5px 10px;
  background: var(--pg-sev); color: var(--pg-on-sev); font-size: 12px; font-weight: 700;
}
.phishguard-warning .pg-bar img { width: 16px; height: 16px; }
.phishguard-warning .pg-score { margin-left: auto; font-variant-numeric: tabular-nums; }
.phishguard-warning .pg-x {
  width: 24px; height: 24px; border: 0; border-radius: 0; background: none; cursor: pointer;
  font-size: 18px; line-height: 1; font-weight: 400;
}
.phishguard-warning .pg-x:hover { background: rgba(0, 0, 0, .18); }
.phishguard-warning .pg-body { padding: 12px 14px 14px; }
.phishguard-warning[data-size="compact"] .pg-body { padding: 10px 12px 12px; }
.phishguard-warning .pg-head { font-size: 20px; font-weight: 800; line-height: 1.2; letter-spacing: -0.01em; }
.phishguard-warning[data-size="compact"] .pg-head { font-size: 16px; }
.phishguard-warning .pg-advice { margin-top: 4px; max-width: 72ch; }
.phishguard-warning .pg-reasons { list-style: none; padding: 0; margin-top: 10px; border-top: 1px solid var(--pg-rule); }
.phishguard-warning .pg-reasons li { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--pg-rule); color: var(--pg-muted); }
.phishguard-warning .pg-reasons li::before { content: ''; flex: none; width: 7px; height: 7px; margin-top: .55em; background: var(--pg-sev); }
.phishguard-warning .pg-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; margin-top: 12px; }
.phishguard-warning button { cursor: pointer; }
.phishguard-warning .pg-report {
  border: 2px solid var(--pg-ink); border-radius: 0; padding: 6px 14px;
  background: var(--pg-ink); color: var(--pg-bg); font-weight: 700;
}
.phishguard-warning .pg-report:hover { background: var(--pg-bg); color: var(--pg-ink); }
.phishguard-warning .pg-link {
  border: 0; background: none; padding: 2px 0; font-weight: 600;
  text-decoration: underline; text-underline-offset: 3px;
}
.phishguard-warning .pg-feedback { margin-left: auto; font-size: 13px; color: var(--pg-muted); }
.phishguard-warning .pg-feedback .pg-link { margin-left: 10px; color: var(--pg-ink); }
.phishguard-warning button:disabled { cursor: default; opacity: .6; text-decoration: none; }
.phishguard-warning button:focus-visible { outline: 2px solid var(--pg-sev); outline-offset: 2px; }
`;

function phishguardScamCategory(scamType) {
  const type = String(scamType || '').toLowerCase();
  if (/job|intern|offer|recruit|placement/.test(type)) return 'fake-job';
  if (/phish|login|kyc|bank|account/.test(type)) return 'phishing';
  if (/pay|money|upi|fee|invest/.test(type)) return 'financial';
  return 'other';
}

function phishguardHeadline(scamType, high) {
  if (!high) return 'This message could be a scam';
  return {
    'fake-job': 'Likely a fake job or internship',
    phishing: 'Likely a phishing message',
    financial: 'Likely a payment scam',
  }[phishguardScamCategory(scamType)] || 'Likely a scam';
}

// Opens the site's report form filled in from the message; the student checks it and sends it while signed in,
// so the report reaches Firestore under the normal rules (no extension login or write access needed)
function phishguardOpenReport({ platform, text, scamType, link: messageLink }) {
  const body = String(text || '');
  // A link the caller found in the message (e.g. behind a button) wins over one in the text
  const link = messageLink || (body.match(/https?:\/\/[^\s<>"')\]]+/)?.[0] || '').replace(/[.,;:!?]+$/, '');
  const params = new URLSearchParams({
    url: link,
    type: phishguardScamCategory(scamType),
    details: `Reported from ${platform} with the PhishGuard extension.\n\n${body.slice(0, 800)}`,
  });
  window.open(`${SITE_URL}/report/?${params}`, '_blank', 'noopener');
}

function phishguardIsDark(el) {
  // First opaque background behind the warning decides light or dark
  for (let node = el; node; node = node.parentElement) {
    const bg = getComputedStyle(node).backgroundColor;
    if (!bg || bg === 'transparent' || bg.endsWith(', 0)')) continue;
    const [r, g, b] = bg.match(/\d+/g).map(Number);
    return r * 0.299 + g * 0.587 + b * 0.114 < 128;
  }
  return false;
}

// Builds the warning. Optional: reasons (list), onDismiss, onFeedback(correct: boolean), compact (chat bubbles).
function renderPhishguardWarning({ score, high, headline, advice, reasons = [], onReport, onDismiss, onFeedback, compact }) {
  if (!document.getElementById('phishguard-warning-css')) {
    const style = document.createElement('style');
    style.id = 'phishguard-warning-css';
    style.textContent = PHISHGUARD_WARNING_CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const button = (className, text, onClick) => {
    const b = el('button', className, text);
    b.type = 'button';
    b.addEventListener('click', () => onClick(b));
    return b;
  };

  const warning = el('div', 'phishguard-warning');
  warning.setAttribute('role', 'alert');
  warning.dataset.level = high ? 'high' : 'caution';
  if (compact) warning.dataset.size = 'compact';

  const bar = el('div', 'pg-bar');
  const logo = el('img');
  logo.src = chrome.runtime.getURL('icon.png');
  logo.alt = '';
  bar.append(logo, el('span', '', 'PhishGuard'), el('span', 'pg-score', `Scam score ${Math.round(Number(score) || 0)}/100`));
  if (onDismiss) {
    const x = button('pg-x', '×', () => onDismiss());
    x.setAttribute('aria-label', 'Dismiss warning');
    bar.append(x);
  }

  const body = el('div', 'pg-body');
  body.append(el('p', 'pg-head', headline));
  if (advice) body.append(el('p', 'pg-advice', advice));
  if (reasons.length) {
    const list = el('ul', 'pg-reasons');
    for (const r of reasons) list.append(el('li', '', r));
    body.append(list);
  }

  const actions = el('div', 'pg-actions');
  actions.append(
    button('pg-report', 'Report scam', () => onReport()),
    button('pg-link', 'Open dashboard', () => window.open(`${SITE_URL}/dashboard`, '_blank', 'noopener')),
  );
  if (onFeedback) {
    const feedback = el('span', 'pg-feedback', 'Is this right?');
    const answer = (correct) => (b) => {
      onFeedback(correct);
      feedback.querySelectorAll('button').forEach((x) => { x.disabled = true; });
      b.textContent = 'Thanks';
    };
    feedback.append(button('pg-link', 'Yes', answer(true)), button('pg-link', 'No, it’s safe', answer(false)));
    actions.append(feedback);
  }
  body.append(actions);

  warning.append(bar, body);
  return warning;
}
