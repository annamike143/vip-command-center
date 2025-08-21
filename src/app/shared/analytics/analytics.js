// --- Unified Analytics System ---
// Professional analytics tracking for both Learning Realm and Command Center

class AnalyticsManager {
    constructor() {
        this.isInitialized = false;
        this.userId = null;
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
    }

    // Initialize analytics
    async initialize(userId = null, userRole = 'student') {
        this.userId = userId;
        this.userRole = userRole;
        this.isInitialized = true;

        // Initialize Google Analytics if available
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || 'GA_MEASUREMENT_ID', {
                user_id: userId,
                custom_map: { custom_dimension_1: 'user_role' }
            });
            
            // Set user properties
            window.gtag('set', {
                user_id: userId,
                user_role: userRole
            });
        }

        // Track session start
        this.trackEvent('session_start', {
            user_role: userRole,
            session_id: this.sessionId
        });

        console.log('📊 Analytics initialized for user:', userId);
    }

    // Generate unique session ID
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Track events
    trackEvent(eventName, properties = {}) {
        if (!this.isInitialized) {
            console.warn('Analytics not initialized, queuing event:', eventName);
            return;
        }

        const eventData = {
            event_name: eventName,
            user_id: this.userId,
            session_id: this.sessionId,
            timestamp: Date.now(),
            user_role: this.userRole,
            ...properties
        };

        // Send to Google Analytics
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', eventName, {
                event_category: properties.category || 'engagement',
                event_label: properties.label,
                value: properties.value,
                custom_dimension_1: this.userRole,
                ...properties
            });
        }

        // Send to Firebase Analytics (if available)
        if (typeof window !== 'undefined' && window.firebase?.analytics) {
            window.firebase.analytics().logEvent(eventName, eventData);
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log('📊 Analytics Event:', eventName, eventData);
        }

        // Send to custom analytics endpoint
        this.sendToCustomEndpoint(eventData);
    }

    // Send to custom analytics endpoint
    async sendToCustomEndpoint(eventData) {
        try {
            // Only send in production or when explicitly enabled
            if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true') {
                await fetch('/api/analytics', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(eventData)
                });
            }
        } catch (error) {
            console.error('Analytics endpoint error:', error);
        }
    }

    // Track page views
    trackPageView(page, title = null) {
        this.trackEvent('page_view', {
            page_path: page,
            page_title: title,
            category: 'navigation'
        });
    }

    // Track user interactions
    trackUserInteraction(action, element, value = null) {
        this.trackEvent('user_interaction', {
            action,
            element,
            value,
            category: 'interaction'
        });
    }

    // Track learning progress
    trackLearningProgress(courseId, lessonId, progressType, value = null) {
        this.trackEvent('learning_progress', {
            course_id: courseId,
            lesson_id: lessonId,
            progress_type: progressType, // 'lesson_start', 'lesson_complete', 'quiz_submit', etc.
            value,
            category: 'learning'
        });
    }

    // Track AI interactions
    trackAIInteraction(chatType, messageLength, responseTime = null) {
        this.trackEvent('ai_interaction', {
            chat_type: chatType, // 'recitation', 'qna'
            message_length: messageLength,
            response_time: responseTime,
            category: 'ai'
        });
    }

    // Track admin actions
    trackAdminAction(action, targetType, targetId = null) {
        this.trackEvent('admin_action', {
            action, // 'user_created', 'course_published', 'user_frozen', etc.
            target_type: targetType, // 'user', 'course', 'lesson'
            target_id: targetId,
            category: 'admin'
        });
    }

    // Track errors
    trackError(errorType, errorMessage, errorStack = null) {
        this.trackEvent('error_occurred', {
            error_type: errorType,
            error_message: errorMessage,
            error_stack: errorStack,
            category: 'error'
        });

        // Send to error tracking service
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'exception', {
                description: errorMessage,
                fatal: false
            });
        }
    }

    // Track performance metrics
    trackPerformance(metric, value) {
        this.trackEvent('performance_metric', {
            metric_name: metric,
            metric_value: value,
            category: 'performance'
        });
    }

    // Track session end
    trackSessionEnd() {
        const sessionDuration = Date.now() - this.startTime;
        this.trackEvent('session_end', {
            session_duration: sessionDuration,
            category: 'engagement'
        });
    }

    // Track conversion events
    trackConversion(conversionType, value = null) {
        this.trackEvent('conversion', {
            conversion_type: conversionType, // 'course_completed', 'lesson_unlocked', etc.
            conversion_value: value,
            category: 'conversion'
        });
    }

    // Get user journey data
    getUserJourney() {
        return {
            user_id: this.userId,
            session_id: this.sessionId,
            session_duration: Date.now() - this.startTime,
            user_role: this.userRole
        };
    }
}

// Create singleton instance (client-side only)
let analytics = null;

// Initialize analytics instance on client side only
const getAnalytics = () => {
    if (typeof window === 'undefined') return null;
    if (!analytics) {
        analytics = new AnalyticsManager();
    }
    return analytics;
};

// Helper functions for easy usage (with client-side safety)
export const initializeAnalytics = (userId, userRole) => {
    const analyticsInstance = getAnalytics();
    if (analyticsInstance) {
        return analyticsInstance.initialize(userId, userRole);
    }
};

export const trackEvent = (eventName, properties) => {
    const analyticsInstance = getAnalytics();
    if (analyticsInstance) {
        return analyticsInstance.trackEvent(eventName, properties);
    }
};

export const trackPageView = (page, title) => {
    const analyticsInstance = getAnalytics();
    if (analyticsInstance) {
        return analyticsInstance.trackPageView(page, title);
    }
};

export const trackUserInteraction = (action, element, value) => {
    const analyticsInstance = getAnalytics();
    if (analyticsInstance) {
        return analyticsInstance.trackUserInteraction(action, element, value);
    }
};

export const trackLearningProgress = (courseId, lessonId, progressType, value) => {
    const analyticsInstance = getAnalytics();
    if (analyticsInstance) {
        return analyticsInstance.trackLearningProgress(courseId, lessonId, progressType, value);
    }
};

export const trackAIInteraction = (chatType, messageLength, responseTime) => {
    const analyticsInstance = getAnalytics();
    if (analyticsInstance) {
        return analyticsInstance.trackAIInteraction(chatType, messageLength, responseTime);
    }
};

export const trackAdminAction = (action, targetType, targetId) => {
    const analyticsInstance = getAnalytics();
    if (analyticsInstance) {
        return analyticsInstance.trackAdminAction(action, targetType, targetId);
    }
};

export const trackError = (errorType, errorMessage, errorStack) => {
    const analyticsInstance = getAnalytics();
    if (analyticsInstance) {
        return analyticsInstance.trackError(errorType, errorMessage, errorStack);
    }
};

export const trackPerformance = (metric, value) => {
    const analyticsInstance = getAnalytics();
    if (analyticsInstance) {
        return analyticsInstance.trackPerformance(metric, value);
    }
};

export const trackSessionEnd = () => {
    const analyticsInstance = getAnalytics();
    if (analyticsInstance) {
        return analyticsInstance.trackSessionEnd();
    }
};

export const trackConversion = (conversionType, value) => {
    const analyticsInstance = getAnalytics();
    if (analyticsInstance) {
        return analyticsInstance.trackConversion(conversionType, value);
    }
};

// React hook for analytics
export const useAnalytics = () => {
    return {
        trackEvent,
        trackPageView,
        trackUserInteraction,
        trackLearningProgress,
        trackAIInteraction,
        trackAdminAction,
        trackError,
        trackPerformance,
        trackConversion
    };
};

export default getAnalytics;
