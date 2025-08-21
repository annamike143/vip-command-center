// --- Unified Error Handling Utilities for Cross-System Communication ---

/**
 * Central error handling system that works across both Learning Realm and Command Center
 * Provides unified error reporting, logging, and notification
 */

// Error types that should be synced between systems
export const CROSS_SYSTEM_ERROR_TYPES = {
    USER_ERROR: 'user_error',
    SYSTEM_FAILURE: 'system_failure',
    SECURITY_ISSUE: 'security_issue',
    API_FAILURE: 'api_failure',
    FIREBASE_ERROR: 'firebase_error',
    OPENAI_ERROR: 'openai_error',
    AUTHENTICATION_ERROR: 'authentication_error',
    AUTHORIZATION_ERROR: 'authorization_error'
};

// Error severity levels
export const ERROR_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium', 
    HIGH: 'high',
    CRITICAL: 'critical'
};

/**
 * Report error to cross-system monitoring
 * This function works in both Learning Realm and Command Center
 */
export async function reportCrossSystemError(error, context = {}) {
    const errorData = {
        type: error.type || CROSS_SYSTEM_ERROR_TYPES.SYSTEM_FAILURE,
        severity: error.severity || ERROR_SEVERITY.MEDIUM,
        message: error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        context: {
            ...context,
            userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
            url: typeof window !== 'undefined' ? window.location.href : 'server',
            system: process.env.NEXT_PUBLIC_SYSTEM_NAME || 'unknown'
        }
    };

    try {
        // Log to local system
        await fetch('/api/cross-system', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'report-system-event',
                data: {
                    eventType: errorData.type,
                    message: errorData.message,
                    metadata: errorData
                }
            })
        });

        // If this is a critical error, also try to notify the other system
        if (errorData.severity === ERROR_SEVERITY.CRITICAL) {
            await notifyOtherSystem(errorData);
        }

    } catch (reportError) {
        console.error('Failed to report cross-system error:', reportError);
        
        // Fallback: store in localStorage for later sync
        if (typeof window !== 'undefined') {
            const storedErrors = JSON.parse(localStorage.getItem('pending_error_reports') || '[]');
            storedErrors.push(errorData);
            localStorage.setItem('pending_error_reports', JSON.stringify(storedErrors));
        }
    }
}

/**
 * Notify the other system about critical errors
 */
async function notifyOtherSystem(errorData) {
    try {
        const currentSystem = process.env.NEXT_PUBLIC_SYSTEM_NAME;
        let targetUrl;

        if (currentSystem === 'learning-realm') {
            targetUrl = process.env.NEXT_PUBLIC_COMMAND_CENTER_URL || 'http://localhost:3001';
        } else if (currentSystem === 'command-center') {
            targetUrl = process.env.NEXT_PUBLIC_LEARNING_REALM_URL || 'http://localhost:3000';
        } else {
            return; // Unknown system, skip cross-notification
        }

        await fetch(`${targetUrl}/api/cross-system`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'report-system-event',
                data: {
                    eventType: 'cross_system_error',
                    message: `Critical error reported from ${currentSystem}`,
                    metadata: errorData
                }
            })
        });

    } catch (notifyError) {
        console.error('Failed to notify other system:', notifyError);
    }
}

/**
 * Sync pending error reports (for offline/failed submissions)
 */
export async function syncPendingErrorReports() {
    if (typeof window === 'undefined') return;

    try {
        const pendingErrors = JSON.parse(localStorage.getItem('pending_error_reports') || '[]');
        
        if (pendingErrors.length === 0) return;

        for (const errorData of pendingErrors) {
            await reportCrossSystemError(errorData);
        }

        // Clear pending reports after successful sync
        localStorage.removeItem('pending_error_reports');

    } catch (syncError) {
        console.error('Failed to sync pending error reports:', syncError);
    }
}

/**
 * Enhanced error handler that integrates with existing error handling
 */
export function withCrossSystemErrorHandling(originalErrorHandler) {
    return async (error, context = {}) => {
        // Call original error handler
        if (originalErrorHandler) {
            await originalErrorHandler(error, context);
        }

        // Determine if this should be reported cross-system
        const shouldReportCrossSystem = 
            error.severity === ERROR_SEVERITY.HIGH ||
            error.severity === ERROR_SEVERITY.CRITICAL ||
            [
                CROSS_SYSTEM_ERROR_TYPES.SECURITY_ISSUE,
                CROSS_SYSTEM_ERROR_TYPES.FIREBASE_ERROR,
                CROSS_SYSTEM_ERROR_TYPES.SYSTEM_FAILURE
            ].includes(error.type);

        if (shouldReportCrossSystem) {
            await reportCrossSystemError(error, context);
        }
    };
}

/**
 * Create error handlers that automatically report to cross-system monitoring
 */
export function createCrossSystemErrorHandlers() {
    return {
        handleApiError: withCrossSystemErrorHandling(null),
        handleFirebaseError: withCrossSystemErrorHandling(null),
        handleOpenAIError: withCrossSystemErrorHandling(null),
        handleAuthError: withCrossSystemErrorHandling(null)
    };
}

/**
 * Initialize cross-system error monitoring
 * Call this on app startup in both systems
 */
export function initializeCrossSystemErrorMonitoring() {
    // Sync any pending error reports
    syncPendingErrorReports();

    // Set up periodic sync (every 5 minutes)
    if (typeof window !== 'undefined') {
        setInterval(syncPendingErrorReports, 5 * 60 * 1000);
    }

    // Report system startup
    reportCrossSystemError({
        type: 'system_startup',
        severity: ERROR_SEVERITY.LOW,
        message: 'System initialized successfully'
    });
}
