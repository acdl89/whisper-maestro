# WhisperMaestro 🎤

A powerful macOS menu bar app for speech-to-text transcription using OpenAI Whisper.

## ✨ Features

- **Global Shortcut**: Press `Cmd+,` to start/stop recording
- **Auto-Paste**: Automatically pastes transcriptions into focused text fields
- **OpenAI Whisper**: High-quality speech recognition
- **Menu Bar Integration**: Always accessible from your menu bar
- **Universal Binary**: Works on both Intel and Apple Silicon Macs

## 🚀 Quick Start

### Download & Install

1. **Download the latest release** from [GitHub Releases](https://github.com/acdl89/whisper-maestro/releases)
2. **Choose your Mac type**:
   - Intel Mac: Download `WhisperMaestro-1.0.0.dmg`
   - Apple Silicon Mac: Download `WhisperMaestro-1.0.0-arm64.dmg`
3. **Open the DMG file** and drag WhisperMaestro to your Applications folder
4. **First launch**: Right-click the app and select "Open" (macOS security)

### Setup

1. **Open WhisperMaestro** from your Applications folder
2. **Enter your OpenAI API key** in the settings
3. **Grant microphone permissions** when prompted
4. **Start transcribing** with `Cmd+,`

## 🎯 How to Use

1. **Focus on any text field** (Notes, Messages, etc.)
2. **Press `Cmd+,`** to start recording
3. **Speak clearly** into your microphone
4. **Press `Cmd+,` again** to stop recording
5. **Your transcription appears** in the focused text field automatically

## ⚙️ Requirements

- **macOS 10.12** or later
- **OpenAI API key** (get one at [platform.openai.com](https://platform.openai.com))
- **Microphone access** (granted during first use)

## 🔧 Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/acdl89/whisper-maestro.git
cd whisper-maestro

# Install dependencies
npm install

# Start development
npm run dev
```

### Build for Distribution

```bash
# Build for macOS
npm run dist

# Or use the build script
./scripts/build-and-distribute.sh
```

## 📦 Distribution Files

After building, you'll find:
- `WhisperMaestro-1.0.0.dmg` - Intel Mac installer
- `WhisperMaestro-1.0.0-arm64.dmg` - Apple Silicon Mac installer
- `WhisperMaestro-1.0.0-mac.zip` - Intel Mac portable
- `WhisperMaestro-1.0.0-arm64-mac.zip` - Apple Silicon Mac portable

## 🔒 Privacy & Security

- **Local Processing**: Audio is processed locally before being sent to OpenAI
- **Secure Storage**: API keys are stored securely using macOS Keychain
- **No Data Retention**: Audio files are deleted immediately after transcription
- **Open Source**: Full transparency - review the code yourself

## 🐛 Troubleshooting

### Common Issues

**"App can't be opened because it's from an unidentified developer"**
- Right-click the app and select "Open"
- Go to System Preferences > Security & Privacy and click "Open Anyway"

**Microphone not working**
- Check System Preferences > Security & Privacy > Microphone
- Ensure WhisperMaestro has microphone access

**Transcription not appearing**
- Make sure a text field is focused
- Check your OpenAI API key in settings
- Verify internet connection

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/acdl89/whisper-maestro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/acdl89/whisper-maestro/discussions)
- **Email**: adrian@maestrolabs.com

## 🙏 Acknowledgments

- Built with [Electron](https://electronjs.org/)
- Speech recognition powered by [OpenAI Whisper](https://openai.com/research/whisper)
- Icons generated with [electron-icon-maker](https://github.com/safu9/electron-icon-maker)

---

**Created by Adrian Cabrera** - [GitHub](https://github.com/acdl89) | [Email](mailto:adrian@maestrolabs.com) 