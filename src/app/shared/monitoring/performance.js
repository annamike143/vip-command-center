// --- Performance Monitoring System ---
// Real-time performance tracking and optimization

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = [];
        this.isInitialized = false;
    }

    // Initialize performance monitoring
    initialize() {
        if (typeof window === 'undefined' || this.isInitialized) return;

        this.isInitialized = true;

        // Monitor Core Web Vitals
        this.observeWebVitals();
        
        // Monitor resource loading
        this.observeResourceTiming();
        
        // Monitor navigation timing
        this.observeNavigationTiming();
        
        // Monitor memory usage
        this.observeMemoryUsage();

        // Monitor custom metrics
        this.observeCustomMetrics();

        console.log('📊 Performance monitoring initialized');
    }

    // Observe Core Web Vitals
    observeWebVitals() {
        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window) {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.recordMetric('LCP', lastEntry.startTime);
                this.reportMetric('largest_contentful_paint', lastEntry.startTime);
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            this.observers.push(lcpObserver);

            // First Input Delay (FID)
            const fidObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    this.recordMetric('FID', entry.processingStart - entry.startTime);
                    this.reportMetric('first_input_delay', entry.processingStart - entry.startTime);
                });
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
            this.observers.push(fidObserver);

            // Cumulative Layout Shift (CLS)
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                });
                this.recordMetric('CLS', clsValue);
                this.reportMetric('cumulative_layout_shift', clsValue);
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
            this.observers.push(clsObserver);
        }
    }

    // Observe resource loading performance
    observeResourceTiming() {
        if ('PerformanceObserver' in window) {
            const resourceObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    // Track slow resources
                    if (entry.duration > 1000) { // Resources taking >1s
                        this.recordMetric('SLOW_RESOURCE', {
                            name: entry.name,
                            duration: entry.duration,
                            size: entry.transferSize
                        });
                        this.reportMetric('slow_resource_load', entry.duration, {
                            resource_name: entry.name,
                            resource_size: entry.transferSize
                        });
                    }
                });
            });
            resourceObserver.observe({ entryTypes: ['resource'] });
            this.observers.push(resourceObserver);
        }
    }

    // Observe navigation timing
    observeNavigationTiming() {
        if ('performance' in window && 'getEntriesByType' in performance) {
            setTimeout(() => {
                const navigationEntries = performance.getEntriesByType('navigation');
                if (navigationEntries.length > 0) {
                    const entry = navigationEntries[0];
                    
                    // DNS lookup time
                    const dnsTime = entry.domainLookupEnd - entry.domainLookupStart;
                    this.recordMetric('DNS_TIME', dnsTime);
                    this.reportMetric('dns_lookup_time', dnsTime);

                    // Connection time
                    const connectionTime = entry.connectEnd - entry.connectStart;
                    this.recordMetric('CONNECTION_TIME', connectionTime);
                    this.reportMetric('connection_time', connectionTime);

                    // Server response time
                    const responseTime = entry.responseEnd - entry.requestStart;
                    this.recordMetric('RESPONSE_TIME', responseTime);
                    this.reportMetric('server_response_time', responseTime);

                    // DOM content loaded
                    const domContentLoaded = entry.domContentLoadedEventEnd - entry.navigationStart;
                    this.recordMetric('DOM_CONTENT_LOADED', domContentLoaded);
                    this.reportMetric('dom_content_loaded', domContentLoaded);

                    // Page load complete
                    const pageLoadTime = entry.loadEventEnd - entry.navigationStart;
                    this.recordMetric('PAGE_LOAD_TIME', pageLoadTime);
                    this.reportMetric('page_load_time', pageLoadTime);
                }
            }, 2000); // Wait for page to fully load
        }
    }

    // Observe memory usage
    observeMemoryUsage() {
        if ('performance' in window && 'memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                const memoryUsage = {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit,
                    percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
                };
                
                this.recordMetric('MEMORY_USAGE', memoryUsage);
                
                // Alert if memory usage is high
                if (memoryUsage.percentage > 80) {
                    this.reportMetric('high_memory_usage', memoryUsage.percentage, {
                        memory_used: memory.usedJSHeapSize,
                        memory_limit: memory.jsHeapSizeLimit
                    });
                }
            }, 30000); // Check every 30 seconds
        }
    }

    // Observe custom metrics
    observeCustomMetrics() {
        // Time to Interactive approximation
        if ('PerformanceObserver' in window) {
            let lastLongTask = 0;
            const longTaskObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    lastLongTask = entry.startTime + entry.duration;
                    
                    // Report long tasks
                    if (entry.duration > 50) {
                        this.recordMetric('LONG_TASK', entry.duration);
                        this.reportMetric('long_task_detected', entry.duration);
                    }
                });
            });
            longTaskObserver.observe({ entryTypes: ['longtask'] });
            this.observers.push(longTaskObserver);
        }
    }

    // Record metric locally
    recordMetric(name, value) {
        const timestamp = Date.now();
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        this.metrics.get(name).push({ value, timestamp });
        
        // Keep only last 100 entries per metric
        const entries = this.metrics.get(name);
        if (entries.length > 100) {
            entries.splice(0, entries.length - 100);
        }
    }

    // Report metric to analytics
    reportMetric(metricName, value, additionalData = {}) {
        // Import analytics dynamically to avoid circular imports
        import('../analytics/analytics.js').then(({ trackPerformance }) => {
            trackPerformance(metricName, value);
        });

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`📊 Performance Metric: ${metricName} = ${value}`, additionalData);
        }
    }

    // Get performance summary
    getPerformanceSummary() {
        const summary = {};
        this.metrics.forEach((values, name) => {
            if (values.length > 0) {
                const latestValue = values[values.length - 1].value;
                summary[name] = {
                    current: latestValue,
                    average: values.reduce((sum, v) => sum + (typeof v.value === 'number' ? v.value : 0), 0) / values.length,
                    count: values.length
                };
            }
        });
        return summary;
    }

    // Check if performance is good
    getPerformanceStatus() {
        const summary = this.getPerformanceSummary();
        const status = {
            overall: 'good',
            issues: []
        };

        // Check LCP (should be < 2.5s)
        if (summary.LCP && summary.LCP.current > 2500) {
            status.overall = 'needs-improvement';
            status.issues.push('Largest Contentful Paint is slow');
        }

        // Check FID (should be < 100ms)
        if (summary.FID && summary.FID.current > 100) {
            status.overall = 'poor';
            status.issues.push('First Input Delay is high');
        }

        // Check CLS (should be < 0.1)
        if (summary.CLS && summary.CLS.current > 0.1) {
            status.overall = 'needs-improvement';
            status.issues.push('Cumulative Layout Shift is high');
        }

        // Check page load time (should be < 3s)
        if (summary.PAGE_LOAD_TIME && summary.PAGE_LOAD_TIME.current > 3000) {
            status.overall = 'needs-improvement';
            status.issues.push('Page load time is slow');
        }

        return status;
    }

    // Cleanup observers
    cleanup() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        this.isInitialized = false;
    }

    // Manual timing helpers
    startTiming(name) {
        const startTime = performance.now();
        return {
            end: () => {
                const duration = performance.now() - startTime;
                this.recordMetric(`CUSTOM_${name.toUpperCase()}`, duration);
                this.reportMetric(`custom_timing_${name}`, duration);
                return duration;
            }
        };
    }

    // Mark significant events
    markEvent(eventName) {
        if ('performance' in window && 'mark' in performance) {
            performance.mark(eventName);
            this.reportMetric('user_timing_mark', performance.now(), {
                mark_name: eventName
            });
        }
    }

    // Measure between two marks
    measureBetween(startMark, endMark, measureName) {
        if ('performance' in window && 'measure' in performance) {
            try {
                performance.measure(measureName, startMark, endMark);
                const measure = performance.getEntriesByName(measureName)[0];
                this.recordMetric(`MEASURE_${measureName.toUpperCase()}`, measure.duration);
                this.reportMetric(`user_timing_measure`, measure.duration, {
                    measure_name: measureName
                });
                return measure.duration;
            } catch (error) {
                console.warn('Performance measure failed:', error);
            }
        }
    }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Auto-initialize on load
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => performanceMonitor.initialize());
    } else {
        performanceMonitor.initialize();
    }
}

// Export functions
export const getPerformanceSummary = () => performanceMonitor.getPerformanceSummary();
export const getPerformanceStatus = () => performanceMonitor.getPerformanceStatus();
export const startTiming = (name) => performanceMonitor.startTiming(name);
export const markEvent = (eventName) => performanceMonitor.markEvent(eventName);
export const measureBetween = (startMark, endMark, measureName) => performanceMonitor.measureBetween(startMark, endMark, measureName);

export default performanceMonitor;
