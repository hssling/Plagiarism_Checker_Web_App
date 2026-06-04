/**
 * Similarity Score Calibration
 * Converts heuristic similarity to calibrated risk probability.
 */

const DEFAULT_CALIBRATION = {
    version: 2,
    intercept: -3.6,
    weights: {
        rawScore: 0.045,
        maxMatch: 0.01,
        sourceCount: 0.02,
        evidenceDensity: 0.025,
        semanticLift: 0.004
    }
};

const CALIBRATION_STORAGE_KEY = 'plagiarism_guard_calibration_v2';

function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

function getStorage() {
    try {
        return globalThis.localStorage || null;
    } catch (error) {
        return null;
    }
}

export function getCalibrationConfig() {
    const storage = getStorage();
    if (!storage) return DEFAULT_CALIBRATION;

    try {
        const raw = storage.getItem(CALIBRATION_STORAGE_KEY);
        if (!raw) return DEFAULT_CALIBRATION;
        const parsed = JSON.parse(raw);
        if (parsed.version !== DEFAULT_CALIBRATION.version) return DEFAULT_CALIBRATION;
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
    const storage = getStorage();
    if (!storage) return;
    try {
        storage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
        console.warn('Calibration config write failed:', error);
    }
}

export function calibrateSimilarityRisk(rawScore, features = {}) {
    const cfg = getCalibrationConfig();
    const normalizedRaw = Math.max(0, Math.min(100, Number(rawScore || 0)));
    const f = {
        maxMatch: Math.max(0, Math.min(100, Number(features.maxMatch || 0))),
        sourceCount: Math.max(0, Number(features.sourceCount || 0)),
        evidenceDensity: Math.max(0, Number(features.evidenceDensity || 0)),
        semanticLift: Math.max(0, Math.min(100, Number(features.semanticLift || 0)))
    };

    const logit = cfg.intercept
        + (cfg.weights.rawScore * normalizedRaw)
        + (cfg.weights.maxMatch * f.maxMatch)
        + (cfg.weights.sourceCount * Math.min(f.sourceCount, 8))
        + (cfg.weights.evidenceDensity * Math.min(f.evidenceDensity, 12))
        + (cfg.weights.semanticLift * f.semanticLift);

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
