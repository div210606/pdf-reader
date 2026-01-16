# 🌐 Offline Setup Guide

Your PDF Reader now supports **full offline functionality** with automatic updates and professional splash screens.

## ✅ New Features Added

### 🔄 Auto-Update System
- **Desktop App**: Automatic background updates using `electron-updater`
- **Web/PWA**: Version checking with update notifications
- **GitHub Integration**: Releases published to GitHub trigger updates

### 🎨 Professional Splash Screen
- Beautiful animated splash screen for desktop app
- Loading indicators and version display
- Update notifications during splash
- Smooth transitions to main app

### 📱 Full Offline Support
- **Local PDF.js**: All PDF processing happens offline
- **Service Worker**: Caches all assets for offline use
- **Fallback System**: Graceful degradation when online

## 🚀 Quick Start

### Desktop App (Recommended)
```bash
# Build and run with splash screen
./build-electron-app.sh

# Features:
- ✅ Auto-updates
- ✅ Splash screen
- ✅ Full offline
- ✅ Native file dialogs
```

### Web/PWA Version
```bash
# Run with offline support
./run-pwa.sh

# Features:
- ✅ Offline caching
- ✅ Update notifications
- ✅ Installable as app
- ✅ Service Worker
```

### Docker Version
```bash
# Build with offline assets
./build-docker.sh

# Features:
- ✅ Self-contained
- ✅ Offline PDF.js
- ✅ Production ready
```

## 📋 Offline Requirements

### What's Included Offline:
- ✅ PDF.js library (3.11.174)
- ✅ PDF.js worker
- ✅ All app assets
- ✅ Service Worker
- ✅ Splash screen
- ✅ Update checker

### What Still Needs Internet:
- ⚠️ Initial PDF.js download (cached after first load)
- ⚠️ Update checks (can be disabled)
- ⚠️ External links (user-initiated)

## 🔧 Configuration

### Auto-Update Settings

#### Desktop App (Electron)
Edit `package.json`:
```json
{
  "publish": {
    "provider": "github",
    "owner": "your-username",  // Change this
    "repo": "pdf-reader"       // Change this
  }
}
```

#### Web/PWA Updates
Edit `updater.js`:
```javascript
this.updateUrl = 'https://api.github.com/repos/your-username/pdf-reader/releases/latest';
this.currentVersion = '1.0.0';  // Update this when you release
```

### Splash Screen Customization

#### Appearance
Edit `splash.html` to customize:
- Colors and animations
- Loading messages
- Logo and branding
- Update notifications

#### Timing
Edit `main.js`:
```javascript
// Splash screen display time (milliseconds)
setTimeout(() => {
  createWindow();
  createMenu();
}, 2000);  // Change this value
```

### Offline PDF.js

#### Local Files
PDF.js files are stored in:
```
assets/pdfjs/
├── pdf.min.js
└── pdf.worker.min.js
```

#### Fallback Logic
The app automatically:
1. Tries local PDF.js files first
2. Falls back to CDN if needed
3. Caches CDN files for future use

## 🌐 Deployment Options

### 1. Fully Offline Desktop App
```bash
# Build once, deploy anywhere
./build-electron-app.sh

# Result: Self-contained app with:
- ✅ No internet required
- ✅ Auto-updates when online
- ✅ Professional splash screen
```

### 2. Offline-First Web App
```bash
# Deploy to any web server
./run-pwa.sh

# Features:
- ✅ Works offline after first visit
- ✅ Installable as PWA
- ✅ Update notifications
```

### 3. Self-Contained Docker
```bash
# Deploy anywhere Docker runs
./build-docker.sh

# Features:
- ✅ No external dependencies
- ✅ Full offline functionality
- ✅ Production ready
```

## 📱 Testing Offline Mode

### Desktop App
1. Build and run the app
2. Disconnect from internet
3. Open PDF files - they work perfectly!

### Web/PWA
1. Open `http://localhost:8000`
2. Wait for Service Worker to install
3. Go offline
4. Refresh - app still works!

### Verification
- Check browser DevTools → Application → Service Workers
- Verify all assets are cached
- Test PDF rendering offline

## 🔍 Troubleshooting

### PDF.js Not Loading
```bash
# Check if local files exist
ls -la assets/pdfjs/

# Should show:
# pdf.min.js
# pdf.worker.min.js
```

### Updates Not Working
- Verify GitHub repo settings
- Check network connection
- Ensure version numbers are correct

### Splash Screen Issues
- Check `main.js` for timing
- Verify `splash.html` exists
- Check console for errors

### Service Worker Problems
```javascript
// In browser console:
navigator.serviceWorker.getRegistrations().then(console.log);
```

## 📦 Distribution

### Desktop App
- Distribute `dist/` folder contents
- Users get auto-updates
- Works completely offline

### Web App
- Deploy all files to web server
- Enable HTTPS for PWA features
- Users can install as app

### Docker
- Push image to registry
- Deploy anywhere
- Fully self-contained

## 🎯 Best Practices

1. **Version Management**: Update version numbers in both `package.json` and `updater.js`
2. **Release Process**: Create GitHub releases to trigger updates
3. **Testing**: Always test offline functionality before deployment
4. **Security**: Keep PDF.js updated for security patches
5. **User Experience**: Maintain consistent splash screen timing

---

**🎉 Your PDF Reader is now a professional, offline-capable application with auto-updates!**
