// PhishGuard dashboard URL. Change it here when the site is deployed.
const SITE_URL = 'https://phishguard-students.vercel.app';

// PhishGuard Gmail Content Script v3.0
// Detects phishing emails directly in Gmail — only when an email is open
// Specialized for Indian university internship scams

const SUSPICIOUS_KEYWORDS = [
  // Payment related
  'pay', 'payment', 'fee', 'processing fee', '₹', 'rupees', 'training fee',
  'training fee is applicable', 'mentor charges', 'fee scholarship',

  // Urgency tactics
  'urgent', 'immediately', 'asap', 'final call', 'last chance', 'final window',
  'final batch', 'limited seats', 'seats are filling', 'apply before registrations close',
  'no further extensions', 'closing soon', 'deadline alert',

  // Action requests    
  'click here', 'click the link', 'verify now', 'confirm now', 'apply now',
  'fill out the form asap', 'complete your enrollment', 'enrollment process',

  // Selection claims
  'congratulations', 'you have won', 'selected', 'shortlisted',
  'shortlisted for', 'pleased to inform you', 'been shortlisted',

  // Document requests
  'aadhaar', 'pan card', 'bank details', 'account number',
  'send documents', 'share your', 'id proof',

  // Too good to be true
  'guaranteed', '100% placement', 'placement guarantee', 'lifetime job assistance',
  'stipend upto', 'stipend up to', 'free tablet', 'co-branded certificate',

  // Fake program names
  'job bridge program', 'digital bridge program', 'edulet tablet', 'smart edulet',
  'blu ai', 'smart labs', 'prepfree platform',

  // Fake organizations
  'unlox academy', 'shikshavertex', 'shiksha vertex', 'smarted innovations',
  'skill vertex', 'skillvertex',

  // Fake collaboration claims
  'powered by ibm', 'ibm powered', 'ibm training', 'microsoft internship',
  'in collaboration with meity', 'nasscom', 'aicte approved', 'vtu approved',

  // Campus scam patterns
  'campus outreach campaign', 'scholarship campaign', 'campus engagement team',
  'scholarship code', 'use code', 'avail discount',

  // Generic internship scam
  'certificate', 'internship opportunity', 'exclusive opportunity',
  'specially designed for', 'mandatory internship'
];

// Fake internship scam domains targeting Indian students
const SUSPICIOUS_DOMAINS = [
  // Known scam domains from user reports
  'shikshavertex.in', 'unloxacademy.com', 'smartedinnovations.com',
  'skillvertex.com', 'edusera.org', 'edulyt.in',

  // Fake internship sites (already blocked)
  'systemtron.in', 'codsoft.in', 'oasisinfobyte.com', 'bharatintern.live',
  'internpe.in', 'letsintern.in', 'vaultofcodes.com', 'theinternbuddy.com',
  'sparkfoundation.org', 'synapseinterns.com', 'coderscave.com',
  'intrainternship.tech', 'futureinternship.in', 'virtualintern.in',
  'youthopp.in', 'careerbuddy.online', 'trainwithcode.in',
  'prodigyinfotech.dev', 'cognifyz.com', 'infyinternshiphub.com',
  'codealpha.tech', 'mainflow.in', 'interncareerhub.com',
  'interncareerpath.tech', 'codersdata.in', 'upskillintern.in',
  'codeclause.com', 'technohacks.in', 'thecodex.in',

  // Generic suspicious domains
  'internmail.cc', 'careers-meta.org', 'hr-google.com', 'careerupdate.online',
  'urgent-offer.net', 'jobs-securelink.co', 'intern-portal.org', 'verify-now.info',
  'intern-checks.net', 'internship-certificate.xyz', 'internshipoffer.tech',
  'careers-ms.net', 'intern-recruiter.co', 'google-careers.online',
  'join-appleinterns.org', 'tesla-careerhub.info', 'intern-meta-program.net',
  'student-careerconnect.com', 'netflixintern-portal.com', 'linkedinterns.work'
];

// Only trust emails FROM these exact domains
const LEGITIMATE_DOMAINS = [
  'google.com', 'microsoft.com', 'amazon.com', 'apple.com', 'meta.com',
  'facebook.com', 'netflix.com', 'adobe.com', 'ibm.com', 'intel.com',
  'nvidia.com', 'oracle.com', 'sap.com', 'infosys.com', 'tcs.com',
  'wipro.com', 'accenture.com', 'deloitte.com', 'pwc.com', 'kpmg.com',
  // Indian universities - these are LEGITIMATE
  'nmamit.in', 'nitte.edu.in'
];

