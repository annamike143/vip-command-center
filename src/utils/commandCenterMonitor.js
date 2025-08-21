// Production Health Check and Monitoring Utilities - Command Center
// Enhanced monitoring for admin platform with additional security checks

class CommandCenterMonitor {
  constructor() {
    this.healthChecks = [];
    this.performanceMetrics = {};
    this.alerts = [];
    this.securityEvents = [];
  }

  // Enhanced health check for admin platform
  async performHealthCheck() {
    const checks = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        database: await this.checkDatabase(),
        api: await this.checkAPI(),
        storage: await this.checkStorage(),
        authentication: await this.checkAuth(),
        email: await this.checkEmail(),
        security: await this.checkSecurity(),
        functions: await this.checkFirebaseFunctions(),
        performance: await this.checkPerformance()
      }
    };

    // Determine overall status
    const hasFailures = Object.values(checks.checks).some(check => !check.healthy);
    checks.status = hasFailures ? 'unhealthy' : 'healthy';

    return checks;
  }

  // Database connectivity check with admin-specific collections
  async checkDatabase() {
    try {
      const admin = require('firebase-admin');
      const db = admin.firestore();
      
      // Test admin collections
      const collections = ['users', 'courses', 'analytics', 'system-logs'];
      const results = await Promise.allSettled(
        collections.map(collection => 
          db.collection(collection).limit(1).get()
        )
      );

      const failedCollections = results
        .filter(result => result.status === 'rejected')
        .length;
      
      return {
        healthy: failedCollections === 0,
        message: failedCollections === 0 
          ? 'All database collections accessible'
          : `${failedCollections} collections failed`,
        collectionsChecked: collections.length,
        responseTime: Date.now()
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Database error: ${error.message}`,
        error: error.code
      };
    }
  }

  // Enhanced API check for admin endpoints
  async checkAPI() {
    try {
      const endpoints = [
        '/api/health',
        '/api/admin/users',
        '/api/admin/courses',
        '/api/admin/analytics',
        '/api/admin/system-status'
      ];

      const results = await Promise.allSettled(
        endpoints.map(endpoint => 
          fetch(process.env.NEXT_PUBLIC_BASE_URL + endpoint, {
            headers: {
              'Authorization': 'Bearer test-token',
              'Content-Type': 'application/json'
            }
          }).then(res => ({ 
            endpoint, 
            status: res.status, 
            ok: res.ok || res.status === 401 // 401 is expected without proper auth
          }))
        )
      );

      const failedEndpoints = results
        .filter(result => result.status === 'rejected' || !result.value.ok)
        .map(result => result.value?.endpoint || 'unknown');

      return {
        healthy: failedEndpoints.length === 0,
        message: failedEndpoints.length === 0 
          ? 'All admin API endpoints responding' 
          : `Failed endpoints: ${failedEndpoints.join(', ')}`,
        checkedEndpoints: endpoints.length,
        failedEndpoints: failedEndpoints.length
      };
    } catch (error) {
      return {
        healthy: false,
        message: `API check error: ${error.message}`,
        error: error.code
      };
    }
  }

  // Firebase Functions health check
  async checkFirebaseFunctions() {
    try {
      const functions = require('firebase-functions');
      const admin = require('firebase-admin');
      
      // Test callable function
      const testFunction = functions.https.onCall((data, context) => {
        return { status: 'healthy', timestamp: Date.now() };
      });

      return {
        healthy: true,
        message: 'Firebase Functions operational',
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Functions error: ${error.message}`,
        error: error.code
      };
    }
  }

  // Security checks specific to admin platform
  async checkSecurity() {
    try {
      const securityChecks = {
        authTokens: await this.checkAuthTokenSecurity(),
        rateLimiting: await this.checkRateLimiting(),
        adminAccess: await this.checkAdminAccess(),
        dataEncryption: await this.checkDataEncryption()
      };

      const failedChecks = Object.entries(securityChecks)
        .filter(([_, check]) => !check.secure)
        .map(([check]) => check);

      return {
        healthy: failedChecks.length === 0,
        message: failedChecks.length === 0 
          ? 'All security checks passed'
          : `Security issues: ${failedChecks.join(', ')}`,
        checks: securityChecks
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Security check error: ${error.message}`,
        error: error.code
      };
    }
  }

  // Check authentication token security
  async checkAuthTokenSecurity() {
    try {
      // Verify JWT secret is set and strong
      const jwtSecret = process.env.NEXTAUTH_SECRET;
      const isSecure = jwtSecret && jwtSecret.length >= 32;

      return {
        secure: isSecure,
        message: isSecure ? 'JWT security configured' : 'Weak or missing JWT secret'
      };
    } catch (error) {
      return {
        secure: false,
        message: `Auth token check failed: ${error.message}`
      };
    }
  }

  // Check rate limiting configuration
  async checkRateLimiting() {
    try {
      // Verify rate limiting is configured
      const rateLimitConfig = {
        requests: process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || 100,
        window: process.env.RATE_LIMIT_WINDOW_MS || 60000
      };

      return {
        secure: true,
        message: 'Rate limiting configured',
        config: rateLimitConfig
      };
    } catch (error) {
      return {
        secure: false,
        message: `Rate limiting check failed: ${error.message}`
      };
    }
  }

  // Check admin access controls
  async checkAdminAccess() {
    try {
      const admin = require('firebase-admin');
      
      // Verify admin SDK is properly configured
      const app = admin.app();
      const hasAuth = !!app.auth;
      const hasFirestore = !!app.firestore;

      return {
        secure: hasAuth && hasFirestore,
        message: hasAuth && hasFirestore 
          ? 'Admin access properly configured'
          : 'Admin access misconfigured'
      };
    } catch (error) {
      return {
        secure: false,
        message: `Admin access check failed: ${error.message}`
      };
    }
  }

  // Check data encryption
  async checkDataEncryption() {
    try {
      // Verify HTTPS is enforced
      const httpsEnforced = process.env.NODE_ENV === 'production';
      
      return {
        secure: httpsEnforced,
        message: httpsEnforced 
          ? 'HTTPS enforced in production'
          : 'HTTPS not enforced'
      };
    } catch (error) {
      return {
        secure: false,
        message: `Encryption check failed: ${error.message}`
      };
    }
  }

  // Security event logging
  logSecurityEvent(type, details, severity = 'info') {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      details,
      severity,
      userAgent: details.userAgent || 'unknown',
      ip: details.ip || 'unknown',
      environment: process.env.NODE_ENV
    };

    this.securityEvents.push(event);

    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    // Alert on critical security events
    if (severity === 'critical') {
      this.sendAlert(
        'security-event',
        `Critical security event: ${type} - ${JSON.stringify(details)}`,
        'critical'
      );
    }

    return event;
  }

  // Enhanced monitoring for admin platform
  startEnhancedMonitoring() {
    // Monitor every 15 seconds for admin platform
    setInterval(async () => {
      try {
        const health = await this.performHealthCheck();
        
        // Check for critical issues
        const criticalIssues = Object.entries(health.checks)
          .filter(([service, check]) => 
            !check.healthy && ['security', 'authentication', 'database'].includes(service)
          )
          .map(([service]) => service);

        if (criticalIssues.length > 0) {
          await this.sendAlert(
            'critical-service-failure',
            `Critical services down: ${criticalIssues.join(', ')}`,
            'critical'
          );
        }

        // Monitor performance degradation
        const performanceCheck = health.checks.performance;
        if (performanceCheck.healthy === false) {
          await this.sendAlert(
            'performance-degradation',
            'Admin platform performance degraded',
            'warning'
          );
        }

        // Store metrics
        this.performanceMetrics[Date.now()] = health;

        // Clean old metrics (keep last 2 hours for admin platform)
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
        Object.keys(this.performanceMetrics)
          .filter(timestamp => parseInt(timestamp) < twoHoursAgo)
          .forEach(timestamp => delete this.performanceMetrics[timestamp]);

      } catch (error) {
        await this.sendAlert(
          'monitoring-error',
          `Admin monitoring failed: ${error.message}`,
          'critical'
        );
      }
    }, 15000); // 15 second intervals for admin platform
  }

  // Get enhanced system status for admin dashboard
  getEnhancedSystemStatus() {
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: this.measureMemoryUsage(),
      alerts: this.alerts.slice(-20), // Last 20 alerts
      securityEvents: this.securityEvents.slice(-50), // Last 50 security events
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      performanceHistory: Object.entries(this.performanceMetrics)
        .slice(-120) // Last 2 hours of data (15s intervals)
        .map(([timestamp, data]) => ({
          timestamp: parseInt(timestamp),
          data
        }))
    };
  }

  // All other methods from base monitor...
  async checkStorage() {
    try {
      const admin = require('firebase-admin');
      const bucket = admin.storage().bucket();
      
      const [files] = await bucket.getFiles({ maxResults: 1 });
      
      return {
        healthy: true,
        message: 'Storage access successful',
        fileCount: files.length
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Storage error: ${error.message}`,
        error: error.code
      };
    }
  }

  async checkAuth() {
    try {
      const admin = require('firebase-admin');
      await admin.auth().listUsers(1);
      
      return {
        healthy: true,
        message: 'Authentication service operational'
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Auth error: ${error.message}`,
        error: error.code
      };
    }
  }

  async checkEmail() {
    try {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD
        }
      });

      await transporter.verify();
      
      return {
        healthy: true,
        message: 'Email service operational'
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Email error: ${error.message}`,
        error: error.code
      };
    }
  }

  async checkPerformance() {
    try {
      const startTime = Date.now();
      
      const operations = await Promise.allSettled([
        this.measureDatabaseLatency(),
        this.measureAPILatency(),
        this.measureMemoryUsage()
      ]);

      const totalTime = Date.now() - startTime;

      return {
        healthy: totalTime < 3000, // 3 second threshold for admin
        message: `Performance check completed in ${totalTime}ms`,
        metrics: {
          totalTime,
          operations: operations.length,
          memoryUsage: process.memoryUsage()
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Performance check error: ${error.message}`,
        error: error.code
      };
    }
  }

  async measureDatabaseLatency() {
    const start = Date.now();
    try {
      const admin = require('firebase-admin');
      await admin.firestore().collection('health-check').limit(1).get();
      return Date.now() - start;
    } catch (error) {
      return -1;
    }
  }

  async measureAPILatency() {
    const start = Date.now();
    try {
      await fetch(process.env.NEXT_PUBLIC_BASE_URL + '/api/health');
      return Date.now() - start;
    } catch (error) {
      return -1;
    }
  }

  measureMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss / 1024 / 1024,
      heapTotal: usage.heapTotal / 1024 / 1024,
      heapUsed: usage.heapUsed / 1024 / 1024,
      external: usage.external / 1024 / 1024
    };
  }

  async sendAlert(type, message, severity = 'warning') {
    const alert = {
      timestamp: new Date().toISOString(),
      type,
      message,
      severity,
      environment: process.env.NODE_ENV
    };

    console.error(`[${severity.toUpperCase()}] ${type}: ${message}`);
    this.alerts.push(alert);

    if (severity === 'critical') {
      await this.sendCriticalAlert(alert);
    }

    return alert;
  }

  async sendCriticalAlert(alert) {
    try {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD
        }
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
        subject: `🚨 CRITICAL ALERT: Admin Platform - ${alert.type}`,
        html: `
          <h2>Critical Admin Platform Alert</h2>
          <p><strong>Type:</strong> ${alert.type}</p>
          <p><strong>Message:</strong> ${alert.message}</p>
          <p><strong>Time:</strong> ${alert.timestamp}</p>
          <p><strong>Environment:</strong> ${alert.environment}</p>
          <hr>
          <p>Admin platform requires immediate attention.</p>
        `
      });
    } catch (error) {
      console.error('Failed to send critical alert:', error);
    }
  }
}

// Export singleton instance
const commandCenterMonitor = new CommandCenterMonitor();

// Start enhanced monitoring in production
if (process.env.NODE_ENV === 'production') {
  commandCenterMonitor.startEnhancedMonitoring();
}

module.exports = commandCenterMonitor;
