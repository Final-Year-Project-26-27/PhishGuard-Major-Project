// PhishGuard dashboard URL. Change it here when the site is deployed.
const SITE_URL = 'https://phishguard-students.vercel.app';

// PhishGuard Popup Script
document.addEventListener('DOMContentLoaded', async function() {
  const lastUpdate = document.getElementById('last-update');
  const openDashboard = document.getElementById('open-dashboard');

  // Load stats from storage
  chrome.storage.local.get(['lastUpdate'], function(data) {
    if (lastUpdate) {
      const date = data.lastUpdate ? new Date(data.lastUpdate).toLocaleString() : 'Never';
      lastUpdate.textContent = date;
    }
  });

  // Open dashboard button
  if (openDashboard) {
    openDashboard.addEventListener('click', function() {
      chrome.tabs.create({ url: `${SITE_URL}/dashboard` });
    });
  }
});
