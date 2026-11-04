// PhishGuard Chrome Extension - Combined Link & Email Phishing Detection
// Background Service Worker

try {
  importScripts('gemini-config.js');
} catch (error) {
  console.warn('Gemini config file not loaded, falling back to storage key lookup.');
}

// Optional, gitignored: a local copy that sets GEMINI_CONFIG.apiKey for testing.
// See gemini-config.js for the format.
try {
  importScripts('gemini-config.local.js');
} catch {
  // not present, which is the normal case
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const FIREBASE_PROJECT_ID = 'phisquard';

let phishingLinks = [];
let phishingEmails = [];
let suspiciousKeywords = [];
let phishingPatterns = [];

async function getGeminiApiKey() {
  if (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.apiKey) {
    return GEMINI_CONFIG.apiKey;
  }

  const stored = await chrome.storage.local.get(['geminiApiKey']);
  if (stored.geminiApiKey) {
    return stored.geminiApiKey;
  }

  throw new Error('Missing Gemini API key. Set GEMINI_CONFIG.apiKey or chrome.storage.local.geminiApiKey.');
}

function getGeminiModel() {
  if (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.model) {
    return GEMINI_CONFIG.model;
  }
  return DEFAULT_GEMINI_MODEL;
}

async function getModelApiBaseUrl() {
  if (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.modelApiBaseUrl) {
    return GEMINI_CONFIG.modelApiBaseUrl;
  }

  const stored = await chrome.storage.local.get(['phishguardModelApiBaseUrl']);
  if (stored.phishguardModelApiBaseUrl) {
    return stored.phishguardModelApiBaseUrl;
  }

  return 'https://phishguard-api.vercel.app';
}

async function scanUnifiedRisk(payload) {
  try {
    const baseUrl = await getModelApiBaseUrl();
    const cleanBaseUrl = String(baseUrl).replace(/\/$/, '');
    const response = await fetch(`${cleanBaseUrl}/scan/unified/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: data?.detail || `http_${response.status}`,
      };
    }

    return {
      ok: true,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || 'network_error',
    };
  }
}

async function scanComposeGuard(payload) {
  try {
    const baseUrl = await getModelApiBaseUrl();
    const cleanBaseUrl = String(baseUrl).replace(/\/$/, '');
    const response = await fetch(`${cleanBaseUrl}/scan/unified/compose-guard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: data?.detail || `http_${response.status}`,
      };
    }

    return {
      ok: true,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || 'network_error',
    };
  }
}

async function scanUrlWithIntel(payload) {
  try {
    const baseUrl = await getModelApiBaseUrl();
    const cleanBaseUrl = String(baseUrl).replace(/\/$/, '');
    const response = await fetch(`${cleanBaseUrl}/scan/unified/url-intel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: data?.detail || `http_${response.status}`,
      };
    }

    return {
      ok: true,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || 'network_error',
    };
  }
}

async function submitUnifiedFeedback(payload) {
  try {
    const baseUrl = await getModelApiBaseUrl();
    const cleanBaseUrl = String(baseUrl).replace(/\/$/, '');
    const response = await fetch(`${cleanBaseUrl}/scan/unified/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: data?.detail || `http_${response.status}`,
      };
    }

    return {
      ok: true,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || 'network_error',
    };
  }
}

function safeParseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = String(text || '').match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('PhishGuard Extension Installed');
  fetchPhishingData();
  setInterval(fetchPhishingData, 5 * 60 * 1000); // Refresh every 5 mins
});

// Fetch phishing data from Firebase
async function fetchPhishingData() {
  try {
    // Fetch phishing links
    const linksRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/phishing_links`
    );
    const linksData = await linksRes.json();
    if (linksData.documents) {
      phishingLinks = linksData.documents.map((doc) => doc.fields.url?.stringValue || '').filter(Boolean);
    }

    // Fetch phishing email domains
    const emailsRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/phishing_emails`
    );
    const emailsData = await emailsRes.json();
    if (emailsData.documents) {
      phishingEmails = emailsData.documents.map((doc) => doc.fields.domain?.stringValue || '').filter(Boolean);
    }

    // Fetch suspicious keywords
    const keywordsRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/suspicious_keywords`
    );
    const keywordsData = await keywordsRes.json();
    if (keywordsData.documents) {
      suspiciousKeywords = keywordsData.documents.map((doc) => doc.fields.keyword?.stringValue || '').filter(Boolean);
    }

    // Fetch phishing patterns
    const patternsRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/phishing_patterns`
    );
    const patternsData = await patternsRes.json();
    if (patternsData.documents) {
      phishingPatterns = patternsData.documents.map((doc) => doc.fields.pattern?.stringValue || '').filter(Boolean);
    }

    console.log('PhishGuard data refreshed:', {
      links: phishingLinks.length,
      emails: phishingEmails.length,
      keywords: suspiciousKeywords.length,
      patterns: phishingPatterns.length
    });

    // Update declarative net request rules
    await updateBlockRules();
  } catch (error) {
    console.error('Error fetching phishing data:', error);
  }
}