// Patterns that indicate scam even with personal Gmail accounts
const SCAM_PATTERNS = [
  /job\s*bridge\s*program/i,
  /digital\s*bridge\s*program/i,
  /vtu\s*approved\s*internship/i,
  /edulet\s*tablet/i,
  /unlox\s*academy/i,
  /shiksha\s*vertex/i,
  /smarted\s*innovations/i,
  /ibm\s*training\s*&\s*internship/i,
  /ibm\s*powered\s*internship/i,
  /microsoft\s*internship\s*program/i,
  /stipend\s*upto?\s*\d+k/i,
  /100%\s*placement/i,
  /scholarship\s*code:\s*\w+/i,
  /training\s*fee\s*(is|are)?\s*applicable/i,
  /mentor\s*charges\s*(are|is)?\s*applicable/i,
  /collaboration\s*with\s*(meity|nasscom)/i,
  /powered\s*by\s*(ibm|microsoft|google)/i,
  /final\s*call\s*[–-]\s*limited\s*seats/i,
  /complete\s*(your|the)\s*enrollment\s*(process)?/i,
  /all\s*shortlisted\s*students/i,
  /campus\s*(outreach|engagement)\s*(campaign|team)/i
];

let lastAnalyzedEmail = null;
let warningBanner = null;
let bypassComposeGuardOnce = false;

// Matches the domain itself or a real subdomain. 'fakenmamit.in' is not 'nmamit.in'.
const isDomainOrSubdomain = (domain, d) => domain === d || domain.endsWith('.' + d);

// The sender, reasons and keywords come from the email itself, so escape them before they go into innerHTML
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sendRuntimeMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { ok: false, error: 'no_response' });
    });
  });
}

async function requestUnifiedEmailRisk(emailText, senderDomain) {
  const response = await sendRuntimeMessage({
    action: 'scanUnifiedRisk',
    payload: {
      email_text: emailText,
      sender_domain: senderDomain,
      platform: 'gmail',
      trusted_domains: ['nmamit.in', 'nitte.edu.in'],
    },
  });

  if (!response?.ok || !response?.data) {
    return null;
  }

  return response.data;
}

async function requestUnifiedLinkRisk(url) {
  const response = await sendRuntimeMessage({
    action: 'scanUnifiedRisk',
    payload: {
      url,
      platform: 'gmail',
    },
  });

  if (!response?.ok || !response?.data) {
    return null;
  }

  return response.data;
}

async function requestComposeGuard(draftText, recipients) {
  const response = await sendRuntimeMessage({
    action: 'scanComposeDraft',
    payload: {
      draft_text: draftText,
      recipients,
      trusted_domains: ['nmamit.in', 'nitte.edu.in'],
    },
  });

  if (!response?.ok || !response?.data) {
    return null;
  }

  return response.data;
}

function submitRiskFeedback(payload) {
  return sendRuntimeMessage({
    action: 'submitRiskFeedback',
    payload,
  });
}

function extractComposeData() {
  const composeBox = document.querySelector('div[aria-label="Message Body"]') ||
    document.querySelector('div[role="textbox"][g_editable="true"]');

  const draftText = (composeBox?.innerText || '').trim();

  const recipientNodes = document.querySelectorAll('span[email], input[aria-label*="To"]');
  const recipients = [];
  recipientNodes.forEach((node) => {
    const email = (node.getAttribute('email') || node.value || node.innerText || '').trim();
    if (email.includes('@')) {
      recipients.push(email);
    }
  });

  return {
    draftText,
    recipients: [...new Set(recipients)],
  };
}

// Returns true only when the user is viewing an actual email (not inbox/home)
function isInsideEmailView() {
  const hash = location.hash;
  // Gmail email URLs contain: #inbox/messageId, #sent/messageId, etc.
  // They always have a second segment after the folder name
  const parts = hash.replace('#', '').split('/');
  // Home screen is just #inbox or #all or nothing — no message ID segment
  if (parts.length < 2) return false;
  // The message ID is a long hex string (at least 10 chars)
  const msgId = parts[parts.length - 1];
  return msgId.length >= 10 && /^[a-zA-Z0-9_+%-]+$/.test(msgId);
}

