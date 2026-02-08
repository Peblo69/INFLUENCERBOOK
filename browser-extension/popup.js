/**
 * Kiara Vision Browser Extension - Popup Script
 */

document.getElementById('openApp').addEventListener('click', () => {
  chrome.tabs.create({
    url: 'http://localhost:5177'
  });
});

document.getElementById('howItWorks').addEventListener('click', () => {
  alert(`How Kiara Vision Extension Works:

1. Browse any website (Pinterest, Instagram, etc.)
2. Hover over any image you like
3. See the Kiara logo appear in the corner
4. Click to choose an action:
   • Generate with Kiara
   • Use as Reference
   • Analyze Image
5. Image opens in Kiara Studio!

Works on localhost for development, and will work with production URL when deployed.`);
});