// Update declarative net request rules dynamically
async function updateBlockRules() {
  try {
    // Get existing rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(rule => rule.id);

    // Remove all existing rules
    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds
      });
    }

    // Create new rules from phishing links
    const newRules = phishingLinks.map((url, index) => ({
      id: index + 1,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          extensionPath: '/blocked.html'
        }
      },
      condition: {
        urlFilter: url,
        resourceTypes: ['main_frame']
      }
    }));

    // Add new rules (limit to 5000 rules for Chrome)
    if (newRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: newRules.slice(0, 5000)
      });
    }

    console.log(`Updated ${Math.min(newRules.length, 5000)} blocking rules`);
  } catch (error) {
    console.error('Error updating block rules:', error);
  }
}

// Analyze link with Gemini AI
async function analyzeLinkWithGemini(url) {
  try {
    const geminiApiKey = await getGeminiApiKey();
    const model = getGeminiModel();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze this URL for phishing indicators and determine if it's malicious or legitimate. URL: ${url}

Please provide:
1. A verdict: PHISHING or LEGITIMATE
2. Risk level: HIGH, MEDIUM, or LOW
3. Brief explanation (2-3 sentences) of why this is suspicious or safe

Format your response as JSON:
{
  "verdict": "PHISHING" or "LEGITIMATE",
  "riskLevel": "HIGH/MEDIUM/LOW",
  "explanation": "Your explanation here"
}`
            }]
          }]
        })
      }
    );

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const parsed = safeParseJsonObject(responseText);
    if (parsed) {
      return parsed;
    }
    
    return {
      verdict: 'UNKNOWN',
      riskLevel: 'MEDIUM',
      explanation: 'Unable to analyze the URL at this time.'
    };
  } catch (error) {
    console.error('Gemini analysis error:', error);
    return {
      verdict: 'UNKNOWN',
      riskLevel: 'MEDIUM',
      explanation: 'Analysis service temporarily unavailable.'
    };
  }
}

// Analyze email with Gemini AI
async function analyzeEmailWithGemini(senderDomain, emailContent) {
  try {
    const geminiApiKey = await getGeminiApiKey();
    const model = getGeminiModel();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze this email for phishing indicators:

Sender Domain: ${senderDomain}
Email Content: ${emailContent}

Check for:
1. Sender domain legitimacy
2. Suspicious keywords (urgent action required, verify account, etc.)
3. Common phishing patterns (fake urgency, requesting credentials, etc.)

Please provide:
1. A verdict: PHISHING or LEGITIMATE
2. Risk level: HIGH, MEDIUM, or LOW
3. Brief explanation (2-3 sentences) of why this email is suspicious or safe

Format your response as JSON:
{
  "verdict": "PHISHING" or "LEGITIMATE",
  "riskLevel": "HIGH/MEDIUM/LOW",
  "explanation": "Your explanation here",
  "suspiciousIndicators": ["indicator1", "indicator2"]
}`
            }]
          }]
        })
      }
    );

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const parsed = safeParseJsonObject(responseText);
    if (parsed) {
      return parsed;
    }
    
    return {
      verdict: 'UNKNOWN',
      riskLevel: 'MEDIUM',
      explanation: 'Unable to analyze the email at this time.',
      suspiciousIndicators: []
    };
  } catch (error) {
    console.error('Gemini email analysis error:', error);
    return {
      verdict: 'UNKNOWN',
      riskLevel: 'MEDIUM',
      explanation: 'Analysis service temporarily unavailable.',
      suspiciousIndicators: []
    };
  }
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function analyzeChatMessageWithLocalModel(messageText, platform = 'unknown') {
  const textRaw = String(messageText || '');
  const text = textRaw.toLowerCase();

  const keywordGroups = {
    urgency: ['urgent', 'immediately', 'asap', 'within 30 minutes', 'final reminder', 'act now'],
    credential: ['verify account', 'confirm account', 'otp', 'password', 'pin', 'kyc', 'login'],
    money: ['fee', 'payment', 'processing fee', 'refundable', 'advance payment', 'deposit'],
    reward: ['won', 'prize', 'reward', 'cashback', 'gift', 'lottery'],
    jobScam: ['shortlisted', 'internship', 'job offer', 'registration', 'certificate', 'onboarding'],
    coercion: ['suspended', 'blocked', 'restricted', 'legal action', 'penalty'],
  };

  const patternRules = [
    { name: 'credential_harvest', pattern: /(verify|confirm|update).{0,30}(account|password|otp|login)/i, weight: 18 },
    { name: 'money_pressure', pattern: /(pay|payment|deposit|fee).{0,25}(now|today|immediately|urgent)/i, weight: 18 },
    { name: 'urgency_threat_combo', pattern: /(urgent|immediate|within).{0,30}(suspend|block|restrict|penalty)/i, weight: 16 },
    { name: 'job_fee_combo', pattern: /(internship|job|shortlisted).{0,40}(fee|payment|deposit|registration)/i, weight: 20 },
  ];

  let score = 0;
  const reasons = [];
  const matchedGroups = [];

  Object.entries(keywordGroups).forEach(([groupName, words]) => {
    const hits = words.filter((word) => text.includes(word));
    if (hits.length > 0) {
      const weight = groupName === 'credential' ? 10 : groupName === 'money' ? 9 : 7;
      score += Math.min(22, hits.length * weight);
      matchedGroups.push(groupName);
      reasons.push(`${groupName} signals: ${hits.slice(0, 2).join(', ')}`);
    }
  });

  patternRules.forEach((rule) => {
    if (rule.pattern.test(textRaw)) {
      score += rule.weight;
      reasons.push(`matched pattern: ${rule.name.replace('_', ' ')}`);
    }
  });

  const urls = textRaw.match(/https?:\/\/[^\s]+/gi) || [];
  if (urls.length > 0) {
    score += 8;
    reasons.push(`contains ${urls.length} external link(s)`);
  }

  if (/(bit\.ly|tinyurl|cutt\.ly|t\.co|rb\.gy)/i.test(textRaw)) {
    score += 12;
    reasons.push('uses shortened link domain');
  }

  if (/\b(?:\+?\d{1,3}[\s-]?)?(?:\d[\s-]?){10,12}\b/.test(textRaw) && /(whatsapp|telegram|contact)/i.test(textRaw)) {
    score += 8;
    reasons.push('asks to continue via external contact number');
  }

  if (platform === 'linkedin' && /(internship|job|hiring)/i.test(textRaw) && /(fee|payment|deposit)/i.test(textRaw)) {
    score += 10;
  }

  if (platform === 'whatsapp' && /(family|friend|known person)/i.test(textRaw) && /(send money|transfer)/i.test(textRaw)) {
    score += 10;
  }

  const riskScore = clampScore(Math.min(96, score));
  const isScam = riskScore >= 58;

  let scamType = 'unknown';
  if (matchedGroups.includes('jobScam')) scamType = 'job scam';
  if (matchedGroups.includes('money')) scamType = 'financial fraud';
  if (matchedGroups.includes('credential')) scamType = 'phishing';

  const explanation =
    reasons.length > 0
      ? `Local AI model detected: ${reasons.slice(0, 3).join(' | ')}`
      : 'Local AI model found low-risk message patterns.';

  return {
    isScam,
    riskScore,
    scamType,
    explanation,
    modelSource: 'local_hybrid_v1',
  };
}