async function analyzeEmailContent() {
  // Only analyze when the user has actually opened an email
  if (!isInsideEmailView()) {
    console.log('🛡️ PhishGuard: Not in email view, skipping analysis');
    removeWarningBanner();
    return;
  }
  console.log('🛡️ PhishGuard: Analyzing email...');

  // Only the message itself: falling back to the whole page would scan the half-loaded view,
  // mark the email as done, and skip the real body when it renders
  const emailBody = document.querySelector('.a3s.aiL') ||
    document.querySelector('.ii.gt') ||
    document.querySelector('[data-message-id]');

  if (!emailBody) {
    console.log('🛡️ PhishGuard: No email body found');
    return;
  }

  const emailText = emailBody.innerText.toLowerCase();
  const emailTextOriginal = emailBody.innerText; // Keep original for regex
  const emailHTML = emailBody.innerHTML;

  console.log('🛡️ PhishGuard: Email text length:', emailText.length);

  // Check if already analyzed this email
  const emailId = document.location.href;
  if (lastAnalyzedEmail === emailId) {
    console.log('🛡️ PhishGuard: Already analyzed this email');
    return;
  }
  lastAnalyzedEmail = emailId;

  // ── Sender extraction ──────────────────────────────────────────────
  // Scope to the OPEN email's header area to avoid stale data from prev email
  let senderEmail = '';
  let senderDomain = '';

  // The open email's header lives inside elements like .ha, .hP parent, .nH
  // Try scoped querySelectorAll inside the email thread container first
  const emailThread = document.querySelector('.ha') ||
    document.querySelector('.adn.ads') ||
    document.querySelector('[data-message-id]');

  // Attributes that Gmail uses for the actual email address
  const attrCandidates = ['email', 'data-hovercard-id'];
  // Prioritize .gD which is the true sender header element in Gmail!
  const scopedSelectors = ['.gD[email]', 'h3 span[email]', 'span[email]', '.go[email]', '[data-hovercard-id*="@"]'];

  outer:
  for (const sel of scopedSelectors) {
    // Prefer elements scoped to the open email header
    const elements = (emailThread || document).querySelectorAll(sel);
    for (const el of elements) {
      for (const attr of attrCandidates) {
        const val = el.getAttribute(attr) || '';
        if (val.includes('@') && !val.startsWith('http')) {
          senderEmail = val.trim();
          senderDomain = senderEmail.split('@')[1] || '';
          break outer;
        }
      }
    }
  }

  // Fallback: regex-scan the header text
  if (!senderEmail) {
    const headerEl = document.querySelector('.ha') ||
      document.querySelector('.gE.iv.gt') ||
      document.querySelector('.hP')?.closest('.ha');
    if (headerEl) {
      const m = headerEl.innerText.match(/[\w.+%-]+@[\w.-]+\.[a-z]{2,}/i);
      if (m) {
        senderEmail = m[0].trim();
        senderDomain = senderEmail.split('@')[1] || '';
      }
    }
  }

  // Clean up sender email (sometimes it includes < > brackets)
  if (senderEmail) {
    senderEmail = senderEmail.replace(/[<>]/g, '').trim();
    senderDomain = senderEmail.split('@')[1] || '';
  }

  console.log('🛡️ PhishGuard: Extracted Sender:', `"${senderEmail}"`, 'Domain:', `"${senderDomain}"`);

  // ── Whitelist check — NMAMIT / NITTE trusted domains & emails ───────────────
  // Emails from these legitimate college domains and specific emails will NOT show a warning banner
  // This prevents legitimate institutional emails from triggering false alarms
  const ALWAYS_SAFE_DOMAINS = ['nmamit.in', 'nitte.edu.in'];
  const ALWAYS_SAFE_EMAILS = ['placement@nmamit.in']; // Explicitly safe sender

  const isFromCollegeDomain = senderDomain && ALWAYS_SAFE_DOMAINS.some(d => isDomainOrSubdomain(senderDomain.toLowerCase(), d));
  const isSafeEmail = senderEmail && ALWAYS_SAFE_EMAILS.includes(senderEmail.toLowerCase());

  if (isFromCollegeDomain || isSafeEmail) {
    console.log('🛡️ PhishGuard: Email from legitimate college source - SUPPRESSING BANNER:', senderEmail || senderDomain);
    removeWarningBanner();
    return; // Skip all analysis and banner for college domains/emails
  }

  // Analyze for phishing indicators
  const analysis = {
    suspiciousKeywords: [],
    matchedScamPatterns: [],
    isSuspiciousDomain: false,
    isPersonalGmailScam: false,
    isLegitimate: false,
    riskScore: 0,
    reasons: []
  };

  // Check keywords
  SUSPICIOUS_KEYWORDS.forEach(keyword => {
    if (emailText.includes(keyword.toLowerCase())) {
      analysis.suspiciousKeywords.push(keyword);
      analysis.riskScore += 8;
    }
  });

  // Check scam patterns (regex) - HIGH PRIORITY
  SCAM_PATTERNS.forEach(pattern => {
    if (pattern.test(emailTextOriginal)) {
      analysis.matchedScamPatterns.push(pattern.source);
      analysis.riskScore += 25; // High score for known scam patterns
    }
  });

  // Check for personal Gmail sending corporate-style internship emails
  if (senderDomain === 'gmail.com' &&
    (emailText.includes('internship') || emailText.includes('shortlisted') ||
      emailText.includes('enrollment') || emailText.includes('program'))) {
    analysis.isPersonalGmailScam = true;
    analysis.riskScore += 35;
    analysis.reasons.push('Personal Gmail sending internship offers (common scam pattern)');
  }

  // Check sender domain
  if (senderDomain) {
    if (SUSPICIOUS_DOMAINS.some(d => senderDomain.includes(d))) {
      analysis.isSuspiciousDomain = true;
      analysis.riskScore += 50;
      analysis.reasons.push(`Known scam domain: ${senderDomain}`);
    }

    // Check for shikshavertex pattern (name_name@shikshavertex.in)
    if (senderDomain.includes('shikshavertex') || senderDomain.includes('skillvertex')) {
      analysis.riskScore += 60;
      analysis.reasons.push('ShikshaVertex/SkillVertex scam domain detected');
    }

    if (LEGITIMATE_DOMAINS.some(d => isDomainOrSubdomain(senderDomain.toLowerCase(), d))) {
      analysis.isLegitimate = true;
      analysis.riskScore = Math.max(0, analysis.riskScore - 30);
    }
  }

  // Check for payment requests with internship context
  if ((emailText.includes('fee') || emailText.includes('payment') || emailText.includes('charges')) &&
    (emailText.includes('internship') || emailText.includes('training') || emailText.includes('program'))) {
    analysis.riskScore += 45;
    analysis.reasons.push('Requires payment for internship (legitimate internships are FREE)');
  }

  // Check for urgency tactics
  if (emailText.includes('urgent') || emailText.includes('immediately') ||
    emailText.includes('final call') || emailText.includes('final batch') ||
    emailText.includes('limited seats') || emailText.includes('last chance')) {
    analysis.riskScore += 25;
    analysis.reasons.push('Uses aggressive urgency tactics');
  }

  // Check for document requests
  if (emailText.includes('aadhaar') || emailText.includes('pan card') || emailText.includes('id proof')) {
    analysis.riskScore += 30;
    analysis.reasons.push('Requests sensitive documents');
  }

  // Check for fake collaboration claims
  if ((emailText.includes('meity') || emailText.includes('nasscom') || emailText.includes('aicte')) &&
    (emailText.includes('internship') || emailText.includes('training'))) {
    analysis.riskScore += 30;
    analysis.reasons.push('Claims fake govt/industry collaboration');
  }

  // Check for scholarship code pattern (scam indicator)
  if (/scholarship\s*code/i.test(emailTextOriginal) || /use\s*code:\s*\w+/i.test(emailTextOriginal)) {
    analysis.riskScore += 35;
    analysis.reasons.push('Contains "scholarship code" (common scam tactic)');
  }

  // Check for "100% placement" or "guaranteed" claims
  if (emailText.includes('100% placement') || emailText.includes('placement guarantee')) {
    analysis.riskScore += 40;
    analysis.reasons.push('Claims 100% placement guarantee (unrealistic)');
  }

  // Check for free tablet / device promises
  if (emailText.includes('tablet') && (emailText.includes('free') || emailText.includes('receive'))) {
    analysis.riskScore += 30;
    analysis.reasons.push('Promises free device (bait tactic)');
  }

  // Check for mass BCC pattern (to bcc: me)
  const emailHeader = document.querySelector('.iw') || document.querySelector('.gE');
  if (emailHeader && emailHeader.innerText.toLowerCase().includes('bcc:')) {
    analysis.riskScore += 15;
    analysis.reasons.push('Sent as BCC (mass email)');
  }

  // Add scam pattern reasons
  if (analysis.matchedScamPatterns.length > 0) {
    analysis.reasons.push(`Matches ${analysis.matchedScamPatterns.length} known scam pattern${analysis.matchedScamPatterns.length > 1 ? 's' : ''}`);
  }

  // Collect top suspicious keywords found (up to 8 for display)
  analysis.topKeywords = analysis.suspiciousKeywords.slice(0, 8);
  if (analysis.suspiciousKeywords.length > 0) {
    analysis.reasons.push(`Contains ${analysis.suspiciousKeywords.length} suspicious keyword${analysis.suspiciousKeywords.length > 1 ? 's' : ''}`);
  }

  const unified = await requestUnifiedEmailRisk(emailTextOriginal, senderDomain);
  if (unified) {
    const modelRisk = Number(unified.risk_score || 0);
    analysis.riskScore = Math.round((analysis.riskScore * 0.6) + (modelRisk * 0.4));
    analysis.unifiedEventId = unified.event_id || null;

    if (Array.isArray(unified.explanations)) {
      unified.explanations.slice(0, 3).forEach((reason) => {
        if (reason && !analysis.reasons.includes(reason)) {
          analysis.reasons.push(reason);
        }
      });
    }
  }

  // Cap risk score at 100
  analysis.riskScore = Math.min(analysis.riskScore, 100);

  // Show warning if suspicious (lowered threshold for better detection)
  if (analysis.riskScore >= 25) {
    showPhishingWarning(analysis, senderEmail);
  } else {
    removeWarningBanner();
  }
}

