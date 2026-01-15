import React from 'react';

const ANALYSIS_STEPS = [
    { id: 1, label: 'Preprocessing', threshold: 10 },
    { id: 2, label: 'TF-IDF Analysis', threshold: 30 },
    { id: 3, label: 'N-gram Detection', threshold: 50 },
    { id: 4, label: 'Web Search', threshold: 70 },
    { id: 5, label: 'API Checks', threshold: 90 },
    { id: 6, label: 'Generating Report', threshold: 100 },
];

function AnalysisProgress({ progress }) {
    const getCurrentStep = () => {
        for (let i = ANALYSIS_STEPS.length - 1; i >= 0; i--) {
            if (progress >= ANALYSIS_STEPS[i].threshold) {
                return ANALYSIS_STEPS[i].id;
            }
        }
        return 1;
    };

    const currentStep = getCurrentStep();

    return (
        <div className="progress-container">
            <div className="progress-header">
                <div className="progress-spinner" />
                <div>
                    <h3>Analyzing Document...</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {progress}% complete
                    </p>
                </div>
            </div>

            <div className="progress-bar-container">
                <div
                    className="progress-bar"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="progress-steps">
                {ANALYSIS_STEPS.map((step) => (
                    <div
                        key={step.id}
                        className={`progress-step ${progress >= step.threshold ? 'complete' :
                                currentStep === step.id ? 'active' : ''
                            }`}
                    >
                        <span>
                            {progress >= step.threshold ? '✓' :
                                currentStep === step.id ? '○' : '○'}
                        </span>
                        {step.label}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default AnalysisProgress;
