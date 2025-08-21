// --- Shared Error Boundary Component ---
'use client';

import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
        
        // Log error to monitoring service
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        
        // You can also log the error to an error reporting service here
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'exception', {
                description: error.toString(),
                fatal: false
            });
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div 
                    className="error-boundary"
                    style={{
                        padding: 'var(--space-xl)',
                        textAlign: 'center',
                        backgroundColor: 'var(--color-surface)',
                        border: `1px solid var(--color-error)`,
                        borderRadius: '8px',
                        margin: 'var(--space-md)'
                    }}
                >
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>😞</div>
                    <h2 style={{ 
                        color: 'var(--color-error)', 
                        marginBottom: 'var(--space-md)',
                        fontFamily: 'var(--font-heading)'
                    }}>
                        Something went wrong
                    </h2>
                    <p style={{ 
                        color: 'var(--color-textSecondary)', 
                        marginBottom: 'var(--space-lg)',
                        maxWidth: '600px',
                        margin: '0 auto var(--space-lg) auto'
                    }}>
                        We apologize for the inconvenience. An unexpected error occurred while loading this page.
                    </p>
                    
                    <div style={{ 
                        display: 'flex', 
                        gap: 'var(--space-md)', 
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                    }}>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                padding: 'var(--space-sm) var(--space-md)',
                                backgroundColor: 'var(--color-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-body)'
                            }}
                        >
                            🔄 Reload Page
                        </button>
                        
                        <button
                            onClick={() => window.history.back()}
                            style={{
                                padding: 'var(--space-sm) var(--space-md)',
                                backgroundColor: 'transparent',
                                color: 'var(--color-textSecondary)',
                                border: `1px solid var(--color-border)`,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-body)'
                            }}
                        >
                            ← Go Back
                        </button>
                    </div>
                    
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details style={{ 
                            marginTop: 'var(--space-lg)',
                            textAlign: 'left',
                            padding: 'var(--space-md)',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px',
                            fontSize: '0.875rem'
                        }}>
                            <summary style={{ cursor: 'pointer', marginBottom: 'var(--space-sm)' }}>
                                🔍 Error Details (Development)
                            </summary>
                            <pre style={{ 
                                whiteSpace: 'pre-wrap',
                                color: '#dc3545',
                                fontFamily: 'monospace'
                            }}>
                                {this.state.error && this.state.error.toString()}
                                <br />
                                {this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