function showPhishingWarning(analysis, senderEmail) {
  removeWarningBanner();

  let scamType = 'Suspicious Email';
  if (analysis.reasons.some(r => r.includes('internship') || r.includes('ShikshaVertex') || r.includes('scam pattern'))) {
    scamType = 'Fake Internship Scam';
  } else if (analysis.reasons.some(r => r.includes('payment'))) {
    scamType = 'Payment Scam';
  }

  const high = analysis.riskScore >= 50;
  const headline = high
    ? { 'Fake Internship Scam': 'Likely a fake internship scam', 'Payment Scam': 'Likely a payment scam' }[scamType] || 'Likely a scam email'
    : 'This email could be a scam';
  const advice = scamType === 'Fake Internship Scam'
    ? 'Real internships never charge fees. Don’t pay, fill its forms or share documents until your placement cell confirms it.'
    : 'Don’t pay, reply or open its links until you’ve checked the sender another way.';
  // The keyword count is already a reason; show the words themselves, minus single symbols like ₹
  // Shortest form of overlapping matches: "shortlisted", not also "been shortlisted"
  const words = (analysis.topKeywords || []).filter(k => k.length > 2).sort((a, b) => a.length - b.length)
    .reduce((kept, k) => (kept.some(w => k.includes(w)) ? kept : [...kept, k]), []).slice(0, 5);
  const reasons = analysis.reasons.filter(r => !/^Contains \d+ suspicious keyword/.test(r)).slice(0, 4);
  if (words.length) reasons.push(`Uses scam wording: ${words.join(', ')}`);

  warningBanner = document.createElement('div');
  warningBanner.id = 'phishguard-warning';
  warningBanner.setAttribute('role', 'alert');
  warningBanner.dataset.level = high ? 'high' : 'caution';
  warningBanner.innerHTML = `
    <style>
      #phishguard-warning {
        --pg-bg: #fce8e6; --pg-ink: #3c0d0a; --pg-muted: #5f2b26; --pg-strong: #b3261e; --pg-line: rgba(179,38,30,.22);
        font: 14px/1.5 'Google Sans', Roboto, 'Segoe UI', Arial, sans-serif;
        margin: 4px 0 20px; padding: 16px 20px 14px; border-radius: 8px;
        background: var(--pg-bg); color: var(--pg-ink);
        animation: pgIn .25s ease-out;
      }
      #phishguard-warning[data-level="caution"] { --pg-bg: #fef7e0; --pg-ink: #3d2a00; --pg-muted: #5c4400; --pg-strong: #8a5a00; --pg-line: rgba(138,90,0,.25); }
      #phishguard-warning[data-theme="dark"] { --pg-bg: #3b1f1d; --pg-ink: #fbe3e0; --pg-muted: #e6b8b3; --pg-strong: #f4a19a; --pg-line: rgba(244,161,154,.25); }
      #phishguard-warning[data-theme="dark"][data-level="caution"] { --pg-bg: #352b14; --pg-ink: #fbefd2; --pg-muted: #e3cf9e; --pg-strong: #fdd663; --pg-line: rgba(253,214,99,.25); }
      @keyframes pgIn { from { opacity: 0; transform: translateY(-4px); } }
      @media (prefers-reduced-motion: reduce) { #phishguard-warning { animation: none; } }
      #phishguard-warning * { box-sizing: border-box; font: inherit; color: inherit; }
      #phishguard-warning .pg-top { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--pg-muted); }
      #phishguard-warning .pg-top img { width: 18px; height: 18px; border-radius: 4px; }
      #phishguard-warning .pg-score { margin-left: auto; font-variant-numeric: tabular-nums; }
      #phishguard-warning .pg-score b { color: var(--pg-strong); font-weight: 700; }
      #phishguard-warning .pg-x {
        width: 28px; height: 28px; margin: -4px -8px -4px 4px; border: 0; border-radius: 50%;
        background: none; cursor: pointer; font-size: 18px; line-height: 1; color: var(--pg-muted);
      }
      #phishguard-warning .pg-x:hover { background: var(--pg-line); }
      #phishguard-warning h2 { margin: 6px 0 2px; font-size: 18px; font-weight: 600; line-height: 1.3; color: var(--pg-strong); }
      #phishguard-warning .pg-advice { margin: 0; color: var(--pg-ink); max-width: 70ch; }
      #phishguard-warning ul { margin: 10px 0 0; padding: 10px 0 0 18px; border-top: 1px solid var(--pg-line); color: var(--pg-muted); }
      #phishguard-warning li { margin: 2px 0; }
      #phishguard-warning .pg-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; margin-top: 12px; }
      #phishguard-warning button { cursor: pointer; }
      #phishguard-warning .pg-report {
        border: 0; border-radius: 18px; padding: 7px 16px; font-weight: 600;
        background: var(--pg-strong); color: var(--pg-bg);
      }
      #phishguard-warning .pg-link { border: 0; background: none; padding: 4px 0; font-weight: 600; color: var(--pg-strong); }
      #phishguard-warning .pg-link:hover, #phishguard-warning .pg-link:focus-visible { text-decoration: underline; }
      #phishguard-warning .pg-feedback { margin-left: auto; font-size: 13px; color: var(--pg-muted); }
      #phishguard-warning .pg-feedback .pg-link { font-size: 13px; margin-left: 8px; }
      #phishguard-warning button:disabled { cursor: default; opacity: .7; text-decoration: none; }
      #phishguard-warning button:focus-visible { outline: 2px solid var(--pg-strong); outline-offset: 2px; }
    </style>

    <div class="pg-top">
      <img src="${chrome.runtime.getURL('icon.png')}" alt="">
      <span>PhishGuard</span>
      <span class="pg-score">Scam score <b>${analysis.riskScore}</b>/100</span>
      <button id="phishguard-dismiss-btn" class="pg-x" aria-label="Dismiss warning">×</button>
    </div>
    <h2>${headline}</h2>
    <p class="pg-advice">${advice}</p>
    ${reasons.length ? `<ul>${reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>` : ''}
    <div class="pg-actions">
      <button id="phishguard-report-btn" class="pg-report">Report scam</button>
      <button id="phishguard-open-dashboard-btn" class="pg-link">Open dashboard</button>
      <span class="pg-feedback">Is this right?
        <button id="phishguard-feedback-right" class="pg-link">Yes</button>
        <button id="phishguard-feedback-fp" class="pg-link">No, it’s safe</button>
      </span>
    </div>
  `;


  // Insert banner — try multiple Gmail containers
  const containerSelectors = [
    '.a3s.aiL',
    '.ii.gt',
    '[data-message-id]',
    '.gs',
    '.adn.ads',
    '[role="listitem"]'
  ];

  let emailContainer = null;
  for (const selector of containerSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      emailContainer = el.parentElement || el;
      break;
    }
  }

  if (emailContainer) {
    emailContainer.insertBefore(warningBanner, emailContainer.firstChild);
    console.log('🛡️ PhishGuard: Banner inserted successfully');
  } else {
    const mainArea = document.querySelector('[role="main"]');
    if (mainArea) mainArea.insertBefore(warningBanner, mainArea.firstChild);
  }
  // Match Gmail's theme: use the first opaque background behind the banner
  let bgEl = warningBanner.parentElement, bg = '';
  while (bgEl && (!bg || bg === 'transparent' || bg.endsWith(', 0)'))) { bg = getComputedStyle(bgEl).backgroundColor; bgEl = bgEl.parentElement; }
  const rgb = bg.endsWith(', 0)') ? [255, 255, 255] : (bg.match(/\d+/g) || [255, 255, 255]).map(Number);
  if (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 < 128) warningBanner.dataset.theme = 'dark';

  const dismissBtn = document.getElementById('phishguard-dismiss-btn');
  if (dismissBtn) dismissBtn.addEventListener('click', removeWarningBanner);
  const reportBtn = document.getElementById('phishguard-report-btn');
  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      const emailData = extractEmailData();
      const reportText = [
        `Sender: ${senderEmail || emailData.sender || "unknown"}`,
        `Subject: ${emailData.subject || "unknown"}`,
        "",
        (emailData.body || "").slice(0, 5000),
      ].join("\n");
      chrome.runtime.sendMessage({
        action: "reportScamMessage",
        platform: "gmail",
        messageText: reportText,
        includeScreenshot: true,
        analysis: {
          isScam: true,
          riskScore: analysis.riskScore,
          scamType,
          explanation: analysis.reasons.join(" | ").slice(0, 800),
        },
        pageUrl: window.location.href,
        createdAt: new Date().toISOString(),
      }, (response) => {
        const uploaded = Boolean(response?.screenshotUploaded);
        const backendOk = Boolean(response?.success);
        if (backendOk && uploaded) {
          reportBtn.textContent = "Reported with Screenshot";
          reportBtn.disabled = true;
          reportBtn.style.opacity = "0.75";
          return;
        }

        if (backendOk && !uploaded) {
          reportBtn.textContent = "Reported (No Screenshot)";
          reportBtn.disabled = true;
          reportBtn.style.opacity = "0.75";
          return;
        }

        reportBtn.textContent = "Report Failed - Retry";
        reportBtn.disabled = false;
        reportBtn.style.opacity = "1";
      });
    });
  }
  const openDashBtn = document.getElementById('phishguard-open-dashboard-btn');
  if (openDashBtn) {
    openDashBtn.addEventListener('click', () => {
      window.open(`${SITE_URL}/dashboard`, '_blank');
    });
  }

  const feedbackRightBtn = document.getElementById('phishguard-feedback-right');
  if (feedbackRightBtn) {
    feedbackRightBtn.addEventListener('click', async () => {
      await submitRiskFeedback({
        event_id: analysis.unifiedEventId || null,
        platform: 'gmail',
        verdict: 'correct_alert',
        is_helpful: true,
      });
      feedbackRightBtn.textContent = 'Thanks';
      feedbackRightBtn.disabled = true;
    });
  }

  const feedbackFpBtn = document.getElementById('phishguard-feedback-fp');
  if (feedbackFpBtn) {
    feedbackFpBtn.addEventListener('click', async () => {
      await submitRiskFeedback({
        event_id: analysis.unifiedEventId || null,
        platform: 'gmail',
        verdict: 'false_positive',
        is_helpful: false,
      });
      feedbackFpBtn.textContent = 'Submitted';
      feedbackFpBtn.disabled = true;
    });
  }

  console.log('🛡️ PhishGuard: Phishing email detected!', analysis);
}

