/**
 * PlagiarismGuard - Content Script
 * Injected into all pages to handle text selection, analysis, and highlighting
 */

let currentResults = null;
let highlightedElements = [];

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzePlagiarism') {
        handleAnalysis(request.text);
    } else if (request.action === 'showError') {
        showNotification(request.message, 'error');
    }
});

/**
 * Main analysis handler
 */
async function handleAnalysis(text) {
    try {
        // Show loading notification
        showNotification('Analyzing text for plagiarism...', 'loading');

        // Get API endpoint from background
        const { endpoint } = await chrome.runtime.sendMessage({ action: 'getApiEndpoint' });

        // Call plagiarism API
        const response = await fetch(`${endpoint}/api/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const results = await response.json();
        currentResults = results;

        // Save to recent checks
        chrome.runtime.sendMessage({
            action: 'saveCheck',
            text: text,
            score: results.overallScore
        });

        // Highlight matches on page
        const settings = await chrome.storage.local.get(['autoHighlight', 'highlightColor']);
        if (settings.autoHighlight !== false) {
            highlightMatches(results.keyPhrases, settings.highlightColor || '#fef08a');
        }

        // Show results popup
        showResultsPopup(results, text);

    } catch (error) {
        console.error('[PlagiarismGuard] Analysis error:', error);
        showNotification(`Analysis failed: ${error.message}`, 'error');
    }
}

/**
 * Highlight matched phrases on the page
 */
function highlightMatches(keyPhrases, color) {
    // Remove previous highlights
    clearHighlights();

    if (!keyPhrases || keyPhrases.length === 0) return;

    const matchedPhrases = keyPhrases.filter(p => p.found).map(p => p.text);
    if (matchedPhrases.length === 0) return;

    // Walk through text nodes and highlight matches
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const nodesToHighlight = [];
    let node;

    while (node = walker.nextNode()) {
        const text = node.textContent;

        for (const phrase of matchedPhrases) {
            if (text.toLowerCase().includes(phrase.toLowerCase())) {
                nodesToHighlight.push({ node, phrase });
            }
        }
    }

    // Apply highlights
    nodesToHighlight.forEach(({ node, phrase }) => {
        const parent = node.parentNode;
        const text = node.textContent;
        const regex = new RegExp(`(${escapeRegex(phrase)})`, 'gi');
        const parts = text.split(regex);

        const fragment = document.createDocumentFragment();
        parts.forEach((part, i) => {
            if (i % 2 === 1) {
                // This is a matched part
                const span = document.createElement('span');
                span.className = 'plagiarism-guard-highlight';
                span.style.backgroundColor = color;
                span.style.borderBottom = '2px solid #f59e0b';
                span.style.cursor = 'help';
                span.title = 'Potential plagiarism match';
                span.textContent = part;
                fragment.appendChild(span);
                highlightedElements.push(span);
            } else {
                fragment.appendChild(document.createTextNode(part));
            }
        });

        parent.replaceChild(fragment, node);
    });
}

/**
 * Clear all highlights
 */
function clearHighlights() {
    highlightedElements.forEach(el => {
        const parent = el.parentNode;
        if (parent) {
            parent.replaceChild(document.createTextNode(el.textContent), el);
        }
    });
    highlightedElements = [];
}

/**
 * Show results popup near selection
 */
function showResultsPopup(results, originalText) {
    // Remove existing popup
    const existingPopup = document.getElementById('plagiarism-guard-popup');
    if (existingPopup) existingPopup.remove();

    // Create popup
    const popup = document.createElement('div');
    popup.id = 'plagiarism-guard-popup';
    popup.className = 'plagiarism-guard-popup';

    const score = results.overallScore.toFixed(1);
    const statusClass = score < 15 ? 'good' : score < 30 ? 'moderate' : 'high';
    const statusLabel = score < 15 ? 'Low Risk' : score < 30 ? 'Moderate Risk' : 'High Risk';

    popup.innerHTML = `
    <div class="pg-popup-header">
      <span class="pg-logo">🔍 PlagiarismGuard</span>
      <button class="pg-close" id="pg-close-btn">×</button>
    </div>
    <div class="pg-popup-body">
      <div class="pg-score ${statusClass}">
        <div class="pg-score-value">${score}%</div>
        <div class="pg-score-label">Similarity</div>
      </div>
      <div class="pg-status ${statusClass}">${statusLabel}</div>
      <div class="pg-stats">
        <div class="pg-stat">
          <span class="pg-stat-label">Sources Found</span>
          <span class="pg-stat-value">${results.sources.length}</span>
        </div>
        <div class="pg-stat">
          <span class="pg-stat-label">Phrases Checked</span>
          <span class="pg-stat-value">${results.keyPhrases.length}</span>
        </div>
      </div>
      ${results.sources.length > 0 ? `
        <div class="pg-sources">
          <div class="pg-sources-title">Top Matches:</div>
          ${results.sources.slice(0, 3).map(s => `
            <div class="pg-source">
              <div class="pg-source-name">${s.name}</div>
              <div class="pg-source-similarity">${s.similarity.toFixed(1)}%</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
    <div class="pg-popup-footer">
      <button class="pg-btn pg-btn-secondary" id="pg-clear-highlights">Clear Highlights</button>
      <button class="pg-btn pg-btn-primary" id="pg-full-report">Full Report</button>
    </div>
  `;

    document.body.appendChild(popup);

    // Position popup (top-right corner)
    popup.style.position = 'fixed';
    popup.style.top = '20px';
    popup.style.right = '20px';
    popup.style.zIndex = '2147483647';

    // Event listeners
    document.getElementById('pg-close-btn').addEventListener('click', () => {
        popup.remove();
    });

    document.getElementById('pg-clear-highlights').addEventListener('click', () => {
        clearHighlights();
        showNotification('Highlights cleared', 'success');
    });

    document.getElementById('pg-full-report').addEventListener('click', () => {
        chrome.runtime.sendMessage({
            action: 'openFullReport',
            text: originalText
        });
    });

    // Auto-hide after 30 seconds
    setTimeout(() => {
        if (popup.parentNode) {
            popup.style.opacity = '0';
            setTimeout(() => popup.remove(), 300);
        }
    }, 30000);
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `plagiarism-guard-notification pg-notification-${type}`;
    notification.textContent = message;

    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '2147483647';

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, type === 'loading' ? 60000 : 3000);
}

/**
 * Escape regex special characters
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

console.log('[PlagiarismGuard] Content script loaded');
