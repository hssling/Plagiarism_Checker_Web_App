/**
 * Rate Limiting Module
 * In-memory rate limiter for Vercel serverless functions
 */

// Rate limits by tier (requests per hour)
const RATE_LIMITS = {
    free: { requests: 10, window: 3600000 },   // 10 per hour
    basic: { requests: 100, window: 3600000 }, // 100 per hour
    pro: { requests: 1000, window: 3600000 }   // 1000 per hour
};

// In-memory store (resets on cold start - use Redis for production)
const requestStore = new Map();

/**
 * Clean up expired entries
 */
function cleanup() {
    const now = Date.now();
    for (const [key, data] of requestStore.entries()) {
        if (now - data.windowStart > RATE_LIMITS[data.tier]?.window || 3600000) {
            requestStore.delete(key);
        }
    }
}

/**
 * Check if request is within rate limit
 * @param {string} identifier - API key or IP address
 * @param {string} tier - User tier (free, basic, pro)
 * @returns {object} - { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(identifier, tier = 'free') {
    cleanup();

    const limit = RATE_LIMITS[tier] || RATE_LIMITS.free;
    const now = Date.now();
    const key = `${tier}:${identifier}`;

    let record = requestStore.get(key);

    // Initialize or reset window
    if (!record || (now - record.windowStart) > limit.window) {
        record = {
            tier,
            count: 0,
            windowStart: now
        };
    }

    // Check limit
    if (record.count >= limit.requests) {
        const resetAt = record.windowStart + limit.window;
        return {
            allowed: false,
            remaining: 0,
            resetAt,
            retryAfter: Math.ceil((resetAt - now) / 1000)
        };
    }

    // Increment counter
    record.count++;
    requestStore.set(key, record);

    return {
        allowed: true,
        remaining: limit.requests - record.count,
        resetAt: record.windowStart + limit.window
    };
}

/**
 * Get rate limit headers for response
 * @param {object} rateLimitResult - Result from checkRateLimit
 * @param {string} tier - User tier
 * @returns {object} - Headers to add to response
 */
export function getRateLimitHeaders(rateLimitResult, tier = 'free') {
    const limit = RATE_LIMITS[tier] || RATE_LIMITS.free;

    return {
        'X-RateLimit-Limit': limit.requests.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': Math.floor(rateLimitResult.resetAt / 1000).toString()
    };
}

/**
 * Format rate limit error response
 * @param {object} rateLimitResult - Result from checkRateLimit
 * @returns {object} - Error response body
 */
export function rateLimitErrorResponse(rateLimitResult) {
    return {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
            retryAfter: rateLimitResult.retryAfter
        }
    };
}
