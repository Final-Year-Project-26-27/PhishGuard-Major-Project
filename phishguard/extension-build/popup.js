// PhishGuard site, opened from the popup's links
const SITE_URL = 'https://phishguard-students.vercel.app';

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  $('version').textContent = `v${chrome.runtime.getManifest().version}`;

  document.querySelectorAll('[data-path]').forEach((button) => {
    button.addEventListener('click', () => chrome.tabs.create({ url: `${SITE_URL}${button.dataset.path}` }));
  });

  // Real status from the background worker: is the ML scanner reachable, and did the blocklist load
  chrome.runtime.sendMessage({ action: 'getStatus' }, (status) => {
    if (chrome.runtime.lastError || !status) {
      $('state').textContent = 'Status unavailable';
      $('state').dataset.ok = 'false';
      return;
    }
    $('state').textContent = status.scannerOnline ? 'Protecting this browser' : 'Limited: scanner offline';
    $('state').dataset.ok = String(status.scannerOnline);
    $('scanner').textContent = status.scannerOnline ? 'Online' : 'Unreachable';
    $('scanner').dataset.ok = String(status.scannerOnline);

    const blocklist = $('blocklist');
    if (status.blocklistOk === null) {
      blocklist.textContent = 'Not loaded yet';
    } else if (!status.blocklistOk) {
      blocklist.textContent = "Couldn't load";
      blocklist.dataset.ok = 'false';
    } else {
      const time = new Date(status.blocklistUpdatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      blocklist.textContent = `${status.blockedCount} sites · ${time}`;
    }
  });
});
