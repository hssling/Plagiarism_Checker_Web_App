/**
 * PlagiarismGuard - Popup Script
 * Handles popup UI, recent checks, and settings
 */

// Load recent checks on popup open
document.addEventListener('DOMContentLoaded', async () => {
    // Load settings
    const settings = await chrome.storage.local.get(['autoHighlight', 'highlightColor', 'recentChecks', 'apiEndpoint']);

    // Set checkbox state
    document.getElementById('auto-highlight').checked = settings.autoHighlight !== false;

    // Set color picker
    if (settings.highlightColor) {
        document.getElementById('highlight-color').value = settings.highlightColor;
    }

    // Display recent checks
    displayRecentChecks(settings.recentChecks || []);

    // Event listeners
    document.getElementById('auto-highlight').addEventListener('change', (e) => {
        chrome.storage.local.set({ autoHighlight: e.target.checked });
    });

    document.getElementById('highlight-color').addEventListener('change', (e) => {
        chrome.storage.local.set({ highlightColor: e.target.value });
    });

    document.getElementById('open-app').addEventListener('click', () => {
        const endpoint = settings.apiEndpoint || 'https://plagiarism-checker-web-app.vercel.app';
        chrome.tabs.create({ url: endpoint });
    });
});

/**
 * Display recent checks
 */
function displayRecentChecks(checks) {
    const checksList = document.getElementById('checks-list');

    if (!checks || checks.length === 0) {
        checksList.innerHTML = '<div class="empty-state">No recent checks</div>';
        return;
    }

    checksList.innerHTML = checks.map(check => {
        const date = new Date(check.timestamp);
        const scoreClass = check.score < 15 ? 'good' : check.score < 30 ? 'moderate' : 'high';

        return `
      <div class="check-item">
        <div class="check-text">${check.text}</div>
        <div class="check-meta">
          <span class="check-score ${scoreClass}">${check.score.toFixed(1)}%</span>
          <span class="check-time">${formatTime(date)}</span>
        </div>
      </div>
    `;
    }).join('');
}

/**
 * Format timestamp
 */
function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}
