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
    <div class="pg-popup-header" style="background: linear-gradient(135deg, #1e293b, #0f172a); border-bottom: 1px solid rgba(255,255,255,0.1); padding: 12px 16px;">
      <span class="pg-logo" style="font-weight: 800; background: linear-gradient(135deg, #4facfe, #00f2fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🛡️ PlagiarismGuard Pro</span>
      <button class="pg-close" id="pg-close-btn" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 20px;">×</button>
    </div>
    <div class="pg-popup-body" style="padding: 20px; background: #0f172a; color: white;">
      <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
        <div class="pg-score ${statusClass}" style="width: 80px; height: 80px; border-radius: 50%; border: 4px solid var(--score-color, #4facfe); display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.05);">
          <div class="pg-score-value" style="font-size: 18px; font-weight: 800;">${score}%</div>
          <div class="pg-score-label" style="font-size: 8px; opacity: 0.7;">Similarity</div>
        </div>
        <div>
          <div class="pg-status ${statusClass}" style="font-size: 16px; font-weight: 700; margin-bottom: 4px; color: var(--score-color, #4facfe);">${statusLabel}</div>
          <div style="font-size: 11px; color: #94a3b8;">Academic-grade verification complete</div>
        </div>
      </div>
      
      <div class="pg-stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
        <div class="pg-stat" style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase;">Sources</div>
          <div style="font-size: 14px; font-weight: 700;">${results.sources.length}</div>
        </div>
        <div class="pg-stat" style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
          <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase;">Words</div>
          <div style="font-size: 14px; font-weight: 700;">${results.wordCount}</div>
        </div>
      </div>

      ${results.sources.length > 0 ? `
        <div class="pg-sources" style="margin-bottom: 20px;">
          <div style="font-size: 10px; font-weight: 700; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase;">Top Source Matches</div>
          ${results.sources.slice(0, 2).map(s => `
            <div class="pg-source" style="padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #2563eb;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <div style="font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${s.name}</div>
                <div style="font-size: 11px; font-weight: 700; color: #34d399;">${s.similarity.toFixed(1)}%</div>
              </div>
              <button class="pg-remediate-btn" data-text="${escapeHtml(s.text || results.keyPhrases?.find(p => p.found)?.text || "")}" data-source="${escapeHtml(s.name)}" style="width: 100%; padding: 4px; font-size: 9px; background: rgba(37, 99, 235, 0.1); border: 1px solid rgba(37, 99, 235, 0.3); color: #60a5fa; border-radius: 4px; cursor: pointer;">✨ Remediate (AI Fix)</button>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
    <div class="pg-popup-footer" style="padding: 16px; background: #0f172a; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 12px;">
      <button class="pg-btn pg-btn-secondary" id="pg-clear-highlights" style="flex: 1; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; cursor: pointer; font-size: 11px;">Clear</button>
      <button class="pg-btn pg-btn-primary" id="pg-full-report" style="flex: 2; padding: 10px; border-radius: 8px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border: none; color: white; font-weight: 700; cursor: pointer; font-size: 11px;">Open Full Report</button>
    </div>
    <style>
      .pg-popup-body .good { --score-color: #34d399; }
      .pg-popup-body .moderate { --score-color: #fbbf24; }
      .pg-popup-body .high { --score-color: #f87171; }
      .plagiarism-guard-popup { font-family: 'Inter', sans-serif; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); overflow: hidden; width: 300px; }
    </style>
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

    // Remediate buttons
    popup.querySelectorAll('.pg-remediate-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.getAttribute('data-text');
            const source = btn.getAttribute('data-source');
            handleRemediation(text, source);
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Handle Remediation (Paraphrasing)
 */
async function handleRemediation(text, source) {
    try {
        showNotification('Integrity AI is rewriting...', 'loading');

        const { endpoint } = await chrome.runtime.sendMessage({ action: 'getApiEndpoint' });
        // Extension needs to get AI key from storage
        const { gemini_api_key } = await chrome.storage.local.get(['gemini_api_key']);

        if (!gemini_api_key) {
            showNotification('Please add Gemini API Key in Extension Settings to use Remediation.', 'error');
            return;
        }

        const response = await fetch(`${endpoint}/api/remediate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-ai-key': gemini_api_key
            },
            body: JSON.stringify({ text, context: source, style: 'formal' })
        });

        if (!response.ok) throw new Error('Remediation failed');

        const result = await response.json();
        showRemediationOverlay(text, result.paraphrased, source, result.integrityScore);

    } catch (e) {
        showNotification(`Remediation failed: ${e.message}`, 'error');
    }
}

/**
 * Side-by-side Remediation UI
 */
function showRemediationOverlay(original, fixed, source, score) {
    const overlay = document.createElement('div');
    overlay.className = 'pg-remediation-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
        z-index: 2147483647; display: flex; align-items: center; justify-content: center;
        font-family: 'Inter', sans-serif;
    `;

    overlay.innerHTML = `
        <div style="background: #0f172a; width: 80%; max-width: 900px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
            <div style="padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; color: white;">🛡️ Remediation Pro <span style="font-size: 10px; background: #2563eb; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">INTEGRITY AI</span></h3>
                <button id="pg-rem-close" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 24px;">×</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 24px; max-height: 400px; overflow-y: auto;">
                <div>
                    <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">Original Fragment</div>
                    <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); font-size: 13px; line-height: 1.6;">${original}</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 8px;">Source: ${source}</div>
                </div>
                <div>
                    <div style="font-size: 10px; color: #34d399; text-transform: uppercase; margin-bottom: 8px;">AI Improved Fix</div>
                    <div style="background: rgba(52, 211, 153, 0.05); padding: 12px; border-radius: 8px; color: #34d399; border: 1px solid rgba(52, 211, 153, 0.2); font-size: 13px; line-height: 1.6;">${fixed}</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 8px;">Integrity Score: ${score || 100}%</div>
                </div>
            </div>

            <div style="padding: 16px 24px; background: rgba(0,0,0,0.2); display: flex; justify-content: flex-end; gap: 12px;">
                <button id="pg-rem-copy" style="padding: 8px 16px; border-radius: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; cursor: pointer; font-size: 12px;">Copy Fix</button>
                <button id="pg-rem-done" style="padding: 8px 16px; border-radius: 6px; background: #2563eb; border: none; color: white; cursor: pointer; font-size: 12px; font-weight: 600;">Done</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('pg-rem-close').onclick = () => overlay.remove();
    document.getElementById('pg-rem-done').onclick = () => overlay.remove();
    document.getElementById('pg-rem-copy').onclick = () => {
        navigator.clipboard.writeText(fixed);
        showNotification('Copied to clipboard!', 'success');
    };
}

console.log('[PlagiarismGuard] Content script loaded');