function removeWarningBanner() {
  const existing = document.getElementById('phishguard-warning');
  if (existing) {
    existing.remove();
  }
  warningBanner = null;
}

// Observe DOM changes for email navigation
function setupObserver() {
  let lastUrl = location.href;

  const observer = new MutationObserver(() => {
    const currentUrl = location.href;

    // URL changed — user navigated (e.g., opened or closed an email)
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      lastAnalyzedEmail = null;

      if (isInsideEmailView()) {
        // Navigated INTO an email
        setTimeout(analyzeEmailContent, 600);
        setTimeout(analyzeEmailContent, 1400);
      } else {
        // Navigated BACK to inbox/home — remove any existing banner
        removeWarningBanner();
      }
      return;
    }

    // Same URL but email body appeared (e.g., expanding a thread)
    if (isInsideEmailView()) {
      const emailBody = document.querySelector('.a3s.aiL');
      if (emailBody && !document.getElementById('phishguard-warning')) {
        setTimeout(analyzeEmailContent, 400);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize
console.log('🛡️ PhishGuard: Gmail protection active - v3.0');

// Setup observer for navigation
setupObserver();

// Check on hash change (Gmail uses hash-based routing for emails)
window.addEventListener('hashchange', () => {
  console.log('🛡️ PhishGuard: Hash changed');
  lastAnalyzedEmail = null;
  if (isInsideEmailView()) {
    setTimeout(analyzeEmailContent, 500);
    setTimeout(analyzeEmailContent, 1200);
    setTimeout(addScanButton, 800);
  } else {
    removeWarningBanner();
  }
});

// Initial check — only run if already inside an email (e.g., page refresh on email URL)
if (isInsideEmailView()) {
  setTimeout(analyzeEmailContent, 1000);
}

// ========== SCAN WITH PHISHGUARD BUTTON ==========

function addScanButton() {
  // Only add when inside an email view
  if (!isInsideEmailView()) return;
  // Don't add if already exists
  if (document.getElementById('phishguard-scan-btn')) return;

  // Find the email toolbar (action buttons area)
  const toolbar = document.querySelector('.ade') ||
    document.querySelector('[gh="mtb"]') ||
    document.querySelector('.G-atb');

  if (!toolbar) return;

  // Create scan button
  const scanBtn = document.createElement('div');
  scanBtn.id = 'phishguard-scan-btn';
  scanBtn.innerHTML = `
    <style>
      #phishguard-scan-btn button {
        display: inline-flex; align-items: center; gap: 6px; margin-left: 8px; padding: 6px 14px;
        border: 1px solid currentColor; border-radius: 18px; background: none; color: inherit; opacity: .85;
        font: 500 13px 'Google Sans', Roboto, sans-serif; cursor: pointer;
      }
      #phishguard-scan-btn button:hover, #phishguard-scan-btn button:focus-visible { opacity: 1; background: rgba(127,127,127,.15); }
    </style>
    <button type="button">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
        <path d="m9 12 2 2 4-4"></path>
      </svg>
      Scan with PhishGuard
    </button>
  `;

  toolbar.appendChild(scanBtn);

  // Add click handler
  scanBtn.addEventListener('click', scanWithPhishGuard);

  console.log('🛡️ PhishGuard: Scan button added');
}

function scanWithPhishGuard() {
  // Extract email data
  const emailData = extractEmailData();

  if (!emailData.body) {
    alert('Please open an email first to scan it with PhishGuard');
    return;
  }

  // The email scanner lives in the dashboard's Detection Lab. The email body stays out of the
  // URL so it never lands in browser history.
  window.open(`${SITE_URL}/dashboard`, '_blank');

  console.log('🛡️ PhishGuard: Opening scanner with email data');
}

function extractEmailData() {
  const data = {
    sender: '',
    subject: '',
    body: ''
  };

  // Get sender
  const senderSelectors = ['span[email]', '.gD[email]', '.go[email]', '.g2'];
  for (const selector of senderSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      data.sender = el.getAttribute('email') || el.innerText || '';
      if (data.sender.includes('@')) break;
    }
  }

  // Get subject
  const subjectEl = document.querySelector('h2.hP') ||
    document.querySelector('[data-thread-perm-id]') ||
    document.querySelector('.ha h2');
  if (subjectEl) {
    data.subject = subjectEl.innerText || '';
  }

  // Get body
  const bodyEl = document.querySelector('.a3s.aiL') ||
    document.querySelector('.ii.gt') ||
    document.querySelector('[data-message-id]');
  if (bodyEl) {
    data.body = bodyEl.innerText || '';
  }

  return data;
}

function setupPreClickGuard() {
  document.addEventListener('click', async (event) => {
    const anchor = event.target?.closest?.('.a3s.aiL a, .ii.gt a, [data-message-id] a');
    if (!anchor) return;

    const href = anchor.getAttribute('href') || '';
    if (!href || href.startsWith('mailto:') || href.startsWith('#')) return;

    event.preventDefault();
    event.stopPropagation();

    const verdict = await requestUnifiedLinkRisk(href);
    const riskScore = Number(verdict?.risk_score || 0);

    if (!verdict || riskScore < 65) {
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }

    const explanation = Array.isArray(verdict.explanations)
      ? verdict.explanations.slice(0, 2).join('\n- ')
      : 'Potential phishing indicators found.';

    const proceed = window.confirm(
      `PhishGuard warning: this link looks risky (${riskScore}%).\n\n- ${explanation}\n\nOpen anyway?`
    );

    if (proceed) {
      window.open(href, '_blank', 'noopener,noreferrer');
      submitRiskFeedback({
        event_id: verdict.event_id || null,
        platform: 'gmail',
        verdict: 'user_overrode_link_warning',
        is_helpful: false,
      });
    } else {
      submitRiskFeedback({
        event_id: verdict.event_id || null,
        platform: 'gmail',
        verdict: 'user_blocked_link_open',
        is_helpful: true,
      });
    }
  }, true);
}

function setupComposeGuard() {
  document.addEventListener('click', async (event) => {
    const sendButton = event.target?.closest?.('div[role="button"][data-tooltip^="Send"], div[role="button"][aria-label^="Send"]');
    if (!sendButton) return;

    if (bypassComposeGuardOnce) {
      bypassComposeGuardOnce = false;
      return;
    }

    const { draftText, recipients } = extractComposeData();
    if (!draftText || draftText.length < 20) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }

    const guard = await requestComposeGuard(draftText, recipients);
    if (!guard || !guard.should_confirm) {
      bypassComposeGuardOnce = true;
      sendButton.click();
      return;
    }

    const hitSummary = (guard.sensitive_hits || [])
      .slice(0, 3)
      .map((hit) => `${hit.category} x${hit.count}`)
      .join(', ');

    const recipientSummary = (guard.external_domains || []).slice(0, 3).join(', ');
    const proceed = window.confirm(
      `PhishGuard compose check (${guard.risk_score}% risk):\n` +
      `${guard.message}\n` +
      `${hitSummary ? `Sensitive: ${hitSummary}\n` : ''}` +
      `${recipientSummary ? `External recipients: ${recipientSummary}\n` : ''}` +
      '\nSend anyway?'
    );

    submitRiskFeedback({
      platform: 'gmail',
      verdict: proceed ? 'compose_override' : 'compose_blocked',
      is_helpful: !proceed,
      note: `risk=${guard.risk_score}`,
    });

    if (proceed) {
      bypassComposeGuardOnce = true;
      sendButton.click();
    }
  }, true);
}

// Add scan button on load
setTimeout(addScanButton, 2000);
setTimeout(addScanButton, 4000);

setupPreClickGuard();
setupComposeGuard();

