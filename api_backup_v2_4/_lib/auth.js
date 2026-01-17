/**
 * API Authentication Module
 * Validates API keys and returns user tier
 */

// Valid API key prefixes
const VALID_PREFIXES = ['pg_live_', 'pg_test_'];

// Demo keys for testing (in production, these would be in a database)
const DEMO_KEYS = {
    'pg_test_demo123456789012345678': { tier: 'free', name: 'Demo User' },
    'pg_live_enterprise1234567890ab': { tier: 'pro', name: 'Enterprise' }
};

/**
 * Validate API key format
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} - Whether the key format is valid
 */
export function isValidKeyFormat(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') return false;
    return VALID_PREFIXES.some(prefix => apiKey.startsWith(prefix)) && apiKey.length >= 28;
}

/**
 * Get user info from API key
 * @param {string} apiKey - The API key
 * @returns {object|null} - User info or null if invalid
 */
export function getUserFromKey(apiKey) {
    if (!isValidKeyFormat(apiKey)) return null;

    // Check demo keys first
    if (DEMO_KEYS[apiKey]) {
        return DEMO_KEYS[apiKey];
    }

    // For MVP: Accept any valid format key as 'free' tier
    // In production: Query database for key validation
    if (apiKey.startsWith('pg_test_')) {
        return { tier: 'free', name: 'Test User' };
    }

    if (apiKey.startsWith('pg_live_')) {
        return { tier: 'basic', name: 'API User' };
    }

    return null;
}

/**
 * Extract API key from request headers
 * @param {object} req - The incoming request (Node.js format)
 * @returns {string|null} - The API key or null
 */
export function extractApiKey(req) {
    // Node.js format: req.headers is a plain object with lowercase keys
    const headers = req.headers || {};

    // Check X-API-Key header first
    const headerKey = headers['x-api-key'];
    if (headerKey) return headerKey;

    // Check Authorization header (Bearer token)
    const authHeader = headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    return null;
}

/**
 * Middleware to validate API key
 * @param {object} req - The incoming request
 * @returns {object} - { valid: boolean, user: object|null, error: string|null }
 */
export function validateRequest(req) {
    const apiKey = extractApiKey(req);

    if (!apiKey) {
        return {
            valid: false,
            user: null,
            error: 'Missing API key. Include X-API-Key header.'
        };
    }

    if (!isValidKeyFormat(apiKey)) {
        return {
            valid: false,
            user: null,
            error: 'Invalid API key format. Keys should start with pg_live_ or pg_test_'
        };
    }

    const user = getUserFromKey(apiKey);
    if (!user) {
        return {
            valid: false,
            user: null,
            error: 'API key not found or revoked.'
        };
    }

    return {
        valid: true,
        user,
        error: null
    };
}

/**
 * Generate a new API key
 * @param {string} type - 'live' or 'test'
 * @returns {string} - New API key
 */
export function generateApiKey(type = 'test') {
    const prefix = type === 'live' ? 'pg_live_' : 'pg_test_';
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let key = prefix;

    for (let i = 0; i < 24; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return key;
}
