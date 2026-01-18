/**
 * PlagiarismGuard - History Service
 * Manages scan history in localStorage for Phase 11 & 13
 */

const HISTORY_KEY = 'plagiarism_guard_history';
const MAX_HISTORY = 50;

/**
 * Save a new scan result to history
 */
export const saveToHistory = (result, text, metadata = {}) => {
    try {
        const history = getHistory();

        const newEntry = {
            id: `scan_${Date.now()}`,
            timestamp: new Date().toISOString(),
            overallScore: result.overallScore,
            wordCount: result.wordCount,
            language: result.language || 'en',
            maxMatch: result.maxMatch,
            sourceCount: result.sources?.length || 0,
            authorship: result.authorship,
            textPreview: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
            metadata
        };

        // Add to front of array
        history.unshift(newEntry);

        // Limit size
        const limitedHistory = history.slice(0, MAX_HISTORY);

        localStorage.setItem(HISTORY_KEY, JSON.stringify(limitedHistory));
        return true;
    } catch (e) {
        console.error("Failed to save history:", e);
        return false;
    }
};

/**
 * Get all history entries
 */
export const getHistory = () => {
    try {
        const data = localStorage.getItem(HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
};

/**
 * Clear all history
 */
export const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
};

/**
 * Delete a specific entry
 */
export const deleteEntry = (id) => {
    const history = getHistory().filter(entry => entry.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};
