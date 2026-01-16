// Version checker and update notifications for web/PWA version
class AppUpdater {
    constructor() {
        this.currentVersion = '1.0.0';
        this.updateUrl = 'https://api.github.com/repos/your-username/pdf-reader/releases/latest';
        this.checkInterval = null;
        this.lastCheck = localStorage.getItem('lastUpdateCheck') || 0;
        this.checkFrequency = 24 * 60 * 60 * 1000; // 24 hours
    }

    // Initialize the updater
    init() {
        // Check for updates on app start
        this.checkForUpdates();
        
        // Set up periodic checks
        this.startPeriodicChecks();
        
        // Add update notification to UI
        this.addUpdateUI();
    }

    // Check for updates
    async checkForUpdates() {
        const now = Date.now();
        
        // Don't check too frequently
        if (now - this.lastCheck < this.checkFrequency) {
            return;
        }

        try {
            const response = await fetch(this.updateUrl);
            if (!response.ok) return;
            
            const release = await response.json();
            const latestVersion = release.tag_name.replace('v', '');
            
            if (this.isNewerVersion(latestVersion, this.currentVersion)) {
                this.showUpdateNotification(latestVersion, release);
            }
            
            this.lastCheck = now;
            localStorage.setItem('lastUpdateCheck', now);
            
        } catch (error) {
            console.log('Update check failed:', error);
        }
    }

    // Compare version strings
    isNewerVersion(latest, current) {
        const latestParts = latest.split('.').map(Number);
        const currentParts = current.split('.').map(Number);
        
        for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
            const latestPart = latestParts[i] || 0;
            const currentPart = currentParts[i] || 0;
            
            if (latestPart > currentPart) return true;
            if (latestPart < currentPart) return false;
        }
        
        return false;
    }

    // Show update notification
    showUpdateNotification(version, release) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-content">
                <div class="update-icon">🔄</div>
                <div class="update-info">
                    <div class="update-title">Update Available</div>
                    <div class="update-version">Version ${version} is now available</div>
                </div>
                <div class="update-actions">
                    <button class="update-btn primary" onclick="window.open('${release.html_url}')">
                        Download
                    </button>
                    <button class="update-btn secondary" onclick="this.closest('.update-notification').remove()">
                        Dismiss
                    </button>
                </div>
            </div>
        `;
        
        // Add styles if not already present
        if (!document.getElementById('update-styles')) {
            const styles = document.createElement('style');
            styles.id = 'update-styles';
            styles.textContent = `
                .update-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    z-index: 10000;
                    max-width: 400px;
                    animation: slideIn 0.3s ease-out;
                    border: 1px solid var(--border, #e2e8f0);
                }
                
                .update-content {
                    display: flex;
                    align-items: center;
                    padding: 16px;
                    gap: 12px;
                }
                
                .update-icon {
                    font-size: 24px;
                    flex-shrink: 0;
                }
                
                .update-info {
                    flex: 1;
                }
                
                .update-title {
                    font-weight: 600;
                    color: var(--text-primary, #1e293b);
                    margin-bottom: 4px;
                }
                
                .update-version {
                    font-size: 14px;
                    color: var(--text-secondary, #64748b);
                }
                
                .update-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    flex-shrink: 0;
                }
                
                .update-btn {
                    padding: 6px 12px;
                    border-radius: 6px;
                    border: none;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    white-space: nowrap;
                }
                
                .update-btn.primary {
                    background: var(--primary-color, #2563eb);
                    color: white;
                }
                
                .update-btn.primary:hover {
                    background: var(--primary-hover, #1d4ed8);
                }
                
                .update-btn.secondary {
                    background: transparent;
                    color: var(--text-secondary, #64748b);
                    border: 1px solid var(--border, #e2e8f0);
                }
                
                .update-btn.secondary:hover {
                    background: var(--background, #f8fafc);
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @media (max-width: 480px) {
                    .update-notification {
                        left: 20px;
                        right: 20px;
                        max-width: none;
                    }
                    
                    .update-content {
                        flex-direction: column;
                        text-align: center;
                    }
                    
                    .update-actions {
                        flex-direction: row;
                        justify-content: center;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-dismiss after 30 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 30000);
    }

    // Add update UI to the app
    addUpdateUI() {
        // Add version info to header
        const headerActions = document.querySelector('.header-actions');
        if (headerActions) {
            const versionInfo = document.createElement('div');
            versionInfo.className = 'version-info';
            versionInfo.innerHTML = `
                <span class="version-text">v${this.currentVersion}</span>
                <button class="check-update-btn" onclick="appUpdater.checkForUpdates()" title="Check for updates">
                    🔄
                </button>
            `;
            
            // Add styles
            if (!document.getElementById('version-styles')) {
                const styles = document.createElement('style');
                styles.id = 'version-styles';
                styles.textContent = `
                    .version-info {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 12px;
                        color: var(--text-secondary, #64748b);
                    }
                    
                    .version-text {
                        font-weight: 500;
                    }
                    
                    .check-update-btn {
                        background: none;
                        border: none;
                        cursor: pointer;
                        font-size: 14px;
                        padding: 4px;
                        border-radius: 4px;
                        transition: background 0.2s;
                    }
                    
                    .check-update-btn:hover {
                        background: var(--background, #f8fafc);
                    }
                `;
                document.head.appendChild(styles);
            }
            
            headerActions.appendChild(versionInfo);
        }
    }

    // Start periodic update checks
    startPeriodicChecks() {
        this.checkInterval = setInterval(() => {
            this.checkForUpdates();
        }, this.checkFrequency);
    }

    // Stop periodic checks
    stopPeriodicChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

// Initialize updater when DOM is ready
let appUpdater;
document.addEventListener('DOMContentLoaded', () => {
    appUpdater = new AppUpdater();
    appUpdater.init();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppUpdater;
}
