// --- src/app/page.js (VIP Command Center Shell) ---
'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from './lib/firebase';
import Login from './components/Login';
import './components/Login.css';

// A placeholder for our main dashboard component
const Dashboard = () => {
    const handleSignOut = () => { signOut(auth); };

    return (
        <div>
            <header style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}>
                <h1>Command Center</h1>
                {/* The Dark Mode switcher will go here */}
                <button onClick={handleSignOut} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Sign Out</button>
            </header>
            <div style={{ padding: '2rem' }}>
                <p>The Course Builder, Student Manager, and Mentorship Inbox will go here.</p>
            </div>
        </div>
    )
}

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>;
  }

  return (
    <div>
      {user ? <Dashboard /> : <Login />}
    </div>
  );
}