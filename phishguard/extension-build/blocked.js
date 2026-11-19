(function initBlockedPage() {
  const params = new URLSearchParams(window.location.search);
  const blockedUrl = params.get('url') || '';
  const score = Math.max(0, Math.min(100, Number(params.get('score') || 0)));
  const level = (params.get('level') || 'HIGH').toUpperCase();
  const eventId = params.get('eventId') || null;

  let reasons = [];
  try {
    reasons = JSON.parse(params.get('reasons') || '[]');
    if (!Array.isArray(reasons)) reasons = [];
  } catch (_error) {
    reasons = [];
  }

  const riskScoreEl = document.getElementById('riskScore');
  const riskLevelEl = document.getElementById('riskLevel');
  const blockedUrlEl = document.getElementById('blockedUrl');
  const reasonListEl = document.getElementById('reasonList');
  const summaryTextEl = document.getElementById('summaryText');

  if (riskScoreEl) riskScoreEl.textContent = String(score);
  if (riskLevelEl) riskLevelEl.textContent = level;
  if (blockedUrlEl) blockedUrlEl.textContent = blockedUrl || '-';
  if (summaryTextEl) {
    summaryTextEl.textContent =
      score >= 85
        ? 'It closely matches known phishing and scam sites. Don’t enter a password, OTP or payment details here.'
        : 'It shows several signs of a phishing or scam site. Don’t enter a password, OTP or payment details here.';
  }

  if (reasonListEl) {
    const lines = reasons.length > 0 ? reasons : ['The address and the page match patterns seen on scam sites.'];
    lines.forEach((line) => {
      const li = document.createElement('li');
      li.textContent = String(line);
      reasonListEl.appendChild(li);
    });
  }

  function sendFeedback(payload) {
    chrome.runtime.sendMessage({ action: 'submitRiskFeedback', payload }, () => {
      // no-op callback
    });
  }

  const reportBtn = document.getElementById('reportBtn');
  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      sendFeedback({
        event_id: eventId,
        platform: 'browser',
        verdict: 'blocked_link_confirmed',
        is_helpful: true,
      });
      reportBtn.textContent = 'Thanks';
      reportBtn.setAttribute('disabled', 'true');
    });
  }

  const goBackBtn = document.getElementById('goBackBtn');
  if (goBackBtn) {
    goBackBtn.addEventListener('click', () => {
      history.back();
    });
  }

  const proceedBtn = document.getElementById('proceedBtn');
  if (proceedBtn) {
    proceedBtn.addEventListener('click', async () => {
      sendFeedback({
        event_id: eventId,
        platform: 'browser',
        verdict: 'blocked_link_overridden',
        is_helpful: false,
      });

      if (!blockedUrl) {
        return;
      }

      // One-time pass for this exact URL, valid for a minute; the link guard removes it on use
      const url = new URL(blockedUrl).href;
      await chrome.storage.local.set({ phishguardBypass: { url, expires: Date.now() + 60_000 } });
      window.location.assign(url);
    });
  }
})();
