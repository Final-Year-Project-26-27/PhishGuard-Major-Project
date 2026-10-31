// PhishGuard Chrome Extension - Combined Link & Email Phishing Detection
// Background Service Worker

const FIREBASE_PROJECT_ID = 'phisquard';

let phishingLinks = [];
let phishingEmails = [];
let suspiciousKeywords = [];
let phishingPatterns = [];

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
      action: { type: 'block' },
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

// Message handler for the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
});

// Initial data fetch
fetchPhishingData();
