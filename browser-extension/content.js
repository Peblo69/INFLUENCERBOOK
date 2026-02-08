/**
 * Kiara Vision Browser Extension - Content Script
 * Injects Kiara logo overlay on images across the web
 */

console.log('🎨 Kiara Vision extension loaded!');

// Configuration
const KIARA_APP_URL = 'http://localhost:5177'; // Change to production URL when deployed
const MIN_IMAGE_SIZE = 200; // Minimum width/height to show overlay

// Track hover state
let currentHoveredImage = null;
let overlayElement = null;

// Create the Kiara overlay element
function createOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'kiara-vision-overlay';
  overlay.innerHTML = `
    <div class="kiara-logo">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#8B5CF6" opacity="0.9"/>
        <path d="M12 7L15 10L12 13L9 10L12 7Z" fill="white"/>
        <path d="M12 11L15 14L12 17L9 14L12 11Z" fill="white" opacity="0.7"/>
      </svg>
    </div>
    <div class="kiara-menu">
      <button class="kiara-btn" data-action="generate">
        <span class="kiara-icon">✨</span>
        Generate with Kiara
      </button>
      <button class="kiara-btn" data-action="reference">
        <span class="kiara-icon">🎯</span>
        Use as Reference
      </button>
      <button class="kiara-btn" data-action="analyze">
        <span class="kiara-icon">🔍</span>
        Analyze Image
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

// Position overlay on image
function positionOverlay(img) {
  if (!overlayElement) {
    overlayElement = createOverlay();

    // Add click handlers
    overlayElement.querySelectorAll('.kiara-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        handleAction(action, currentHoveredImage);
      });
    });
  }

  const rect = img.getBoundingClientRect();
  overlayElement.style.display = 'flex';
  overlayElement.style.left = `${rect.left + window.scrollX}px`;
  overlayElement.style.top = `${rect.top + window.scrollY}px`;
  overlayElement.style.width = `${rect.width}px`;
  overlayElement.style.height = `${rect.height}px`;
}

// Hide overlay
function hideOverlay() {
  if (overlayElement) {
    overlayElement.style.display = 'none';
  }
  currentHoveredImage = null;
}

// Check if image is large enough
function isImageValid(img) {
  const rect = img.getBoundingClientRect();
  return rect.width >= MIN_IMAGE_SIZE && rect.height >= MIN_IMAGE_SIZE;
}

// Get image URL (handle various sources)
function getImageUrl(img) {
  // Try src attribute
  if (img.src && img.src.startsWith('http')) {
    return img.src;
  }

  // Try srcset
  if (img.srcset) {
    const sources = img.srcset.split(',');
    const lastSource = sources[sources.length - 1].trim().split(' ')[0];
    return lastSource;
  }

  // Try background image for divs
  if (img.tagName === 'DIV') {
    const bgImage = window.getComputedStyle(img).backgroundImage;
    const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
    if (match) return match[1];
  }

  return null;
}

// Handle action clicks
async function handleAction(action, img) {
  if (!img) return;

  const imageUrl = getImageUrl(img);
  if (!imageUrl) {
    alert('Could not get image URL');
    return;
  }

  console.log(`🎨 Kiara Vision: ${action} - ${imageUrl}`);

  // Send to Kiara app
  try {
    // Open Kiara app in new tab and pass the image
    const kiaraUrl = new URL(KIARA_APP_URL);
    kiaraUrl.searchParams.append('action', action);
    kiaraUrl.searchParams.append('imageUrl', imageUrl);

    // Store in chrome storage for the app to pick up
    chrome.storage.local.set({
      pendingImage: {
        url: imageUrl,
        action: action,
        timestamp: Date.now()
      }
    });

    // Open or focus Kiara tab
    window.open(kiaraUrl.toString(), '_blank');

    hideOverlay();
  } catch (error) {
    console.error('Error sending to Kiara:', error);
    alert('Error: ' + error.message);
  }
}

// Add hover listeners to images
function addImageListeners() {
  // Find all images (including divs with background images)
  const images = document.querySelectorAll('img, div[style*="background-image"]');

  images.forEach(img => {
    // Skip if already has listener
    if (img.hasAttribute('data-kiara-enabled')) return;
    img.setAttribute('data-kiara-enabled', 'true');

    img.addEventListener('mouseenter', (e) => {
      if (!isImageValid(img)) return;

      currentHoveredImage = img;
      positionOverlay(img);
    });

    img.addEventListener('mouseleave', (e) => {
      // Small delay to allow hovering over overlay
      setTimeout(() => {
        if (!overlayElement?.matches(':hover') && currentHoveredImage === img) {
          hideOverlay();
        }
      }, 100);
    });
  });
}

// Listen for overlay mouse leave
document.addEventListener('mouseleave', (e) => {
  if (e.target === overlayElement) {
    hideOverlay();
  }
}, true);

// Initial scan
addImageListeners();

// Watch for dynamically loaded images (infinite scroll, etc.)
const observer = new MutationObserver((mutations) => {
  addImageListeners();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Re-position overlay on scroll/resize
window.addEventListener('scroll', () => {
  if (currentHoveredImage && overlayElement?.style.display !== 'none') {
    positionOverlay(currentHoveredImage);
  }
}, { passive: true });

window.addEventListener('resize', () => {
  if (currentHoveredImage && overlayElement?.style.display !== 'none') {
    positionOverlay(currentHoveredImage);
  }
}, { passive: true });
