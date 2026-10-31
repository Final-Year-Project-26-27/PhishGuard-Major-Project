// PhishGuard web app URL. Change it here when the site is deployed.
const SITE_URL = 'http://localhost:3000';

// PhishGuard Popup Script
document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const statusBadge = document.getElementById('status-badge');
  const blockedCount = document.getElementById('blocked-count');
  const scannedCount = document.getElementById('scanned-count');
  const lastUpdate = document.getElementById('last-update');
  const openDashboard = document.getElementById('open-dashboard');
  const scanCurrentPage = document.getElementById('scan-current-page');
  const reportPhishing = document.getElementById('report-phishing');

  // Load stats from storage
  chrome.storage.local.get(['blockedCount', 'scannedCount', 'lastUpdate'], function(data) {
    if (blockedCount) blockedCount.textContent = data.blockedCount || 0;
    if (scannedCount) scannedCount.textContent = data.scannedCount || 0;
    if (lastUpdate) {
      const date = data.lastUpdate ? new Date(data.lastUpdate).toLocaleString() : 'Never';
      lastUpdate.textContent = date;
    }
  });

  // Open dashboard button
  if (openDashboard) {
    openDashboard.addEventListener('click', function() {
      chrome.tabs.create({ url: SITE_URL + '/dashboard' });
    });
  }

  // Scan current page button
  if (scanCurrentPage) {
    scanCurrentPage.addEventListener('click', function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) {
          const url = tabs[0].url;
          chrome.tabs.create({ 
            url: SITE_URL + '/link?url=' + encodeURIComponent(url) 
          });
        }
      });
    });
  }

  // Report phishing button
  if (reportPhishing) {
    reportPhishing.addEventListener('click', function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) {
          const url = tabs[0].url;
          chrome.tabs.create({ 
            url: SITE_URL + '/report?url=' + encodeURIComponent(url) 
          });
        }
      });
    });
  }

  // Check extension status
  chrome.runtime.sendMessage({ action: 'getStatus' }, function(response) {
    if (chrome.runtime.lastError) {
      if (statusBadge) {
        statusBadge.textContent = 'Error';
        statusBadge.className = 'status-badge error';
      }
      return;
    }
    if (response && response.active) {
      if (statusBadge) {
        statusBadge.textContent = 'Active';
        statusBadge.className = 'status-badge active';
      }
    }
  });
});
