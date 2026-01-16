#!/usr/bin/env python3
"""
PDF Reader - Local Server Startup Script
Simple HTTP server to run the PDF reader application
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow local file access
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def main():
    # Change to the script's directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print("=" * 50)
    print("📚 PDF Reader - Local Server")
    print("=" * 50)
    print(f"\n🌐 Server starting at: http://localhost:{PORT}")
    print("📁 Serving files from:", os.getcwd())
    print("\n💡 The browser will open automatically...")
    print("⏹️  Press Ctrl+C to stop the server\n")
    
    try:
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            # Open browser automatically
            url = f"http://localhost:{PORT}"
            print(f"🚀 Opening {url} in your browser...\n")
            webbrowser.open(url)
            
            print("✅ Server is running!")
            print("=" * 50)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n⏹️  Server stopped by user")
        sys.exit(0)
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"\n❌ Port {PORT} is already in use!")
            print(f"💡 Try using a different port or close the application using port {PORT}")
        else:
            print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
