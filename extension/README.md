# 🌐 PlagiarismGuard Browser Extension

> Check for plagiarism on any webpage with a simple right-click

---

## Installation

### Chrome / Edge

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension/` folder from this project
5. The PlagiarismGuard icon should appear in your toolbar

### Usage

1. **Select text** on any webpage
2. **Right-click** and choose "Check for Plagiarism with PlagiarismGuard"
3. **Wait** for analysis (usually 10-30 seconds)
4. **View results** in the popup that appears
5. Matched text will be **highlighted** on the page

---

## Features

- ✅ **Right-click Context Menu** - Check any selected text
- ✅ **Inline Highlighting** - Matched phrases highlighted on page
- ✅ **Results Popup** - See similarity score and top sources
- ✅ **Recent Checks** - View history in extension popup
- ✅ **Auto-detect API** - Works with localhost or production
- ✅ **Customizable** - Change highlight color, toggle auto-highlight

---

## Requirements

The extension requires either:
- **Local server** running at `http://localhost:3000` (dev mode)
- **Production app** at `https://plagiarism-checker-web-app.vercel.app`

The extension will automatically detect which endpoint is available.

---

## Permissions

The extension requests the following permissions:

| Permission | Purpose |
|------------|---------|
| `contextMenus` | Add "Check for Plagiarism" to right-click menu |
| `activeTab` | Access current tab to highlight matches |
| `storage` | Save settings and recent checks |
| `host_permissions` | Connect to PlagiarismGuard API |

---

## File Structure

```
extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (API detection, context menu)
├── content/
│   ├── content.js        # Injected script (analysis, highlighting)
│   └── content.css       # Styles for highlights and popup
├── popup/
│   ├── popup.html        # Extension popup UI
│   ├── popup.js          # Popup logic
│   └── popup.css         # Popup styles
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Troubleshooting

### "Analysis failed" error
- Make sure the local dev server is running (`npm run dev`)
- Or check that production app is accessible

### Highlights not appearing
- Check "Auto-highlight matches" is enabled in extension popup
- Try clicking "Clear Highlights" and re-analyzing

### Context menu not showing
- Refresh the page after installing extension
- Make sure you've selected text before right-clicking

---

## Development

To modify the extension:

1. Edit files in `extension/` folder
2. Go to `chrome://extensions/`
3. Click the refresh icon on PlagiarismGuard card
4. Test changes on a webpage

---

## Future Enhancements

- [ ] Firefox port (Manifest V2)
- [ ] Offline mode with bundled analyzer
- [ ] Batch check multiple selections
- [ ] Export highlighted page as PDF
- [ ] Chrome Web Store publication

---

**Version**: 2.1.0  
**License**: MIT
