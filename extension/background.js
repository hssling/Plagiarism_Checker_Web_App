/**
 * PlagiarismGuard - Background Service Worker
 * Handles context menu, API communication, and message passing
 */

// API endpoint auto-detection
const API_ENDPOINTS = [
    'http://localhost:3000',
    'https://plagiarism-checker-web-app.vercel.app'
];

let activeEndpoint = null;

// Test which endpoint is available
async function detectActiveEndpoint() {
    for (const endpoint of API_ENDPOINTS) {
        try {
            const response = await fetch(`${endpoint}/`, { method: 'HEAD', mode: 'no-cors' });
            activeEndpoint = endpoint;
            console.log(`[PlagiarismGuard] Active endpoint: ${endpoint}`);
            return endpoint;
        } catch (error) {
            console.log(`[PlagiarismGuard] ${endpoint} not available`);
        }
    }

    // Default to production if nothing works
    activeEndpoint = API_ENDPOINTS[1];
    return activeEndpoint;
}

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
    console.log('[PlagiarismGuard] Extension installed');

    // Detect active endpoint
    await detectActiveEndpoint();

    // Create context menu
    chrome.contextMenus.create({
        id: 'checkPlagiarism',
        title: 'Check for Plagiarism with PlagiarismGuard',
        contexts: ['selection']
    });

    // Store initial settings
    chrome.storage.local.set({
        apiEndpoint: activeEndpoint,
        highlightColor: '#fef08a',
        autoHighlight: true,
        recentChecks: []
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'checkPlagiarism' && info.selectionText) {
        const selectedText = info.selectionText.trim();

        if (selectedText.length < 50) {
            chrome.tabs.sendMessage(tab.id, {
                action: 'showError',
                message: 'Please select at least 50 characters for analysis.'
            });
            return;
        }

        // Send to content script
        chrome.tabs.sendMessage(tab.id, {
            action: 'analyzePlagiarism',
            text: selectedText
        });
    }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getApiEndpoint') {
        sendResponse({ endpoint: activeEndpoint });
        return true;
    }

    if (request.action === 'saveCheck') {
        // Save to recent checks
        chrome.storage.local.get(['recentChecks'], (result) => {
            const checks = result.recentChecks || [];
            checks.unshift({
                text: request.text.substring(0, 100) + '...',
                score: request.score,
                timestamp: Date.now(),
                url: sender.tab?.url || 'unknown'
            });

            // Keep only last 10 checks
            chrome.storage.local.set({
                recentChecks: checks.slice(0, 10)
            });
        });

        sendResponse({ success: true });
        return true;
    }

    if (request.action === 'openFullReport') {
        // Open main app with results
        chrome.tabs.create({
            url: `${activeEndpoint}?text=${encodeURIComponent(request.text)}`
        });
        sendResponse({ success: true });
        return true;
    }
});

// Re-detect endpoint periodically (every 5 minutes)
setInterval(detectActiveEndpoint, 5 * 60 * 1000);

console.log('[PlagiarismGuard] Background service worker loaded');
