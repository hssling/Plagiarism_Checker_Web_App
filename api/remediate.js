import { paraphraseBackend } from './_lib/ai.js';
import { validateRequest } from './_lib/auth.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { text, context, style = 'formal' } = req.body;
        const aiKey = req.headers['x-ai-key'];

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        if (!aiKey) {
            return res.status(401).json({ error: 'AI Key required' });
        }

        const result = await paraphraseBackend(text, context, style, aiKey);

        return res.status(200).json(result);
    } catch (error) {
        console.error('Remediation API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
