/**
 * Kiara Vision Browser Extension - Background Service Worker
 */

console.log('🎨 Kiara Vision background service started');

// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // Open Kiara app
  chrome.tabs.create({
    url: 'http://localhost:5177'
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'OPEN_KIARA') {
    chrome.tabs.create({
      url: `http://localhost:5177?action=${request.action}&imageUrl=${encodeURIComponent(request.imageUrl)}`
    });
    sendResponse({ success: true });
  }
  return true;
});

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('🎉 Kiara Vision extension installed!');
    // Open welcome page
    chrome.tabs.create({
      url: 'http://localhost:5177'
    });
  }
});
