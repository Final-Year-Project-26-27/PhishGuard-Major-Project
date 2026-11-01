// PhishGuard dashboard URL. Change it here when the site is deployed.
const SITE_URL = 'http://localhost:3000';

// PhishGuard LinkedIn Messaging Content Script

const PHISHGUARD_PLATFORM = "linkedin";
const analyzedCache = new Map();
let periodicRescanId = null;
const LINK_SCAN_THRESHOLD = 78;
const TRUSTED_DOMAINS = ["google.com", "microsoft.com", "github.com", "nmamit.in", "nitte.edu.in"];

function detectPlatform() {
  const host = window.location.hostname;
  if (host === "web.whatsapp.com") {
    return "whatsapp";
  }
  if (host.includes("linkedin.com") && window.location.pathname.includes("/messaging")) {
    return "linkedin";
  }
  return "unknown";
}

function normalizeMessageText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function hashMessage(text) {
  const input = `${PHISHGUARD_PLATFORM}:${text}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return String(hash >>> 0);
}

function getThreadRoot() {
  return (
    document.querySelector(".msg-s-message-list-content") ||
    document.querySelector(".msg-thread") ||
    document.querySelector("[data-view-name*='messaging']") ||
    document.querySelector("main") ||
    document.body
  );
}

function isLikelyChatNode(node) {
  if (!(node instanceof HTMLElement)) return false;
  if (node.closest("[contenteditable='true']")) return false;
  if (node.closest(".msg-form__contenteditable")) return false;
  if (node.closest(".msg-overlay-list-bubble")) return false;

  const text = normalizeMessageText(node.textContent || "");
  if (text.length < 12) return false;

  return (
    node.closest("li.msg-s-message-list__event") ||
    node.closest(".msg-s-event-listitem") ||
    node.closest(".msg-thread") ||
    node.closest("[data-view-name*='messaging']")
  );
}

function getIncomingMessageNodes(root = document) {
  const selectors = [
    "li.msg-s-message-list__event .msg-s-event-listitem__body",
    "li.msg-s-message-list__event .msg-s-event-listitem__message-bubble",
    "li.msg-s-message-list__event p",
    ".msg-s-event-listitem__body",
    ".msg-s-event-listitem__message-bubble",
    ".msg-thread p",
    "main .msg-thread p",
    "[data-view-name*='messaging'] p",
    "[data-view-name*='messaging'] a[href^='http']",
  ];

  const nodes = [];
  const seen = new Set();
  selectors.forEach((selector) => {
    root.querySelectorAll(selector).forEach((node) => {
      if (node && node.textContent && !seen.has(node) && isLikelyChatNode(node)) {
        seen.add(node);
        nodes.push(node);
      }
    });
  });
  return nodes;
}

function resolveBubbleContainer(node) {
  return (
    node.closest("li.msg-s-message-list__event") ||
    node.closest(".msg-s-event-listitem") ||
    node.parentElement ||
    node
  );
}

function normalizeCandidateUrl(rawUrl) {
  if (!rawUrl) return null;
  const href = String(rawUrl).trim();
  if (!/^https?:\/\//i.test(href)) return null;

  try {
    const parsed = new URL(href);
    const wrappedUrl = parsed.searchParams.get("url") || parsed.searchParams.get("u") || parsed.searchParams.get("target");
    if (wrappedUrl && /^https?:\/\//i.test(wrappedUrl)) {
      return decodeURIComponent(wrappedUrl);
    }
    return parsed.toString();
  } catch (_error) {
    return null;
  }
}

function buildBlockedPageUrl(targetUrl, result) {
  const riskScore = Number(result?.risk_score || 0);
  const reasons = Array.isArray(result?.explanations) ? result.explanations.slice(0, 5) : [];
  const params = new URLSearchParams({
    url: targetUrl,
    score: String(riskScore),
    level: String(result?.risk_level || "HIGH"),
    eventId: String(result?.event_id || ""),
    reasons: JSON.stringify(reasons),
  });
  return chrome.runtime.getURL(`blocked.html?${params.toString()}`);
}

async function scanLinkWithMlModel(url) {
  const response = await chrome.runtime.sendMessage({
    action: "scanUrlIntel",
    payload: {
      url,
      trusted_domains: TRUSTED_DOMAINS,
    },
  });
  return response;
}

function shouldBlockScanResult(result) {
  if (!result || !result.ok || !result.data) return false;
  const riskScore = Number(result.data.risk_score || 0);
  const recommendation = String(result.data.recommendation || "").toLowerCase();
  return riskScore >= LINK_SCAN_THRESHOLD || recommendation === "block";
}

function installLinkedInLinkBlocker() {
  document.addEventListener(
    "click",
    async (event) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!anchor) return;

      const rawHref = anchor.getAttribute("href") || "";
      const absoluteHref = anchor.href || rawHref;
      const targetUrl = normalizeCandidateUrl(absoluteHref);
      if (!targetUrl) return;

      const targetDomain = (() => {
        try {
          return new URL(targetUrl).hostname.toLowerCase();
        } catch {
          return "";
        }
      })();

      // Ignore LinkedIn internal navigation links.
      if (targetDomain === "linkedin.com" || targetDomain === "www.linkedin.com" || targetDomain.endsWith(".linkedin.com")) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      try {
        const result = await scanLinkWithMlModel(targetUrl);
        if (shouldBlockScanResult(result)) {
          const blockedPage = buildBlockedPageUrl(targetUrl, result.data);
          window.location.assign(blockedPage);
          return;
        }
      } catch (_error) {
        // If ML scan fails, allow normal navigation to avoid dead click.
      }

      window.location.assign(targetUrl);
    },
    true
  );
}

function localScamHeuristic(messageText) {
  const text = messageText.toLowerCase();
  const suspiciousTerms = [
    "shortlisted",
    "internship",
    "registration",
    "fee",
    "refundable",
    "urgent",
    "confirm your seat",
    "whatsapp",
    "selection",
    "microsoft-powered",
    "pay",
    "onboarding",
  ];

  let signalCount = 0;
  suspiciousTerms.forEach((term) => {
    if (text.includes(term)) {
      signalCount += 1;
    }
  });

  const hasExternalLink = text.includes("http://") || text.includes("https://") || text.includes("chat.whatsapp.com");
  const hasMoneyCue = /₹\s?\d+|\brs\.?\s?\d+|\b\d+\s?(inr|rupees?)\b/i.test(messageText);
  const score = signalCount + (hasExternalLink ? 2 : 0) + (hasMoneyCue ? 2 : 0);

  if (score >= 5) {
    return {
      isScam: true,
      riskScore: Math.min(95, 45 + score * 6),
      scamType: "job scam",
      explanation: "Multiple internship scam indicators found: fee request, urgency, and external recruitment link.",
    };
  }

  return {
    isScam: false,
    riskScore: 0,
    scamType: "unknown",
    explanation: "No strong local scam indicators.",
  };
}

async function analyzeWithGemini(messageText) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "analyzeChatMessage",
      platform: PHISHGUARD_PLATFORM,
      messageText,
    });

    if (!response || response.error) {
      return {
        isScam: false,
        riskScore: 0,
        scamType: "unknown",
        explanation: "AI analysis unavailable right now.",
      };
    }

    return response;
  } catch (error) {
    console.error("PhishGuard LinkedIn Gemini error:", error);
    return {
      isScam: false,
      riskScore: 0,
      scamType: "unknown",
      explanation: "AI analysis unavailable right now.",
    };
  }
}

function handleReport(messageText, analysis) {
  chrome.runtime.sendMessage({
    action: "reportScamMessage",
    platform: PHISHGUARD_PLATFORM,
    messageText,
    analysis,
    pageUrl: window.location.href,
    createdAt: new Date().toISOString(),
  });
}

function injectWarningUI(messageNode, analysis, messageText) {
  const bubble = resolveBubbleContainer(messageNode);
  if (!bubble || bubble.querySelector(".phishguard-warning")) {
    return;
  }
  renderChatWarning(bubble, analysis, () => handleReport(messageText, analysis));
}

async function processMessageNode(node) {
  if (!node || node.dataset.phishguardAnalyzed === "1") {
    return;
  }

  const messageText = normalizeMessageText(node.textContent || "");
  if (!messageText || messageText.length < 6) {
    node.dataset.phishguardAnalyzed = "1";
    return;
  }

  const hash = hashMessage(messageText);
  node.dataset.phishguardHash = hash;

  if (analyzedCache.has(hash)) {
    const cachedResult = analyzedCache.get(hash);
    node.dataset.phishguardAnalyzed = "1";
    if (cachedResult?.isScam) {
      injectWarningUI(node, cachedResult, messageText);
    }
    return;
  }

  const analysis = await analyzeWithGemini(messageText);
  const fallback = localScamHeuristic(messageText);
  const finalAnalysis = analysis.isScam ? analysis : fallback;

  analyzedCache.set(hash, finalAnalysis);
  node.dataset.phishguardAnalyzed = "1";

  if (finalAnalysis.isScam) {
    injectWarningUI(node, finalAnalysis, messageText);
  }
}

function observeMessages() {
  const root = getThreadRoot();
  if (!root) {
    return;
  }

  getIncomingMessageNodes(root).forEach((node) => {
    processMessageNode(node);
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((addedNode) => {
        if (!(addedNode instanceof HTMLElement)) {
          return;
        }

        if (
          addedNode.matches &&
          addedNode.matches(
            "li.msg-s-message-list__event, .msg-s-event-listitem__body, .msg-s-event-listitem__message-bubble, .msg-thread p, [data-view-name*='messaging'] p"
          )
        ) {
          processMessageNode(addedNode);
        }

        getIncomingMessageNodes(addedNode).forEach((node) => {
          processMessageNode(node);
        });
      });
    }
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
  });

  if (periodicRescanId) {
    clearInterval(periodicRescanId);
  }

  periodicRescanId = setInterval(() => {
    getIncomingMessageNodes(getThreadRoot()).forEach((node) => {
      processMessageNode(node);
    });
  }, 2000);
}

(function init() {
  const platform = detectPlatform();
  if (platform !== "linkedin") {
    return;
  }

  installLinkedInLinkBlocker();
  observeMessages();
})();
