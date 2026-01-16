/**
 * GET /api/health
 * Health check endpoint - no auth required
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

export default async function handler(req) {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
        status: 'healthy',
        version: '2.1.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            analyze: 'POST /api/analyze',
            health: 'GET /api/health'
        }
    }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

export const config = {
    runtime: 'edge'
};
