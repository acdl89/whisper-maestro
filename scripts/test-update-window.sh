#!/bin/bash

# Test script for WhisperMaestro Update Window
# This script helps test the new native update window

echo "🧪 WhisperMaestro Update Window Test"
echo "====================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the WhisperMaestro root directory"
    exit 1
fi

echo "📋 Current version: $(node -p "require('./package.json').version")"

echo ""
echo "🔧 Testing Options:"
echo "1. Open update window directly in browser"
echo "2. Build and test update window"
echo "3. Simulate update check"
echo "4. Test checking animation"
echo "5. Exit"

read -p "Choose an option (1-5): " choice

case $choice in
    1)
        echo "🌐 Opening update window in browser..."
        if command -v open &> /dev/null; then
            open renderer/update.html
        else
            echo "Please open renderer/update.html in your browser"
        fi
        ;;
    2)
        echo "🔨 Building project..."
        npm run build
        if [ $? -eq 0 ]; then
            echo "✅ Build successful"
            echo "🚀 Starting app for testing..."
            npm start
        else
            echo "❌ Build failed"
        fi
        ;;
    3)
        echo "🔄 Simulating update check..."
        echo "To test the full update flow:"
        echo "1. Temporarily change version in package.json"
        echo "2. Build and run the app"
        echo "3. Use tray menu 'Check for Updates'"
        echo "4. Restore original version"
        ;;
    4)
        echo "🔄 Testing checking animation..."
        echo "1. Open renderer/update.html in your browser"
        echo "2. Click the 'Test Check' button"
        echo "3. Watch the checking animation for 3 seconds"
        echo "4. See the 'You're up to date!' message"
        ;;
    5)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac 