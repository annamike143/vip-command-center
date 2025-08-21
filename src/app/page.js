// --- src/app/page.js (SmartBot Strategic Color Implementation) ---
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from './lib/firebase';

// Import all components and views
import Login from './components/Login';
import StudentManagementDashboard from './components/StudentManagementDashboard';
import CourseBuilderModern from './components/CourseBuilderModern';
import VipManager from './views/VipManager';
import EnhancedMentorshipInbox from './views/EnhancedMentorshipInbox';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { goToLearningRealm } from './shared/navigation/cross-system';
import { initializeAnalytics, trackPageView, trackUserInteraction } from './shared/analytics/analytics';
import SEOHead, { seoConfigs, generateAdminAppStructuredData } from './shared/components/SEOHead';

// Import all necessary stylesheets
import './components/Login.css';
import './components/StudentManagementDashboard.css';
import './components/CourseBuilderModern.css';
import './views/VipManager.css';
import './views/EnhancedMentorshipInbox.css';
import './globals.css';

// This is the main, fully-featured dashboard component
const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('students'); // Default to Student Management

    const handleSignOut = () => {
        signOut(auth).catch(error => console.error("Sign out error", error));
    };
    
    // Get SEO config based on active tab
    const getSEOConfig = (tab) => {
        switch (tab) {
            case 'students': return seoConfigs.students;
            case 'analytics': return seoConfigs.analytics;
            case 'inbox': return seoConfigs.inbox;
            default: return seoConfigs.dashboard;
        }
    };

    return (
        <div className="dashboard-shell">
            <SEOHead 
                {...getSEOConfig(activeTab)}
                structuredData={generateAdminAppStructuredData()}
            />
            <header className="dashboard-header">
                <h1>Command Center</h1>
                <div className="header-actions">
                    <button 
                        onClick={() => goToLearningRealm()} 
                        className="nav-button"
                        title="Go to Learning Portal"
                    >
                        🎓 Learning Portal
                    </button>
                    <button onClick={handleSignOut} className="signout-button">Sign Out</button>
                </div>
            </header>
            <nav className="main-nav">
                <button className={activeTab === 'students' ? 'active' : ''} onClick={() => setActiveTab('students')}>Student Management</button>
                <button className={activeTab === 'inbox' ? 'active' : ''} onClick={() => setActiveTab('inbox')}>Mentorship Inbox</button>
                <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>Analytics</button>
            </nav>
            <main className="main-content">
                {activeTab === 'students' && <VipManager />}
                {activeTab === 'inbox' && <EnhancedMentorshipInbox />}
                {activeTab === 'analytics' && <AnalyticsDashboard />}
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
      
      // Initialize analytics for admin users
      if (user) {
        initializeAnalytics(user.uid, 'admin');
        trackPageView('/', 'Command Center');
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', color: '#666'}}>Loading...</div>;

  return user ? <Dashboard /> : <Login />;
}