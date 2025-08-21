// --- Centralized Error Handling System ---
'use client';

import React, { createContext, useContext, useState } from 'react';

// Error types
export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  VALIDATION: 'VALIDATION',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

// Error handler context
const ErrorContext = createContext();

export function ErrorProvider({ children }) {
  const [errors, setErrors] = useState([]);
  const [isOnline, setIsOnline] = useState(true);

  // Add error to the stack
  const addError = (error) => {
    const errorObj = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      ...error
    };
    
    setErrors(prev => [...prev, errorObj]);
    
    // Auto-remove low severity errors after 5 seconds
    if (error.severity === ERROR_SEVERITY.LOW) {
      setTimeout(() => {
        removeError(errorObj.id);
      }, 5000);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error added:', errorObj);
    }
    
    // Send to monitoring service
    logToService(errorObj);
    
    return errorObj.id;
  };

  // Remove error from stack
  const removeError = (id) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  };

  // Clear all errors
  const clearErrors = () => {
    setErrors([]);
  };

  // Log error to external service
  const logToService = async (error) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...error,
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: error.userId || 'anonymous'
          })
        });
      }
    } catch (err) {
      console.error('Failed to log error to service:', err);
    }
  };

  // Network status handling
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      addError({
        type: ERROR_TYPES.NETWORK,
        severity: ERROR_SEVERITY.MEDIUM,
        title: 'Connection Lost',
        message: 'You appear to be offline. Some features may not work properly.',
        action: 'retry'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const value = {
    errors,
    isOnline,
    addError,
    removeError,
    clearErrors
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

// Error boundary hook
export function useErrorBoundary() {
  const { addError } = useError();

  const captureError = (error, errorInfo = {}) => {
    addError({
      type: ERROR_TYPES.UNKNOWN,
      severity: ERROR_SEVERITY.HIGH,
      title: 'Application Error',
      message: error.message || 'An unexpected error occurred',
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      action: 'reload'
    });
  };

  return { captureError };
}

// API error handler
export function handleApiError(error, context = {}) {
  const { addError } = useError();
  
  let errorType = ERROR_TYPES.UNKNOWN;
  let severity = ERROR_SEVERITY.MEDIUM;
  let title = 'Error';
  let message = 'An error occurred';

  // Determine error type and severity based on status code
  if (error.response) {
    const status = error.response.status;
    
    switch (status) {
      case 400:
        errorType = ERROR_TYPES.VALIDATION;
        severity = ERROR_SEVERITY.LOW;
        title = 'Invalid Request';
        message = 'Please check your input and try again.';
        break;
      case 401:
        errorType = ERROR_TYPES.AUTHENTICATION;
        severity = ERROR_SEVERITY.HIGH;
        title = 'Authentication Required';
        message = 'Please log in to continue.';
        break;
      case 403:
        errorType = ERROR_TYPES.AUTHORIZATION;
        severity = ERROR_SEVERITY.MEDIUM;
        title = 'Access Denied';
        message = 'You do not have permission to perform this action.';
        break;
      case 404:
        errorType = ERROR_TYPES.NETWORK;
        severity = ERROR_SEVERITY.LOW;
        title = 'Not Found';
        message = 'The requested resource was not found.';
        break;
      case 429:
        errorType = ERROR_TYPES.NETWORK;
        severity = ERROR_SEVERITY.MEDIUM;
        title = 'Rate Limited';
        message = 'Too many requests. Please wait a moment and try again.';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorType = ERROR_TYPES.SERVER;
        severity = ERROR_SEVERITY.HIGH;
        title = 'Server Error';
        message = 'A server error occurred. Please try again later.';
        break;
      default:
        errorType = ERROR_TYPES.NETWORK;
        severity = ERROR_SEVERITY.MEDIUM;
        title = 'Network Error';
        message = 'A network error occurred. Please check your connection.';
    }
  } else if (error.request) {
    errorType = ERROR_TYPES.NETWORK;
    severity = ERROR_SEVERITY.HIGH;
    title = 'Network Error';
    message = 'Unable to connect to the server. Please check your internet connection.';
  }

  return addError({
    type: errorType,
    severity,
    title,
    message,
    originalError: error,
    context,
    action: severity === ERROR_SEVERITY.HIGH ? 'retry' : null
  });
}

// Firebase error handler
export function handleFirebaseError(error, context = {}) {
  const { addError } = useError();
  
  let title = 'Database Error';
  let message = 'A database error occurred';
  let severity = ERROR_SEVERITY.MEDIUM;

  // Handle specific Firebase error codes
  switch (error.code) {
    case 'permission-denied':
      title = 'Permission Denied';
      message = 'You do not have permission to access this data.';
      severity = ERROR_SEVERITY.MEDIUM;
      break;
    case 'unavailable':
      title = 'Service Unavailable';
      message = 'The database service is temporarily unavailable.';
      severity = ERROR_SEVERITY.HIGH;
      break;
    case 'network-request-failed':
      title = 'Network Error';
      message = 'Network connection failed. Please check your connection.';
      severity = ERROR_SEVERITY.HIGH;
      break;
    case 'quota-exceeded':
      title = 'Usage Limit Exceeded';
      message = 'Database usage limit exceeded. Please try again later.';
      severity = ERROR_SEVERITY.CRITICAL;
      break;
    default:
      message = error.message || 'An unknown database error occurred.';
  }

  return addError({
    type: ERROR_TYPES.SERVER,
    severity,
    title,
    message,
    originalError: error,
    context,
    action: 'retry'
  });
}

// OpenAI error handler
export function handleOpenAIError(error, context = {}) {
  const { addError } = useError();
  
  let title = 'AI Service Error';
  let message = 'The AI service encountered an error';
  let severity = ERROR_SEVERITY.MEDIUM;

  if (error.response) {
    const status = error.response.status;
    
    switch (status) {
      case 401:
        title = 'API Key Error';
        message = 'Invalid API key for AI service.';
        severity = ERROR_SEVERITY.CRITICAL;
        break;
      case 429:
        title = 'Rate Limited';
        message = 'AI service rate limit exceeded. Please wait a moment.';
        severity = ERROR_SEVERITY.MEDIUM;
        break;
      case 500:
        title = 'AI Service Error';
        message = 'The AI service is temporarily unavailable.';
        severity = ERROR_SEVERITY.HIGH;
        break;
    }
  }

  return addError({
    type: ERROR_TYPES.SERVER,
    severity,
    title,
    message,
    originalError: error,
    context,
    action: severity === ERROR_SEVERITY.HIGH ? 'retry' : null
  });
}

// Error notification component
export function ErrorNotifications() {
  const { errors, removeError } = useError();

  if (errors.length === 0) return null;

  return (
    <div className="error-notifications">
      {errors.map(error => (
        <ErrorNotification
          key={error.id}
          error={error}
          onClose={() => removeError(error.id)}
        />
      ))}
    </div>
  );
}

function ErrorNotification({ error, onClose }) {
  const getSeverityClass = (severity) => {
    switch (severity) {
      case ERROR_SEVERITY.LOW: return 'error-low';
      case ERROR_SEVERITY.MEDIUM: return 'error-medium';
      case ERROR_SEVERITY.HIGH: return 'error-high';
      case ERROR_SEVERITY.CRITICAL: return 'error-critical';
      default: return 'error-medium';
    }
  };

  const handleAction = () => {
    switch (error.action) {
      case 'retry':
        window.location.reload();
        break;
      case 'reload':
        window.location.reload();
        break;
      default:
        onClose();
    }
  };

  return (
    <div className={`error-notification ${getSeverityClass(error.severity)}`}>
      <div className="error-content">
        <h4 className="error-title">{error.title}</h4>
        <p className="error-message">{error.message}</p>
        {error.action && (
          <button 
            className="error-action-btn" 
            onClick={handleAction}
          >
            {error.action === 'retry' ? 'Retry' : 'Reload'}
          </button>
        )}
      </div>
      <button className="error-close" onClick={onClose}>×</button>
    </div>
  );
}

// Async error handler wrapper
export function withErrorHandling(asyncFunction, context = {}) {
  return async (...args) => {
    try {
      return await asyncFunction(...args);
    } catch (error) {
      // Determine appropriate error handler based on error type
      if (error.code && error.code.startsWith('auth/')) {
        handleFirebaseError(error, context);
      } else if (error.response && error.config?.url?.includes('openai')) {
        handleOpenAIError(error, context);
      } else {
        handleApiError(error, context);
      }
      throw error; // Re-throw so calling code can handle if needed
    }
  };
}

// Error helper utilities
export const errorUtils = {
  // Check if error is retryable
  isRetryable: (error) => {
    const retryableCodes = [408, 429, 500, 502, 503, 504];
    return error.response && retryableCodes.includes(error.response.status);
  },

  // Get user-friendly error message
  getUserMessage: (error) => {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  },

  // Format error for logging
  formatForLogging: (error, context = {}) => {
    return {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context
    };
  }
};
