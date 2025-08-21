// --- Performance Optimization Utilities ---
'use client';

import { useEffect, useState } from 'react';
import { useMonitoring } from './monitoring';

// Performance budget configuration
export const PERFORMANCE_BUDGETS = {
  commandCenter: {
    firstContentfulPaint: 1500,
    largestContentfulPaint: 2000,
    firstInputDelay: 100,
    cumulativeLayoutShift: 0.1,
    timeToInteractive: 3000,
    totalBlockingTime: 250,
    bundleSize: 800000, // 800KB
    initialJS: 400000, // 400KB
  }
};

// Performance monitoring hook
export function usePerformanceMonitoring() {
  const { trackPerformance, trackEvent } = useMonitoring();
  const [performanceData, setPerformanceData] = useState({});

  useEffect(() => {
    // Web Vitals monitoring
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const metricData = {
            name: entry.name,
            value: entry.value || entry.startTime,
            timestamp: Date.now(),
            url: window.location.pathname
          };

          setPerformanceData(prev => ({
            ...prev,
            [entry.name]: metricData
          }));

          trackPerformance(entry.name, metricData.value, {
            url: window.location.pathname,
            timestamp: metricData.timestamp
          });
        }
      });

      try {
        observer.observe({ entryTypes: ['measure', 'navigation', 'paint', 'largest-contentful-paint'] });
      } catch (error) {
        console.warn('Performance observer not fully supported:', error);
      }

      return () => observer.disconnect();
    }
  }, [trackPerformance]);

  // Bundle size monitoring
  const trackBundleSize = () => {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = window.performance.getEntriesByType('navigation')[0];
      if (navigation) {
        trackEvent('bundle_size_metrics', {
          transferSize: navigation.transferSize,
          encodedBodySize: navigation.encodedBodySize,
          decodedBodySize: navigation.decodedBodySize,
          url: window.location.pathname
        });
      }
    }
  };

  return {
    performanceData,
    trackBundleSize
  };
}

// Resource loading optimization
export function preloadCriticalResources() {
  if (typeof window !== 'undefined') {
    // Preload critical fonts
    const fontPreloads = [
      { href: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2', as: 'font', type: 'font/woff2' },
      { href: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLDD4Z1xlFQ.woff2', as: 'font', type: 'font/woff2' }
    ];

    fontPreloads.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = font.href;
      link.as = font.as;
      link.type = font.type;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }
}

// Lazy loading utilities
export function createIntersectionObserver(callback, options = {}) {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
  };

  return new IntersectionObserver(callback, { ...defaultOptions, ...options });
}

// Component lazy loading
export function useLazyLoading(ref, callback) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = createIntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback();
          observer.unobserve(element);
        }
      });
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, callback]);
}

// Performance optimization techniques
export const PerformanceOptimizer = {
  // Debounce function calls
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function calls
  throttle: (func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Optimize images
  optimizeImage: (src, width = 800, quality = 75) => {
    if (src.includes('firebasestorage.googleapis.com')) {
      return `${src}?w=${width}&q=${quality}&fm=webp`;
    }
    return src;
  },

  // Cache management
  clearCache: () => {
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
  },

  // Memory optimization
  clearMemory: () => {
    if (window.gc) {
      window.gc();
    }
  }
};

// Performance budget checker
export function checkPerformanceBudget() {
  const budget = PERFORMANCE_BUDGETS.commandCenter;
  const results = {};

  if (typeof window !== 'undefined' && window.performance) {
    const navigation = window.performance.getEntriesByType('navigation')[0];
    const paint = window.performance.getEntriesByType('paint');

    // Check FCP
    const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
    if (fcp) {
      results.firstContentfulPaint = {
        value: fcp.startTime,
        budget: budget.firstContentfulPaint,
        passed: fcp.startTime <= budget.firstContentfulPaint
      };
    }

    // Check TTI (approximate)
    if (navigation) {
      const tti = navigation.domInteractive;
      results.timeToInteractive = {
        value: tti,
        budget: budget.timeToInteractive,
        passed: tti <= budget.timeToInteractive
      };
    }

    // Check bundle size
    if (navigation.transferSize) {
      results.bundleSize = {
        value: navigation.transferSize,
        budget: budget.bundleSize,
        passed: navigation.transferSize <= budget.bundleSize
      };
    }
  }

  return results;
}

// Performance reporting
export function generatePerformanceReport() {
  const report = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt
    } : null,
    performance: checkPerformanceBudget(),
    memory: window.performance.memory ? {
      usedJSHeapSize: window.performance.memory.usedJSHeapSize,
      totalJSHeapSize: window.performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
    } : null
  };

  return report;
}

// React component for performance monitoring
export function PerformanceMonitor({ children }) {
  useEffect(() => {
    // Initialize performance monitoring
    preloadCriticalResources();

    // Track initial load performance
    const handleLoad = () => {
      setTimeout(() => {
        generatePerformanceReport();
      }, 1000); // Wait for metrics to settle
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  return children;
}

export default PerformanceOptimizer;
