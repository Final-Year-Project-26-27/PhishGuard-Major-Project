// Warning shown under a scam message on WhatsApp Web and LinkedIn; same look as the Gmail banner, sized for a chat bubble.
// Loaded before content-whatsapp.js and content-linkedin.js (see manifest.json).

const PHISHGUARD_CHAT_CSS = `
.phishguard-warning {
  --pg-bg: #fce8e6; --pg-ink: #3c0d0a; --pg-muted: #5f2b26; --pg-strong: #b3261e;
  margin-top: 8px; padding: 10px 12px; border-radius: 8px; max-width: 420px;
  background: var(--pg-bg); color: var(--pg-ink);
  font: 13px/1.45 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: left;
}
.phishguard-warning[data-theme="dark"] { --pg-bg: #3b1f1d; --pg-ink: #fbe3e0; --pg-muted: #e6b8b3; --pg-strong: #f4a19a; }
.phishguard-warning * { box-sizing: border-box; font: inherit; color: inherit; }
.phishguard-warning .pg-top { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--pg-muted); }
.phishguard-warning .pg-top img { width: 16px; height: 16px; border-radius: 3px; }
.phishguard-warning .pg-score { margin-left: auto; font-variant-numeric: tabular-nums; }
.phishguard-warning .pg-score b { color: var(--pg-strong); font-weight: 700; }
.phishguard-warning .pg-headline { margin: 4px 0 2px; font-size: 15px; font-weight: 600; color: var(--pg-strong); }
.phishguard-warning .pg-why { margin: 0; }
.phishguard-warning .pg-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; margin-top: 8px; }
.phishguard-warning button { cursor: pointer; }
.phishguard-warning .pg-report { border: 0; border-radius: 16px; padding: 5px 14px; font-weight: 600; background: var(--pg-strong); color: var(--pg-bg); }
.phishguard-warning .pg-link { border: 0; background: none; padding: 3px 0; font-weight: 600; color: var(--pg-strong); }
.phishguard-warning .pg-link:hover, .phishguard-warning .pg-link:focus-visible { text-decoration: underline; }
.phishguard-warning button:disabled { cursor: default; opacity: .7; }
.phishguard-warning button:focus-visible { outline: 2px solid var(--pg-strong); outline-offset: 2px; }
`;

function phishguardChatHeadline(scamType) {
  const type = String(scamType || '').toLowerCase();
  if (/job|intern|offer|recruit/.test(type)) return 'Likely a job scam';
  if (/phish|link|login|kyc|bank/.test(type)) return 'Likely a phishing message';
  if (/pay|money|upi|fee|invest/.test(type)) return 'Likely a payment scam';
  return 'This message looks like a scam';
}

function phishguardIsDark(el) {
  // First opaque background behind the bubble decides light or dark
  for (let node = el; node; node = node.parentElement) {
    const bg = getComputedStyle(node).backgroundColor;
    if (!bg || bg === 'transparent' || bg.endsWith(', 0)')) continue;
    const [r, g, b] = bg.match(/\d+/g).map(Number);
    return r * 0.299 + g * 0.587 + b * 0.114 < 128;
  }
  return false;
}

function renderChatWarning(bubble, analysis, onReport) {
  if (!document.getElementById('phishguard-chat-css')) {
    const style = document.createElement('style');
    style.id = 'phishguard-chat-css';
    style.textContent = PHISHGUARD_CHAT_CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  const warning = el('div', 'phishguard-warning');
  warning.setAttribute('role', 'alert');

  const top = el('div', 'pg-top');
  const logo = el('img');
  logo.src = chrome.runtime.getURL('icon.png');
  logo.alt = '';
  const score = el('span', 'pg-score', 'Scam score ');
  score.appendChild(el('b', '', String(Math.round(Number(analysis.riskScore || 0)))));
  score.appendChild(document.createTextNode('/100'));
  top.append(logo, el('span', '', 'PhishGuard'), score);

  const actions = el('div', 'pg-actions');
  const reportBtn = el('button', 'pg-report', 'Report scam');
  reportBtn.type = 'button';
  reportBtn.addEventListener('click', () => {
    onReport();
    reportBtn.textContent = 'Reported';
    reportBtn.disabled = true;
  });
  const dashboardBtn = el('button', 'pg-link', 'Open dashboard');
  dashboardBtn.type = 'button';
  dashboardBtn.addEventListener('click', () => window.open(`${SITE_URL}/dashboard`, '_blank'));
  actions.append(reportBtn, dashboardBtn);

  warning.append(
    top,
    el('div', 'pg-headline', phishguardChatHeadline(analysis.scamType)),
    el('p', 'pg-why', analysis.explanation || 'It matches patterns common in scam messages. Don’t pay, reply or open its links.'),
    actions,
  );
  bubble.appendChild(warning);
  if (phishguardIsDark(bubble)) warning.dataset.theme = 'dark';
}