async function analyzeChatMessageWithGemini(messageText, platform = 'unknown') {
  const localResult = analyzeChatMessageWithLocalModel(messageText, platform);

  try {
    const geminiApiKey = await getGeminiApiKey();
    const model = getGeminiModel();

    const prompt = `Analyze the following message and determine if it is a scam.
Respond in JSON format with:

* isScam (true/false)
* riskScore (0-100)
* scamType (e.g., phishing, job scam, financial fraud)
* explanation (short reason)

Message: ${messageText}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
          contents: [{
            parts: [{ text: prompt }],
          }],
        }),
      }
    );

    if (!response.ok) {
      return localResult;
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = safeParseJsonObject(responseText);
    if (!parsed) {
      return localResult;
    }

    const geminiScore = clampScore(parsed.riskScore);
    const combinedScore = clampScore(Math.round(localResult.riskScore * 0.65 + geminiScore * 0.35));
    const finalIsScam = combinedScore >= 58 || Boolean(parsed.isScam);
    const finalScamType = String(parsed.scamType || localResult.scamType || 'unknown');

    return {
      isScam: finalIsScam,
      riskScore: combinedScore,
      scamType: finalScamType,
      explanation: [
        localResult.explanation,
        String(parsed.explanation || '').trim(),
      ].filter(Boolean).slice(0, 2).join(' | '),
      modelSource: 'hybrid_local_plus_gemini',
    };
  } catch (error) {
    console.warn('Gemini chat analysis unavailable; using local hybrid model.');
    return localResult;
  }
}

async function storeScamReport(reportPayload) {
  try {
    const existing = await chrome.storage.local.get(['scamReports']);
    const reports = Array.isArray(existing.scamReports) ? existing.scamReports : [];
    reports.unshift(reportPayload);
    await chrome.storage.local.set({
      scamReports: reports.slice(0, 250),
    });
    console.log('Stored scam report:', reportPayload);
    return { success: true };
  } catch (error) {
    console.error('Failed to store scam report:', error);
    return { success: false };
  }
}

function dataUrlToProofFilePayload(dataUrl, fileName = 'gmail-screenshot.png') {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }

  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    return null;
  }

  const meta = dataUrl.slice(0, commaIndex);
  const base64Data = dataUrl.slice(commaIndex + 1);
  const mimeMatch = /data:([^;]+);base64/i.exec(meta);
  const mimeType = mimeMatch?.[1] || 'image/png';

  // Approximate base64 decoded size in bytes
  const sizeBytes = Math.floor((base64Data.length * 3) / 4);
  if (sizeBytes <= 0) {
    return null;
  }

  return {
    fileName,
    mimeType,
    sizeBytes,
    base64Data,
  };
}

async function captureScreenshotProof(senderTab) {
  if (!senderTab || typeof senderTab.windowId !== 'number') {
    return null;
  }

  try {
    // Try PNG first for quality, then JPEG fallback if payload too large.
    const pngDataUrl = await chrome.tabs.captureVisibleTab(senderTab.windowId, { format: 'png' });
    const pngPayload = dataUrlToProofFilePayload(pngDataUrl);
    if (pngPayload && pngPayload.sizeBytes <= 7.5 * 1024 * 1024) {
      return pngPayload;
    }

    const jpegDataUrl = await chrome.tabs.captureVisibleTab(senderTab.windowId, { format: 'jpeg', quality: 65 });
    const jpegPayload = dataUrlToProofFilePayload(jpegDataUrl, 'gmail-screenshot.jpg');
    return jpegPayload;
  } catch (error) {
    console.warn('Screenshot capture failed:', error);
    return null;
  }
}

// Hostname of a blocklist entry, which may be stored as a full URL or a bare domain
function blocklistHost(entry) {
  const value = String(entry || '').trim().toLowerCase();
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Matches the domain itself or a real subdomain, so a 't.co' entry can't block 'microsoft.com'
function isDomainOrSubdomain(host, blocked) {
  return Boolean(host && blocked) && (host === blocked || host.endsWith('.' + blocked));
}

// Check if a URL is in the local blocklist
function isUrlBlocked(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return phishingLinks.some(blockedUrl => isDomainOrSubdomain(hostname, blocklistHost(blockedUrl)));
  } catch {
    return false;
  }
}

// Check if email sender domain is suspicious
function isEmailDomainSuspicious(domain) {
  const cleanDomain = String(domain || '').toLowerCase().replace(/^www\./, '');
  return phishingEmails.some(blockedDomain => isDomainOrSubdomain(cleanDomain, blocklistHost(blockedDomain)));
}

// Check for suspicious keywords in email content
function checkSuspiciousKeywords(content) {
  const lowerContent = content.toLowerCase();
  const found = [];
  
  // Default suspicious keywords if none loaded from Firebase
  const defaultKeywords = [
    'urgent action required',
    'verify your account',
    'password expired',
    'click here immediately',
    'suspend your account',
    'confirm your identity',
    'limited time offer',
    'act now',
    'free gift',
    'you have won',
    'congratulations winner',
    'claim your prize',
    'account compromised',
    'unusual activity',
    'update payment',
    'wire transfer',
    'social security',
    'bank account details'
  ];
  
  const keywords = suspiciousKeywords.length > 0 ? suspiciousKeywords : defaultKeywords;
  
  keywords.forEach(keyword => {
    if (lowerContent.includes(keyword.toLowerCase())) {
      found.push(keyword);
    }
  });
  
  return found;
}

// Check for phishing patterns in email content
function checkPhishingPatterns(content) {
  const patterns = [
    /dear\s+(customer|user|member|account\s*holder)/i,
    /verify\s+your\s+(account|identity|information)/i,
    /click\s+(here|below|this\s+link)\s+to/i,
    /your\s+account\s+(has\s+been|will\s+be)\s+(suspended|locked|terminated)/i,
    /confirm\s+your\s+(password|credentials|login)/i,
    /update\s+your\s+(payment|billing|card)\s+information/i,
    /unusual\s+(activity|sign-in|login)/i,
    /immediately|urgently|within\s+24\s+hours/i
  ];
  
  const found = [];
  patterns.forEach(pattern => {
    if (pattern.test(content)) {
      found.push(pattern.toString());
    }
  });
  
  return found;
}

// Message handler for popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkLink') {
    const isBlocked = isUrlBlocked(request.url);
    analyzeLinkWithGemini(request.url).then(analysis => {
      sendResponse({
        isBlocked,
        localMatch: isBlocked,
        geminiAnalysis: analysis
      });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'checkEmail') {
    const domainSuspicious = isEmailDomainSuspicious(request.senderDomain);
    const suspiciousKeywordsFound = checkSuspiciousKeywords(request.content);
    const patternsFound = checkPhishingPatterns(request.content);
    
    analyzeEmailWithGemini(request.senderDomain, request.content).then(analysis => {
      sendResponse({
        domainSuspicious,
        suspiciousKeywords: suspiciousKeywordsFound,
        patterns: patternsFound,
        geminiAnalysis: analysis
      });
    });
    return true;
  }
  
  if (request.action === 'getStats') {
    sendResponse({
      blockedLinks: phishingLinks.length,
      blockedEmails: phishingEmails.length,
      suspiciousKeywords: suspiciousKeywords.length,
      patterns: phishingPatterns.length
    });
    return true;
  }
  
  if (request.action === 'refreshData') {
    fetchPhishingData().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getStatus') {
    chrome.storage.local.get(['blockedCount', 'scannedCount'], function(data) {
      sendResponse({
        active: true,
        blockedCount: data.blockedCount || 0,
        scannedCount: data.scannedCount || 0,
        rulesLoaded: phishingLinks.length + phishingEmails.length
      });
    });
    return true;
  }

  if (request.action === 'analyzeChatMessage') {
    analyzeChatMessageWithGemini(request.messageText, request.platform || 'unknown').then((analysis) => {
      sendResponse(analysis);
    });
    return true;
  }

  if (request.action === 'scanUnifiedRisk') {
    scanUnifiedRisk(request.payload || {}).then((result) => {
      sendResponse(result);
    });
    return true;
  }

  if (request.action === 'scanComposeDraft') {
    scanComposeGuard(request.payload || {}).then((result) => {
      sendResponse(result);
    });
    return true;
  }

  if (request.action === 'scanUrlIntel') {
    scanUrlWithIntel(request.payload || {}).then((result) => {
      sendResponse(result);
    });
    return true;
  }

  if (request.action === 'submitRiskFeedback') {
    submitUnifiedFeedback(request.payload || {}).then((result) => {
      sendResponse(result);
    });
    return true;
  }

  if (request.action === 'reportScamMessage') {
    (async () => {
      const screenshotProof = request.includeScreenshot
        ? await captureScreenshotProof(sender?.tab)
        : null;

      const reportPayload = {
        platform: request.platform || 'unknown',
        messageText: request.messageText || '',
        analysis: request.analysis || null,
        pageUrl: request.pageUrl || '',
        createdAt: request.createdAt || new Date().toISOString(),
        sourceTabId: sender?.tab?.id ?? null,
        proofFile: screenshotProof || undefined,
      };

      // Reports are kept in the extension's local storage (v1 has no report API for the extension)
      const localResult = await storeScamReport(reportPayload);
      const saved = Boolean(localResult?.success);
      sendResponse({
        success: saved,
        local: localResult,
        screenshotAttached: Boolean(screenshotProof),
        screenshotUploaded: saved && Boolean(screenshotProof),
      });
    })();
    return true;
  }
});

// Initial data fetch
fetchPhishingData();
