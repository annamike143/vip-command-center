// --- src/app/components/Login.js ---
'use client';
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../lib/firebase';
import FirebaseTest from './FirebaseTest';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); 
        setLoading(true);
        
        console.log('Attempting login with:', { email, passwordLength: password.length });
        console.log('Firebase config check:', {
            hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        });
        
        try { 
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('Login successful:', userCredential.user.email);
        } catch (err) { 
            console.error('Login error details:', {
                code: err.code,
                message: err.message,
                customData: err.customData
            });
            
            // Provide specific error messages
            let errorMessage = 'Login failed. ';
            switch (err.code) {
                case 'auth/user-not-found':
                    errorMessage += 'No account found with this email address.';
                    break;
                case 'auth/wrong-password':
                    errorMessage += 'Incorrect password.';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Invalid email address format.';
                    break;
                case 'auth/user-disabled':
                    errorMessage += 'This account has been disabled.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage += 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage += 'Network error. Please check your connection.';
                    break;
                case 'auth/invalid-credential':
                    errorMessage += 'Invalid credentials provided.';
                    break;
                default:
                    errorMessage += `Error: ${err.code} - ${err.message}`;
            }
            setError(errorMessage);
        }
        setLoading(false);
    };

    return (
        <div className="login-container">
            <div className="login-box">
                {/* The new Logo component will go here later */}
                <h1>Command Center</h1>
                <p>Sign in to manage your empire.</p>
                <form onSubmit={handleLogin}>
                    <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" className="login-button" disabled={loading}>{loading ? 'Signing In...' : 'Sign In'}</button>
                </form>
            </div>
            <FirebaseTest />
        </div>
    );
};
export default Login;