// PhishGuard Global Link Guard

(async function initPhishGuardLinkGuard() {
  const currentUrl = window.location.href;

  if (!/^https?:\/\//i.test(currentUrl)) {
    return;
  }

  // "Proceed anyway" on the blocked page grants a one-time pass for this exact URL. It lives in
  // extension storage, so a link can't skip the check by carrying a magic query parameter.
  const { phishguardBypass } = await chrome.storage.local.get('phishguardBypass');
  if (phishguardBypass && phishguardBypass.url === currentUrl && phishguardBypass.expires > Date.now()) {
    await chrome.storage.local.remove('phishguardBypass');
    return;
  }

  const host = window.location.hostname.toLowerCase();
  const allowlistHosts = [
    'localhost',
    '127.0.0.1',
    'mail.google.com',
    'accounts.google.com',
    'chrome.google.com',
    'web.whatsapp.com',
    'www.linkedin.com',
    'linkedin.com',
  ];

  if (allowlistHosts.some((safeHost) => host === safeHost || host.endsWith(`.${safeHost}`))) {
    return;
  }

  const extensionBase = chrome.runtime.getURL('');
  if (currentUrl.startsWith(extensionBase)) {
    return;
  }

  const trustedDomains = ['google.com', 'microsoft.com', 'github.com', 'nmamit.in', 'nitte.edu.in'];

  chrome.runtime.sendMessage(
    {
      action: 'scanUrlIntel',
      payload: {
        // Only origin + path: query strings and fragments often carry tokens or personal data
        url: `${window.location.origin}${window.location.pathname}`,
        trusted_domains: trustedDomains,
      },
    },
    (response) => {
      if (chrome.runtime.lastError) {
        return;
      }

      if (!response || !response.ok || !response.data) {
        return;
      }

      const result = response.data;
      const riskScore = Number(result.risk_score || 0);
      const recommendation = String(result.recommendation || '').toLowerCase();

      if (riskScore < 78 && recommendation !== 'block') {
        return;
      }

      const reasons = Array.isArray(result.explanations) ? result.explanations.slice(0, 5) : [];
      const params = new URLSearchParams({
        url: currentUrl,
        score: String(riskScore),
        level: String(result.risk_level || 'HIGH'),
        eventId: String(result.event_id || ''),
        reasons: JSON.stringify(reasons),
      });

      const blockedPage = chrome.runtime.getURL(`blocked.html?${params.toString()}`);
      window.location.replace(blockedPage);
    }
  );
})();
