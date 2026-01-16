#!/bin/bash

# PDF Reader - Local Server Startup Script

echo "🚀 Starting PDF Reader Server..."
echo ""
echo "Server will be available at: http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
# Check if Python 2 is available
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer 8000
else
    echo "❌ Python not found. Please install Python or use Node.js http-server"
    echo ""
    echo "Alternative: Install http-server with: npm install -g http-server"
    echo "Then run: http-server"
    exit 1
fi
