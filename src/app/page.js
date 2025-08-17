// --- src/app/page.js (THE DEFINITIVE FINAL VERSION) ---
'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from './lib/firebase';

// Import all components and views
import Login from './components/Login';
import VipManager from './views/VipManager';
import CourseBuilder from './views/CourseBuilder';
import MentorshipInbox from './views/MentorshipInbox';

// Import all necessary stylesheets
import './components/Login.css';
import './views/VipManager.css';
import './views/CourseBuilder.css';
import './views/MentorshipInbox.css';

// This is the main, fully-featured dashboard component
const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('students'); // Default to Student Management

    const handleSignOut = () => {
        signOut(auth).catch(error => console.error("Sign out error", error));
    };

    return (
        <div className="dashboard-shell">
            <header className="dashboard-header">
                <h1>Command Center</h1>
                <button onClick={handleSignOut} className="signout-button">Sign Out</button>
            </header>
            <nav className="main-nav">
                <button className={activeTab === 'students' ? 'active' : ''} onClick={() => setActiveTab('students')}>Student Management</button>
                <button className={activeTab === 'courses' ? 'active' : ''} onClick={() => setActiveTab('courses')}>Course Builder</button>
                <button className={activeTab === 'inbox' ? 'active' : ''} onClick={() => setActiveTab('inbox')}>Mentorship Inbox</button>
            </nav>
            <main className="main-content">
                {activeTab === 'students' && <VipManager />}
                {activeTab === 'courses' && <CourseBuilder />}
                {activeTab === 'inbox' && <MentorshipInbox />}
            </main>
        </div>
    );
};

// This is the main page component that decides to show Login or Dashboard
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