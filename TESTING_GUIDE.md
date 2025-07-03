# WhisperMaestro Update Window Testing Guide

## 🧪 Current Test Setup

The app is now running with **version 1.2.0** to simulate an update scenario.

## 📋 Testing Steps

### 1. Basic Update Window Test

1. **Look for WhisperMaestro in your menu bar** (top-right of screen)
2. **Right-click the menu bar icon**
3. **Click "Check for Updates"**
4. **Watch the new update window appear**

### 2. Expected Behavior

#### ✅ What You Should See:

1. **Immediate Window**: Update window appears instantly
2. **Checking Animation**: 
   - Spinning progress indicator
   - "Checking for updates..." message
   - Download button shows "Checking..." (disabled)
3. **Update Available**:
   - Version comparison: 1.2.0 → 1.3.0
   - Release notes with new features
   - "Download Update" button enabled
4. **Download Progress** (if you click download):
   - Progress bar with percentage
   - Speed indicator
   - "Downloading..." button state

### 3. Interactive Testing

#### Keyboard Shortcuts:
- **Enter**: Proceed with current action (download/install)
- **Escape**: Dismiss window

#### Button Actions:
- **Download Update**: Starts download process
- **Install & Restart**: Applies update and restarts
- **Remind Me Later**: Closes window
- **Skip This Version**: Closes window

### 4. Visual Elements to Check

#### ✅ Native Design:
- Clean, modern macOS styling
- Proper shadows and blur effects
- Smooth animations
- Responsive layout

#### ✅ State Transitions:
- Checking → Available → Downloading → Complete
- Smooth transitions between states
- Proper button states and visibility

#### ✅ Content:
- App icon and branding
- Version comparison display
- Release notes with emojis
- Progress indicators

## 🔧 Advanced Testing

### Test "No Update" Scenario:
1. Restore version to 1.3.0: `npm run build && npm start`
2. Check for updates
3. Should show "You're up to date!" message

### Test Error Handling:
1. Disconnect internet
2. Check for updates
3. Should show error message with retry option

### Test Multiple Windows:
1. Open multiple update windows
2. Verify only one window is active
3. Check proper window management

## 🐛 Troubleshooting

### If Update Window Doesn't Appear:
- Check console for errors
- Verify app is running (menu bar icon visible)
- Try restarting the app

### If Checking Animation Doesn't Work:
- Check browser console for JavaScript errors
- Verify all files are built correctly
- Check network connectivity

### If Styling Looks Wrong:
- Verify `update-styles.css` is loaded
- Check for CSS conflicts
- Test in different screen sizes

## 📊 Test Results Checklist

- [ ] Update window appears immediately
- [ ] Checking animation works smoothly
- [ ] Version comparison displays correctly
- [ ] Release notes are readable
- [ ] Download button is enabled
- [ ] Progress bar works (if tested)
- [ ] Keyboard shortcuts work
- [ ] Window closes properly
- [ ] No console errors
- [ ] Native macOS appearance

## 🎯 Success Criteria

The update window should feel like a native macOS app with:
- **Instant response** when checking for updates
- **Smooth animations** throughout the process
- **Clear feedback** at every step
- **Professional appearance** matching macOS design
- **Intuitive interactions** with proper keyboard support

## 🔄 Restore Original Version

When testing is complete:

```bash
# Restore version to 1.3.0
sed -i '' 's/"version": "1.2.0"/"version": "1.3.0"/' package.json

# Rebuild and restart
npm run build && npm start
``` 