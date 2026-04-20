/**
 * Similarity Score Calibration
 * Converts heuristic similarity to calibrated risk probability.
 */

const DEFAULT_CALIBRATION = {
    intercept: -3.1,
    weights: {
        rawScore: 0.065,
        maxMatch: 0.025,
        sourceCount: 0.07,
        evidenceDensity: 0.08,
        semanticLift: 0.03
    }
};

const CALIBRATION_STORAGE_KEY = 'plagiarism_guard_calibration_v1';

function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

export function getCalibrationConfig() {
    if (typeof localStorage === 'undefined') return DEFAULT_CALIBRATION;

    try {
        const raw = localStorage.getItem(CALIBRATION_STORAGE_KEY);
        if (!raw) return DEFAULT_CALIBRATION;
        const parsed = JSON.parse(raw);
        return {
            ...DEFAULT_CALIBRATION,
            ...parsed,
            weights: {
                ...DEFAULT_CALIBRATION.weights,
                ...(parsed.weights || {})
            }
        };
    } catch (error) {
        console.warn('Calibration config read failed, using defaults:', error);
        return DEFAULT_CALIBRATION;
    }
}

export function setCalibrationConfig(config) {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
        console.warn('Calibration config write failed:', error);
    }
}

export function calibrateSimilarityRisk(rawScore, features = {}) {
    const cfg = getCalibrationConfig();
    const f = {
        maxMatch: Number(features.maxMatch || 0),
        sourceCount: Number(features.sourceCount || 0),
        evidenceDensity: Number(features.evidenceDensity || 0),
        semanticLift: Number(features.semanticLift || 0)
    };

    const logit = cfg.intercept
        + (cfg.weights.rawScore * Number(rawScore || 0))
        + (cfg.weights.maxMatch * f.maxMatch)
        + (cfg.weights.sourceCount * Math.min(f.sourceCount, 20))
        + (cfg.weights.evidenceDensity * Math.min(f.evidenceDensity, 20))
        + (cfg.weights.semanticLift * Math.min(f.semanticLift, 100));

    const probability = sigmoid(logit) * 100;
    const calibratedScore = Math.max(0, Math.min(100, probability));
    const riskBand = calibratedScore >= 70 ? 'high' : calibratedScore >= 40 ? 'moderate' : 'low';

    return {
        calibratedScore: Math.round(calibratedScore * 10) / 10,
        riskBand,
        explainability: {
            rawScore,
            features: f,
            model: 'logistic_v1'
        }
    };
}

