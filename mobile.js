// Mobile and touch optimizations for PDF Reader
class MobileOptimizer {
    constructor() {
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.pinchDistance = 0;
        this.lastTap = 0;
        
        this.init();
    }

    init() {
        if (this.isMobile || this.isTouchDevice) {
            this.addTouchGestures();
            this.optimizeForMobile();
            this.addMobileUI();
            this.handleOrientationChange();
        }
    }

    // Touch gesture handling
    addTouchGestures() {
        const viewer = document.getElementById('viewerContainer') || document.body;
        
        // Touch events for swipe navigation
        viewer.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        viewer.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: true });
        viewer.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
        
        // Double tap for zoom
        viewer.addEventListener('touchend', (e) => this.handleDoubleTap(e), { passive: true });
        
        // Pinch to zoom
        viewer.addEventListener('touchstart', (e) => this.handlePinchStart(e), { passive: true });
        viewer.addEventListener('touchmove', (e) => this.handlePinchMove(e), { passive: true });
    }

    handleTouchStart(e) {
        if (e.touches.length === 1) {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }
    }

    handleTouchMove(e) {
        if (e.touches.length === 1) {
            const touchEndX = e.touches[0].clientX;
            const touchEndY = e.touches[0].clientY;
            const diffX = this.touchStartX - touchEndX;
            const diffY = this.touchStartY - touchEndY;
            
            // Prevent default only for horizontal swipes
            if (Math.abs(diffX) > Math.abs(diffY)) {
                e.preventDefault();
            }
        }
    }

    handleTouchEnd(e) {
        if (e.touches.length === 0 && e.changedTouches.length === 1) {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const diffX = this.touchStartX - touchEndX;
            const diffY = this.touchStartY - touchEndY;
            
            // Swipe detection
            if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 0) {
                    this.swipeLeft(); // Swipe left - next page
                } else {
                    this.swipeRight(); // Swipe right - previous page
                }
            }
        }
    }

    handleDoubleTap(e) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - this.lastTap;
        
        if (tapLength < 500 && tapLength > 0) {
            e.preventDefault();
            this.toggleZoom();
        }
        
        this.lastTap = currentTime;
    }

    handlePinchStart(e) {
        if (e.touches.length === 2) {
            this.pinchDistance = this.getDistance(e.touches[0], e.touches[1]);
        }
    }

    handlePinchMove(e) {
        if (e.touches.length === 2) {
            const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
            const scale = currentDistance / this.pinchDistance;
            
            if (typeof window.zoomPage === 'function') {
                window.zoomPage(scale);
            }
            
            this.pinchDistance = currentDistance;
        }
    }

    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    swipeLeft() {
        // Next page
        const nextBtn = document.getElementById('nextPage');
        if (nextBtn && !nextBtn.disabled) {
            nextBtn.click();
        }
    }

    swipeRight() {
        // Previous page
        const prevBtn = document.getElementById('prevPage');
        if (prevBtn && !prevBtn.disabled) {
            prevBtn.click();
        }
    }

    toggleZoom() {
        // Toggle between fit width and 100%
        const fitWidthBtn = document.getElementById('fitWidth');
        const zoomInBtn = document.getElementById('zoomIn');
        
        if (fitWidthBtn) {
            fitWidthBtn.click();
        }
    }

    // Mobile UI optimizations
    optimizeForMobile() {
        // Add mobile class to body
        document.body.classList.add('mobile');
        
        // Adjust viewport for mobile
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=10.0, user-scalable=yes');
        }
        
        // Optimize toolbar for mobile
        this.optimizeToolbar();
        
        // Add mobile-specific styles
        this.addMobileStyles();
    }

    optimizeToolbar() {
        const toolbar = document.getElementById('toolbar');
        if (toolbar) {
            toolbar.classList.add('mobile-toolbar');
            
            // Add mobile menu button
            const menuBtn = document.createElement('button');
            menuBtn.className = 'mobile-menu-btn';
            menuBtn.innerHTML = '☰';
            menuBtn.onclick = () => this.toggleMobileMenu();
            
            toolbar.insertBefore(menuBtn, toolbar.firstChild);
        }
    }

    addMobileStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .mobile .toolbar {
                flex-wrap: wrap;
                padding: 8px;
                gap: 4px;
            }
            
            .mobile .toolbar-section {
                flex: 1;
                min-width: 150px;
                justify-content: center;
            }
            
            .mobile .toolbar-btn {
                padding: 8px 12px;
                font-size: 14px;
                min-width: 44px;
                min-height: 44px;
            }
            
            .mobile-menu-btn {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 1000;
                background: var(--primary-color, #2563eb);
                color: white;
                border: none;
                border-radius: 8px;
                padding: 10px;
                font-size: 18px;
                cursor: pointer;
            }
            
            .mobile .viewer-container {
                padding: 10px;
            }
            
            .mobile .page-info {
                font-size: 14px;
            }
            
            .mobile .zoom-level {
                font-size: 12px;
            }
            
            @media (max-width: 768px) {
                .mobile .header-content {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .mobile .app-title {
                    font-size: 18px;
                }
                
                .mobile .btn {
                    padding: 8px 16px;
                    font-size: 14px;
                }
            }
            
            @media (max-width: 480px) {
                .mobile .toolbar-section {
                    min-width: 100px;
                }
                
                .mobile .toolbar-btn {
                    padding: 6px 8px;
                    font-size: 12px;
                }
            }
            
            /* Touch-friendly file input */
            .mobile #fileInput {
                font-size: 16px; /* Prevent zoom on iOS */
            }
            
            /* Hide hover effects on touch devices */
            @media (hover: none) {
                .toolbar-btn:hover {
                    background: initial;
                }
            }
        `;
        document.head.appendChild(style);
    }

    addMobileUI() {
        // Add mobile-specific UI elements
        this.addMobileControls();
        this.addGestureIndicators();
        this.addMobileNotifications();
    }

    addMobileControls() {
        const viewer = document.getElementById('viewerContainer');
        if (!viewer) return;
        
        // Add mobile control overlay
        const controls = document.createElement('div');
        controls.className = 'mobile-controls';
        controls.innerHTML = `
            <button class="mobile-control mobile-prev" onclick="document.getElementById('prevPage').click()">
                ◀
            </button>
            <button class="mobile-control mobile-next" onclick="document.getElementById('nextPage').click()">
                ▶
            </button>
            <button class="mobile-control mobile-zoom-in" onclick="document.getElementById('zoomIn').click()">
                +
            </button>
            <button class="mobile-control mobile-zoom-out" onclick="document.getElementById('zoomOut').click()">
                −
            </button>
        `;
        
        const controlsStyle = document.createElement('style');
        controlsStyle.textContent = `
            .mobile-controls {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 10px;
                z-index: 1000;
                background: rgba(0, 0, 0, 0.7);
                padding: 10px;
                border-radius: 25px;
                backdrop-filter: blur(10px);
            }
            
            .mobile-control {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                border: none;
                background: white;
                color: var(--primary-color, #2563eb);
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .mobile-control:active {
                transform: scale(0.9);
            }
            
            @media (max-width: 480px) {
                .mobile-controls {
                    bottom: 10px;
                    gap: 5px;
                    padding: 8px;
                }
                
                .mobile-control {
                    width: 40px;
                    height: 40px;
                    font-size: 14px;
                }
            }
        `;
        
        document.head.appendChild(controlsStyle);
        viewer.appendChild(controls);
    }

    addGestureIndicators() {
        // Add visual feedback for gestures
        const indicator = document.createElement('div');
        indicator.className = 'gesture-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            font-size: 18px;
            z-index: 2000;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(indicator);
        
        this.gestureIndicator = indicator;
    }

    showGestureIndicator(text) {
        if (this.gestureIndicator) {
            this.gestureIndicator.textContent = text;
            this.gestureIndicator.style.opacity = '1';
            
            setTimeout(() => {
                this.gestureIndicator.style.opacity = '0';
            }, 1000);
        }
    }

    addMobileNotifications() {
        // Add mobile-friendly notification system
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    toggleMobileMenu() {
        const toolbar = document.getElementById('toolbar');
        if (toolbar) {
            toolbar.classList.toggle('mobile-menu-open');
        }
    }

    handleOrientationChange() {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                // Adjust layout after orientation change
                if (typeof window.fitToWidth === 'function') {
                    window.fitToWidth();
                }
            }, 100);
        });
    }

    // Mobile-specific features
    enableMobileFeatures() {
        // Enable file sharing from other apps
        this.enableFileSharing();
        
        // Enable offline storage
        this.enableOfflineStorage();
        
        // Enable mobile printing
        this.enableMobilePrinting();
    }

    enableFileSharing() {
        // Handle share target for PWA
        if ('launchQueue' in window) {
            launchQueue.setConsumer((launchParams) => {
                if (launchParams.files && launchParams.files.length > 0) {
                    const file = launchParams.files[0];
                    this.handleSharedFile(file);
                }
            });
        }
    }

    handleSharedFile(file) {
        // Handle files shared from other apps
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
            
            // Trigger file change event
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        }
    }

    enableOfflineStorage() {
        // Store recent files for offline access
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            navigator.storage.estimate().then((estimate) => {
                console.log('Storage available:', estimate);
            });
        }
    }

    enableMobilePrinting() {
        // Add mobile print functionality
        if ('print' in window) {
            const printBtn = document.createElement('button');
            printBtn.className = 'mobile-print-btn';
            printBtn.innerHTML = '🖨️';
            printBtn.onclick = () => window.print();
            printBtn.title = 'Print document';
            
            const toolbar = document.querySelector('.toolbar-section');
            if (toolbar) {
                toolbar.appendChild(printBtn);
            }
        }
    }
}

// Initialize mobile optimizations
let mobileOptimizer;
document.addEventListener('DOMContentLoaded', () => {
    mobileOptimizer = new MobileOptimizer();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileOptimizer;
}
