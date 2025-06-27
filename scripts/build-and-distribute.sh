#!/bin/bash

# WhisperMaestro macOS Build and Distribution Script
# Created by Adrian Cabrera
set -e

echo "🚀 WhisperMaestro macOS Build & Distribution Script"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}Error: This script is designed for macOS only.${NC}"
    exit 1
fi

# Function to print colored output
print_step() {
    echo -e "${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

# Step 1: Clean previous builds
print_step "🧹 Cleaning previous builds..."
rm -rf dist-electron/
rm -rf dist/

# Step 2: Install dependencies
print_step "📦 Installing dependencies..."
npm install

# Step 3: Build TypeScript
print_step "🔨 Building TypeScript..."
npm run build

# Step 4: Build for macOS
print_step "🏗️ Building for macOS..."
npm run dist:mac

# Step 5: Display results
print_step "✅ Build completed successfully!"
echo ""
echo "📦 Distribution files created in: dist-electron/"
echo ""

# List created files
if [ -d "dist-electron" ]; then
    echo "📁 Available files:"
    ls -la dist-electron/ | grep -E '\.(dmg|zip)$' || echo "No distribution files found"
    echo ""
fi

# Step 6: Display next steps
print_step "🎯 Next Steps:"
echo "1. Test the generated DMG installer on your Mac"
echo "2. Update your GitHub repository with the latest code"
echo "3. Create a release tag: git tag v1.0.0 && git push origin v1.0.0"
echo "4. Upload the DMG files to GitHub Releases"
echo "5. Share the download links with your users!"
echo ""

print_warning "⚠️  Remember to:"
echo "- Update author information in package.json"
echo "- Add proper README and documentation"
echo "- Consider code signing for production releases"
echo "- Test on both Intel and Apple Silicon Macs"

echo ""
print_step "🎉 WhisperMaestro is ready for macOS distribution!"

echo ""
echo "📞 Support: adrian@maestrolabs.com"
echo "🌐 GitHub: https://github.com/acdl89/whisper-maestro" 