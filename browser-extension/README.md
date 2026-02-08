# Kiara Vision Browser Extension

Turn any image on the web into AI-generated art with Kiara Vision!

## 🚀 Features

- **Hover to Generate**: Hover over any image on Pinterest, Instagram, Google Images, etc.
- **Quick Actions**:
  - ✨ Generate with Kiara
  - 🎯 Use as Reference
  - 🔍 Analyze Image
- **Works Everywhere**: Pinterest, Instagram, Google Images, any website!
- **Localhost Support**: Works with localhost during development

## 📦 Installation (Chrome/Edge)

### Step 1: Generate Icons

1. Open `icons/generate-icons.html` in your browser
2. Right-click each canvas and "Save image as...":
   - Save 16x16 as `icon16.png`
   - Save 48x48 as `icon48.png`
   - Save 128x128 as `icon128.png`
3. Save all in the `icons/` folder

### Step 2: Load Extension

1. Open Chrome/Edge
2. Go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `browser-extension` folder
6. Extension installed! 🎉

### Step 3: Test It

1. Make sure Kiara Studio is running on `http://localhost:5177`
2. Go to Pinterest.com or any website with images
3. Hover over an image
4. See the purple Kiara logo appear!
5. Click it and choose an action

## 🎨 How It Works

1. **Content Script** (`content.js`) - Injects into all web pages
2. **Detects Images** - Finds images when you hover (minimum 200x200px)
3. **Shows Overlay** - Purple Kiara logo with action menu
4. **Sends to App** - Opens Kiara Studio with the image URL

## 🛠️ Configuration

### Change App URL

Edit `content.js` line 8:

\`\`\`javascript
const KIARA_APP_URL = 'http://localhost:5177'; // Change to production URL
\`\`\`

For production, change to your deployed URL:
\`\`\`javascript
const KIARA_APP_URL = 'https://kiara.studio'; // Your production URL
\`\`\`

### Change Minimum Image Size

Edit `content.js` line 9:

\`\`\`javascript
const MIN_IMAGE_SIZE = 200; // Minimum width/height in pixels
\`\`\`

## 📁 File Structure

\`\`\`
browser-extension/
├── manifest.json        # Extension configuration
├── content.js          # Main logic (image detection, overlay)
├── content.css         # Overlay styles
├── background.js       # Background service worker
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic
├── icons/
│   ├── icon16.png     # 16x16 icon
│   ├── icon48.png     # 48x48 icon
│   ├── icon128.png    # 128x128 icon
│   └── generate-icons.html
└── README.md
\`\`\`

## 🐛 Troubleshooting

### Extension not working?

1. Check Chrome console for errors (F12)
2. Make sure Kiara Studio is running on localhost:5177
3. Reload the extension: Go to `chrome://extensions/` → Click reload icon
4. Check minimum image size (default 200x200px)

### Images not detected?

Some websites use lazy loading or custom image containers. The extension detects:
- `<img>` tags
- `<div>` with `background-image`

### Overlay not showing?

1. Make sure you're hovering over images larger than 200x200px
2. Check if page has conflicting z-index styles
3. Try refreshing the page

## 🚢 Deploy to Production

When ready to deploy:

1. Update `KIARA_APP_URL` in `content.js` to production URL
2. Update `background.js` URLs (lines 9, 15, 22)
3. Update `popup.html` footer link (line 70)
4. Zip the folder (exclude README, generate-icons.html)
5. Submit to Chrome Web Store

## 📝 Chrome Web Store Submission

Required for Chrome Web Store:

- [ ] Update manifest version for each release
- [ ] Create promotional images (1400x560, 440x280, 220x140, 128x128)
- [ ] Write description and screenshots
- [ ] Privacy policy (if collecting data)
- [ ] Create developer account ($5 one-time fee)

## 🔒 Permissions

- `activeTab`: Access current tab when extension icon clicked
- `storage`: Store pending image data
- `http://localhost:5177/*`: Access localhost during development
- `https://*/*`: Work on all HTTPS websites

## 💡 Tips

- **Test on Pinterest**: Best place to test - lots of images!
- **Test on Instagram**: Works with feed images
- **Test on Google Images**: Works with search results
- **Dynamic Content**: Uses MutationObserver to detect lazy-loaded images

## 🎯 Future Enhancements

- [ ] Batch select multiple images
- [ ] Drag & drop images into Kiara
- [ ] Quick edit menu (crop, resize)
- [ ] Save favorite images
- [ ] Keyboard shortcuts
- [ ] Firefox version

---

**Made with 💜 by Kiara Studio Labs**
