// --- Centralized Monitoring & Analytics System ---
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

// Analytics events
export const ANALYTICS_EVENTS = {
  // User interactions
  LOGIN: 'user_login',
  LOGOUT: 'user_logout',
  SIGNUP: 'user_signup',
  PROFILE_UPDATE: 'profile_update',
  
  // Course interactions
  COURSE_VIEW: 'course_view',
  LESSON_START: 'lesson_start',
  LESSON_COMPLETE: 'lesson_complete',
  QUIZ_START: 'quiz_start',
  QUIZ_COMPLETE: 'quiz_complete',
  
  // Admin actions
  COURSE_CREATE: 'course_create',
  COURSE_EDIT: 'course_edit',
  COURSE_DELETE: 'course_delete',
  USER_MANAGEMENT: 'user_management',
  CONTENT_MODERATION: 'content_moderation',
  
  // Engagement
  CHAT_MESSAGE: 'chat_message',
  COMMENT_POST: 'comment_post',
  RESOURCE_DOWNLOAD: 'resource_download',
  VIDEO_PLAY: 'video_play',
  VIDEO_PAUSE: 'video_pause',
  VIDEO_COMPLETE: 'video_complete',
  
  // Navigation
  PAGE_VIEW: 'page_view',
  NAVIGATION: 'navigation',
  SEARCH: 'search',
  
  // Errors
  ERROR_OCCURRED: 'error_occurred',
  ERROR_RESOLVED: 'error_resolved',
  
  // Performance
  PAGE_LOAD_TIME: 'page_load_time',
  API_RESPONSE_TIME: 'api_response_time',
  
  // Business metrics
  SUBSCRIPTION_START: 'subscription_start',
  SUBSCRIPTION_CANCEL: 'subscription_cancel',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed'
};

// Performance metrics
export const PERFORMANCE_METRICS = {
  LCP: 'largest_contentful_paint',
  FID: 'first_input_delay',
  CLS: 'cumulative_layout_shift',
  FCP: 'first_contentful_paint',
  TTFB: 'time_to_first_byte'
};

// User behavior tracking
export const USER_BEHAVIOR = {
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  SCROLL_DEPTH: 'scroll_depth',
  TIME_ON_PAGE: 'time_on_page',
  BOUNCE: 'bounce',
  FEATURE_USE: 'feature_use'
};

// Monitoring context
const MonitoringContext = createContext();

