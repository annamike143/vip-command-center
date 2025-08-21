// --- Shared Loading Spinner Component ---
'use client';

import React from 'react';

const LoadingSpinner = ({ size = 'medium', message = 'Loading...', className = '' }) => {
    const sizeClasses = {
        small: 'w-4 h-4',
        medium: 'w-8 h-8', 
        large: 'w-12 h-12'
    };

    return (
        <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
            <div 
                className={`${sizeClasses[size]} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}
                style={{
                    borderColor: 'var(--color-border) var(--color-border) var(--color-primary) var(--color-border)',
                    animation: 'spin 1s linear infinite'
                }}
            ></div>
            {message && (
                <p 
                    className="mt-2 text-sm"
                    style={{ color: 'var(--color-textSecondary)' }}
                >
                    {message}
                </p>
            )}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default LoadingSpinner;
