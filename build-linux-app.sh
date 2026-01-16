#!/bin/bash

# Linux Desktop App Builder Script
# Creates native Linux packages for PDF Reader

set -e

echo "🐧 Building PDF Reader for Linux..."

# Check if required tools are installed
check_dependencies() {
    echo "🔍 Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    if ! command -v electron &> /dev/null && ! npm list -g electron &> /dev/null; then
        missing_deps+=("electron")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo "❌ Missing dependencies: ${missing_deps[*]}"
        echo "Please install missing dependencies:"
        echo "  npm: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm"
        echo "  Then run: npm install"
        exit 1
    fi
    
    echo "✅ All dependencies found"
}

# Install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."
    npm install
}

# Create desktop entry
create_desktop_entry() {
    echo "📄 Creating desktop entry..."
    
    mkdir -p assets
    cat > assets/pdf-reader.desktop << EOF
[Desktop Entry]
Name=PDF Reader
Comment=A modern PDF reader with annotations and productivity features
Exec=pdf-reader %U
Icon=pdf-reader
Type=Application
Categories=Office;Viewer;Productivity;
MimeType=application/pdf;application/epub+zip;text/plain;application/msword;application/vnd.openxmlformats-officedocument.wordprocessingml.document;
StartupNotify=true
StartupWMClass=pdf-reader
Keywords=PDF;Reader;Document;Viewer;Annotations;EPUB;Text;
EOF
}

# Create AppImage
build_appimage() {
    echo "📦 Building AppImage..."
    
    npm run build
    
    if [ -f "dist/PDF Reader.AppImage" ]; then
        echo "✅ AppImage created: dist/PDF Reader.AppImage"
        mv "dist/PDF Reader.AppImage" "dist/pdf-reader.AppImage"
    else
        echo "⚠️  AppImage not found, trying alternative build..."
        npx electron-builder --linux AppImage
    fi
}

# Create .deb package
build_deb() {
    echo "📦 Building .deb package..."
    
    npx electron-builder --linux deb
    
    if [ -f "dist/pdf-reader_*.deb" ]; then
        echo "✅ .deb package created"
        ls -la dist/*.deb
    else
        echo "❌ .deb package creation failed"
    fi
}

# Create .rpm package
build_rpm() {
    echo "📦 Building .rpm package..."
    
    npx electron-builder --linux rpm
    
    if [ -f "dist/pdf-reader-*.rpm" ]; then
        echo "✅ .rpm package created"
        ls -la dist/*.rpm
    else
        echo "❌ .rpm package creation failed"
    fi
}

# Create .tar.gz package
build_tarball() {
    echo "📦 Building .tar.gz package..."
    
    npx electron-builder --linux tar.gz
    
    if [ -f "dist/pdf-reader-*.tar.gz" ]; then
        echo "✅ .tar.gz package created"
        ls -la dist/*.tar.gz
    else
        echo "❌ .tar.gz package creation failed"
    fi
}

# Create portable version
build_portable() {
    echo "📦 Building portable version..."
    
    npx electron-builder --linux dir
    
    if [ -d "dist/linux-unpacked" ]; then
        echo "✅ Portable version created: dist/linux-unpacked/"
        
        # Create launch script
        cat > dist/linux-unpacked/pdf-reader.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
exec ./pdf-reader "$@"
EOF
        chmod +x dist/linux-unpacked/pdf-reader.sh
        
        # Create archive
        cd dist
        tar -czf pdf-reader-portable.tar.gz linux-unpacked/
        cd ..
        
        echo "✅ Portable archive created: dist/pdf-reader-portable.tar.gz"
    else
        echo "❌ Portable version creation failed"
    fi
}

# Install system-wide
install_system() {
    echo "🔧 Installing system-wide..."
    
    if [ "$EUID" -ne 0 ]; then
        echo "❌ This requires root privileges. Please run with sudo."
        exit 1
    fi
    
    # Check if dist directory exists
    if [ ! -d "dist/linux-unpacked" ]; then
        echo "❌ Portable version not found. Building first..."
        build_portable
    fi
    
    # Install to /opt
    mkdir -p /opt/pdf-reader
    cp -r dist/linux-unpacked/* /opt/pdf-reader/
    
    # Create symlink
    ln -sf /opt/pdf-reader/pdf-reader /usr/local/bin/pdf-reader
    
    # Install desktop entry
    cp assets/pdf-reader.desktop /usr/share/applications/
    
    # Install icon (create a simple one if not exists)
    if [ ! -f "assets/icon-256.png" ]; then
        echo "🎨 Creating default icon..."
        # This would need ImageMagick or similar
        echo "⚠️  Please add assets/icon-256.png for proper icon installation"
    fi
    
    if [ -f "assets/icon-256.png" ]; then
        cp assets/icon-256.png /usr/share/icons/hicolor/256x256/apps/pdf-reader.png
    fi
    
    # Update desktop database
    update-desktop-database /usr/share/applications/
    
    echo "✅ PDF Reader installed system-wide"
    echo "   Launch with: pdf-reader"
    echo "   Or find in applications menu"
}

# Uninstall system-wide
uninstall_system() {
    echo "🗑️  Uninstalling system-wide..."
    
    if [ "$EUID" -ne 0 ]; then
        echo "❌ This requires root privileges. Please run with sudo."
        exit 1
    fi
    
    # Remove files
    rm -rf /opt/pdf-reader
    rm -f /usr/local/bin/pdf-reader
    rm -f /usr/share/applications/pdf-reader.desktop
    rm -f /usr/share/icons/hicolor/256x256/apps/pdf-reader.png
    
    # Update desktop database
    update-desktop-database /usr/share/applications/
    
    echo "✅ PDF Reader uninstalled"
}

# Main menu
show_menu() {
    echo ""
    echo "🐧 PDF Reader Linux Builder"
    echo "=========================="
    echo "1) Build AppImage (Portable)"
    echo "2) Build .deb (Debian/Ubuntu)"
    echo "3) Build .rpm (RedHat/Fedora)"
    echo "4) Build .tar.gz (Universal)"
    echo "5) Build Portable Version"
    echo "6) Install System-wide"
    echo "7) Uninstall System-wide"
    echo "8) Build All Formats"
    echo "9) Exit"
    echo ""
}

# Build all formats
build_all() {
    echo "🚀 Building all Linux formats..."
    
    build_appimage
    build_deb
    build_rpm
    build_tarball
    build_portable
    
    echo ""
    echo "✅ All builds completed!"
    echo "📁 Check the 'dist' directory for all packages"
    ls -la dist/
}

# Main execution
main() {
    cd "$(dirname "$0")"
    
    check_dependencies
    install_dependencies
    create_desktop_entry
    
    while true; do
        show_menu
        read -p "Choose an option (1-9): " choice
        
        case $choice in
            1) build_appimage ;;
            2) build_deb ;;
            3) build_rpm ;;
            4) build_tarball ;;
            5) build_portable ;;
            6) install_system ;;
            7) uninstall_system ;;
            8) build_all ;;
            9) echo "👋 Goodbye!"; exit 0 ;;
            *) echo "❌ Invalid option. Please choose 1-9." ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