export function MonitoringProvider({ children }) {
  const [metrics, setMetrics] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [sessionId] = useState(() => generateSessionId());
  const [userId, setUserId] = useState(null);

  // Initialize monitoring
  useEffect(() => {
    initializeMonitoring();
    setupPerformanceObserver();
    setupUserBehaviorTracking();

    return () => {
      // Cleanup
      flushMetrics();
    };
  }, []);

  // Generate unique session ID
  function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize monitoring systems
  const initializeMonitoring = () => {
    // Track session start
    trackEvent(USER_BEHAVIOR.SESSION_START, {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      referrer: document.referrer
    });

    // Network status
    setIsOnline(navigator.onLine);
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));

    // Page visibility
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Before unload
    window.addEventListener('beforeunload', handleBeforeUnload);
  };

  // Track events
  const trackEvent = (eventName, data = {}) => {
    const event = {
      id: generateEventId(),
      name: eventName,
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      data: {
        url: window.location.href,
        pathname: window.location.pathname,
        ...data
      }
    };

    setMetrics(prev => [...prev, event]);

    // Send to analytics service
    sendToAnalytics(event);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', event);
    }
  };

  // Track performance metrics
  const trackPerformance = (metricName, value, additionalData = {}) => {
    trackEvent(metricName, {
      value,
      unit: getMetricUnit(metricName),
      ...additionalData
    });
  };

  // Track user behavior
  const trackUserBehavior = (behavior, data = {}) => {
    trackEvent(behavior, {
      behavior: true,
      ...data
    });
  };

  // Track errors
  const trackError = (error, context = {}) => {
    trackEvent(ANALYTICS_EVENTS.ERROR_OCCURRED, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      severity: context.severity || 'medium'
    });
  };

  // Generate event ID
  const generateEventId = () => {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Get metric unit
  const getMetricUnit = (metricName) => {
    const timeMetrics = [
      PERFORMANCE_METRICS.LCP,
      PERFORMANCE_METRICS.FID,
      PERFORMANCE_METRICS.FCP,
      PERFORMANCE_METRICS.TTFB,
      ANALYTICS_EVENTS.PAGE_LOAD_TIME,
      ANALYTICS_EVENTS.API_RESPONSE_TIME
    ];
    
    if (timeMetrics.includes(metricName)) return 'ms';
    if (metricName === PERFORMANCE_METRICS.CLS) return 'score';
    return 'count';
  };

  // Send to analytics service
  const sendToAnalytics = async (event) => {
    try {
      if (process.env.NODE_ENV === 'production' && isOnline) {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event)
        });
      }
    } catch (error) {
      console.error('Failed to send analytics:', error);
      // Store for retry
      storeOfflineEvent(event);
    }
  };

  // Store offline events
  const storeOfflineEvent = (event) => {
    try {
      const offlineEvents = JSON.parse(localStorage.getItem('offline_analytics') || '[]');
      offlineEvents.push(event);
      localStorage.setItem('offline_analytics', JSON.stringify(offlineEvents));
    } catch (error) {
      console.error('Failed to store offline event:', error);
    }
  };

  // Flush stored metrics
  const flushMetrics = async () => {
    try {
      const offlineEvents = JSON.parse(localStorage.getItem('offline_analytics') || '[]');
      if (offlineEvents.length > 0 && isOnline) {
        for (const event of offlineEvents) {
          await sendToAnalytics(event);
        }
        localStorage.removeItem('offline_analytics');
      }
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  };

  // Handle visibility change
  const handleVisibilityChange = () => {
    if (document.hidden) {
      trackUserBehavior(USER_BEHAVIOR.SESSION_END, {
        duration: Date.now() - parseInt(sessionId.split('_')[1])
      });
    }
  };

  // Handle before unload
  const handleBeforeUnload = () => {
    flushMetrics();
  };

  // Setup performance observer
  const setupPerformanceObserver = () => {
    if ('PerformanceObserver' in window) {
      // Web Vitals
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          switch (entry.entryType) {
            case 'largest-contentful-paint':
              trackPerformance(PERFORMANCE_METRICS.LCP, entry.startTime);
              break;
            case 'first-input':
              trackPerformance(PERFORMANCE_METRICS.FID, entry.processingStart - entry.startTime);
              break;
            case 'layout-shift':
              if (!entry.hadRecentInput) {
                trackPerformance(PERFORMANCE_METRICS.CLS, entry.value);
              }
              break;
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                trackPerformance(PERFORMANCE_METRICS.FCP, entry.startTime);
              }
              break;
            case 'navigation':
              trackPerformance(PERFORMANCE_METRICS.TTFB, entry.responseStart);
              trackPerformance(ANALYTICS_EVENTS.PAGE_LOAD_TIME, entry.loadEventEnd - entry.fetchStart);
              break;
          }
        }
      });

      try {
        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'paint', 'navigation'] });
      } catch (error) {
        console.warn('Performance observer not supported:', error);
      }
    }
  };

  // Setup user behavior tracking
  const setupUserBehaviorTracking = () => {
    let scrollDepth = 0;
    const pageStartTime = Date.now();

    // Scroll depth tracking
    const handleScroll = () => {
      const currentScrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      if (currentScrollDepth > scrollDepth && currentScrollDepth % 25 === 0) {
        scrollDepth = currentScrollDepth;
        trackUserBehavior(USER_BEHAVIOR.SCROLL_DEPTH, { depth: scrollDepth });
      }
    };

    // Time on page tracking
    const handleTimeOnPage = () => {
      const timeOnPage = Date.now() - pageStartTime;
      trackUserBehavior(USER_BEHAVIOR.TIME_ON_PAGE, { duration: timeOnPage });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    setInterval(handleTimeOnPage, 30000); // Track every 30 seconds
  };

  // Public API
  const value = {
    sessionId,
    userId,
    setUserId,
    trackEvent,
    trackPerformance,
    trackUserBehavior,
    trackError,
    metrics,
    isOnline
  };

  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoring() {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
}

// Hook for automatic page view tracking
export function usePageTracking() {
  const { trackEvent } = useMonitoring();

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, {
      title: document.title,
      pathname: window.location.pathname,
      search: window.location.search
    });
  }, []);
}

// Hook for API call tracking
export function useApiTracking() {
  const { trackEvent, trackPerformance } = useMonitoring();

  const trackApiCall = async (apiCall, endpoint, method = 'GET') => {
    const startTime = Date.now();
    
    try {
      const result = await apiCall();
      const duration = Date.now() - startTime;
      
      trackPerformance(ANALYTICS_EVENTS.API_RESPONSE_TIME, duration, {
        endpoint,
        method,
        status: 'success'
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      trackPerformance(ANALYTICS_EVENTS.API_RESPONSE_TIME, duration, {
        endpoint,
        method,
        status: 'error',
        error: error.message
      });
      
      throw error;
    }
  };

  return { trackApiCall };
}

// Hook for feature usage tracking
export function useFeatureTracking() {
  const { trackEvent } = useMonitoring();

  const trackFeatureUse = (featureName, data = {}) => {
    trackEvent(USER_BEHAVIOR.FEATURE_USE, {
      feature: featureName,
      ...data
    });
  };

  return { trackFeatureUse };
}

// Analytics utilities
export const analyticsUtils = {
  // Track conversion funnel
  trackFunnel: (step, funnelName, data = {}) => {
    const { trackEvent } = useMonitoring();
    trackEvent('funnel_step', {
      funnel: funnelName,
      step,
      ...data
    });
  },

  // Track A/B test
  trackABTest: (testName, variant, data = {}) => {
    const { trackEvent } = useMonitoring();
    trackEvent('ab_test', {
      test: testName,
      variant,
      ...data
    });
  },

  // Track custom metric
  trackCustomMetric: (metricName, value, unit = 'count') => {
    const { trackEvent } = useMonitoring();
    trackEvent('custom_metric', {
      metric: metricName,
      value,
      unit
    });
  }
};

// Real User Monitoring (RUM) component
export function RealUserMonitoring() {
  const { trackError } = useMonitoring();

  useEffect(() => {
    // Global error handler
    const handleError = (event) => {
      trackError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    // Unhandled promise rejection handler
    const handleUnhandledRejection = (event) => {
      trackError(new Error(event.reason), {
        type: 'unhandledRejection'
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackError]);

  return null; // This component doesn't render anything
}
