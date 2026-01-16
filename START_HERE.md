# 🚀 Quick Start Guide

## Option 1: Double-Click to Run (Easiest)

### On Mac:
1. Double-click `start-server.py`
2. Your browser will open automatically at `http://localhost:8000`
3. Click "Open File" and select a PDF or text file

### On Windows:
1. Right-click `start-server.py` → Open with → Python
2. Your browser will open automatically

### On Linux:
1. Make it executable: `chmod +x start-server.py`
2. Run: `./start-server.py`

---

## Option 2: Command Line

### Using Python (Recommended):
```bash
python3 start-server.py
```

Or simply:
```bash
python3 -m http.server 8000
```
Then open: http://localhost:8000

### Using Shell Script (Mac/Linux):
```bash
chmod +x start-server.sh
./start-server.sh
```

---

## Option 3: Direct File Opening

**Note:** Some browsers may have security restrictions when opening files directly.

1. Right-click `index.html`
2. Select "Open with" → Your preferred browser
3. Click "Open File" to select a PDF

---

## Troubleshooting

### Port Already in Use?
If port 8000 is busy, edit `start-server.py` and change `PORT = 8000` to `PORT = 8080` (or any other port)

### Python Not Found?
- **Mac**: Python should be pre-installed. If not, install from python.org
- **Windows**: Download from python.org
- **Linux**: `sudo apt-get install python3` (Ubuntu/Debian)

### Browser Not Opening?
Manually open: http://localhost:8000

### PDF.js Not Loading?
Make sure you have an internet connection for the first load (PDF.js loads from CDN)

---

## Need Help?

Check the main `README.md` for more details and features!
