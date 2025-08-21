// Firebase Connection Test Component
'use client';
import { useState } from 'react';
import { auth } from '../lib/firebase';
import { connectAuthEmulator } from 'firebase/auth';

const FirebaseTest = () => {
    const [testResults, setTestResults] = useState(null);
    const [loading, setLoading] = useState(false);

    const runConnectionTest = async () => {
        setLoading(true);
        const results = {
            timestamp: new Date().toISOString(),
            tests: []
        };

        // Test 1: Environment Variables
        results.tests.push({
            name: 'Environment Variables',
            status: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'PASS' : 'FAIL',
            details: {
                hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
            }
        });

        // Test 2: Firebase Auth Instance
        try {
            const authInstance = auth;
            results.tests.push({
                name: 'Firebase Auth Instance',
                status: authInstance ? 'PASS' : 'FAIL',
                details: {
                    hasAuth: !!authInstance,
                    currentUser: authInstance?.currentUser?.email || 'None',
                    authReady: !!authInstance?.app
                }
            });
        } catch (error) {
            results.tests.push({
                name: 'Firebase Auth Instance',
                status: 'FAIL',
                error: error.message
            });
        }

        // Test 3: Firebase Connection
        try {
            // Try to get current user (non-destructive test)
            const user = auth.currentUser;
            results.tests.push({
                name: 'Firebase Connection',
                status: 'PASS',
                details: {
                    connected: true,
                    currentUser: user?.email || 'No user signed in',
                    authState: user ? 'Authenticated' : 'Not authenticated'
                }
            });
        } catch (error) {
            results.tests.push({
                name: 'Firebase Connection',
                status: 'FAIL',
                error: error.message
            });
        }

        setTestResults(results);
        setLoading(false);
    };

    return (
        <div style={{ 
            position: 'fixed', 
            bottom: '20px', 
            right: '20px', 
            background: 'white', 
            padding: '20px', 
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            maxWidth: '400px',
            zIndex: 1000
        }}>
            <h3>🔧 Firebase Debug Panel</h3>
            <button 
                onClick={runConnectionTest}
                disabled={loading}
                style={{
                    padding: '10px 20px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                {loading ? 'Testing...' : 'Run Connection Test'}
            </button>

            {testResults && (
                <div style={{ marginTop: '15px' }}>
                    <h4>Test Results:</h4>
                    {testResults.tests.map((test, index) => (
                        <div key={index} style={{ 
                            margin: '10px 0', 
                            padding: '10px', 
                            background: test.status === 'PASS' ? '#d4edda' : '#f8d7da',
                            borderRadius: '4px'
                        }}>
                            <strong>{test.name}: {test.status}</strong>
                            {test.details && (
                                <pre style={{ fontSize: '12px', marginTop: '5px' }}>
                                    {JSON.stringify(test.details, null, 2)}
                                </pre>
                            )}
                            {test.error && (
                                <div style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>
                                    Error: {test.error}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FirebaseTest;
