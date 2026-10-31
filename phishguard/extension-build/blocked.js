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
  const scoreFillEl = document.getElementById('scoreFill');
  const summaryTextEl = document.getElementById('summaryText');

  if (riskScoreEl) riskScoreEl.textContent = `${score}%`;
  if (riskLevelEl) riskLevelEl.textContent = level;
  if (blockedUrlEl) blockedUrlEl.textContent = blockedUrl || '-';
  if (scoreFillEl) scoreFillEl.style.width = `${score}%`;
  if (summaryTextEl) {
    summaryTextEl.textContent =
      score >= 85
        ? 'Critical signals matched known phishing behavior.'
        : 'Multiple suspicious indicators were detected on this destination.';
  }

  if (reasonListEl) {
    const lines = reasons.length > 0 ? reasons : ['High-risk phishing indicators were detected by model + page analysis.'];
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
      reportBtn.textContent = 'Thanks for feedback';
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
    proceedBtn.addEventListener('click', () => {
      sendFeedback({
        event_id: eventId,
        platform: 'browser',
        verdict: 'blocked_link_overridden',
        is_helpful: false,
      });

      if (!blockedUrl) {
        return;
      }

      const next = new URL(blockedUrl);
      next.searchParams.set('phishguard_bypass', '1');
      window.location.assign(next.toString());
    });
  }
})();
