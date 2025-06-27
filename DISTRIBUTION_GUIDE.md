# WhisperMaestro macOS Distribution Guide

This guide will help you turn WhisperMaestro into a distributable macOS app that people can download and use.

## 📋 Prerequisites

1. **Update Author Information**: Edit `package.json` and replace:
   - `"Adrian Cabrera"` with your actual name
   - `"adrian@maestrolabs.com"` with your email
   - `"acdl89"` with your GitHub username
   - Update the homepage URL

## 🎨 Step 1: App Icons

Your app icons are already generated! The following files are ready:
- `assets/icons/mac/icon.icns` - macOS app icon (512x512)

## 🔧 Step 2: Install Dependencies

```bash
npm install
```

## 🏗️ Step 3: Build for Distribution

### Build for macOS
```bash
npm run dist
```

or

```bash
npm run dist:mac
```

## 📦 Step 4: Distribution Files

After building, you'll find distributable files in the `dist-electron/` directory:

### macOS:
- `WhisperMaestro-1.0.0.dmg` - Intel Mac installer
- `WhisperMaestro-1.0.0-arm64.dmg` - Apple Silicon Mac installer
- `WhisperMaestro-1.0.0-mac.zip` - Intel Mac portable version
- `WhisperMaestro-1.0.0-arm64-mac.zip` - Apple Silicon Mac portable version

## 🚀 Step 5: Distribution Strategies

### Option A: GitHub Releases (Recommended)

1. **Create a GitHub repository** for your project
2. **Update package.json** with your GitHub details
3. **Create a release**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. **Upload the DMG files** to the GitHub release

### Option B: Automatic GitHub Releases

1. **Set up GitHub Actions** for automatic building and releasing
2. **Create `.github/workflows/build.yml`**:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: macos-latest

    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm install
    - run: npm run dist
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: macos-build
        path: dist-electron/
```

### Option C: Website Distribution

1. **Create a landing page** for your app
2. **Host the DMG installers** on your website
3. **Provide download links** for Intel and Apple Silicon Macs

## 🔒 Step 6: Code Signing (Optional but Recommended)

### macOS Code Signing
1. **Get an Apple Developer Certificate**
2. **Set environment variables**:
   ```bash
   export CSC_LINK="/path/to/certificate.p12"
   export CSC_KEY_PASSWORD="certificate_password"
   ```
3. **Build with signing**:
   ```bash
   npm run dist
   ```

## 🔄 Step 7: Auto-Updates (Optional)

Your app is already configured for auto-updates via GitHub releases. Users will be notified when new versions are available.

## 📝 Step 8: Final Checklist

Before distributing:

- [ ] Update version in `package.json`
- [ ] Test the app on both Intel and Apple Silicon Macs
- [ ] Update author information
- [ ] Create GitHub repository (if using GitHub releases)
- [ ] Write clear installation instructions
- [ ] Test the installation process
- [ ] Consider code signing certificates
- [ ] Create a privacy policy (since you're using microphone)

## 🎯 Distribution Platforms

Consider distributing on:

- **GitHub Releases** (Free)
- **Your own website**
- **Mac App Store** (requires Apple Developer account)
- **Homebrew** (macOS package manager)

## 📞 Support

When distributing, provide:
- Clear installation instructions
- System requirements (macOS 10.12+)
- Contact information for support
- Privacy policy (important for microphone access)
- Terms of use

## 🔧 Troubleshooting

### Common Issues:

1. **Icon not found**: Make sure `assets/icons/mac/icon.icns` exists
2. **Code signing failed**: Verify certificate paths and passwords
3. **Build failed**: Check Node.js version compatibility
4. **Permission issues**: Ensure microphone permissions are properly handled
5. **Gatekeeper warnings**: Users may need to right-click and "Open" the first time

## 📊 Usage Analytics (Optional)

Consider adding anonymous usage analytics to understand how people use your app:
- Download counts
- Feature usage
- Error reporting
- Performance metrics

Remember to always respect user privacy and provide opt-out options.

## 🍎 macOS-Specific Notes

- **Universal Binary**: Your app supports both Intel and Apple Silicon Macs
- **Hardened Runtime**: Enabled for better security
- **Entitlements**: Configured for microphone access
- **Gatekeeper**: Users may need to allow the app in Security & Privacy settings

---

**Created by Adrian Cabrera** - [GitHub](https://github.com/acdl89) | [Email](mailto:adrian@maestrolabs.com) 