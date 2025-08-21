// --- Offline Page for VIP Command Center ---
'use client';

import { useEffect, useState } from 'react';

export default function AdminOfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      window.location.reload();
    }
  }, [isOnline]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#0f172a',
      color: '#e2e8f0'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '500px',
        background: '#1e293b',
        padding: '3rem',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #334155'
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem'
        }}>
          ⚡
        </div>
        
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          marginBottom: '1rem',
          color: '#f1f5f9'
        }}>
          Admin Panel Offline
        </h1>
        
        <p style={{
          fontSize: '1.1rem',
          marginBottom: '2rem',
          color: '#94a3b8',
          lineHeight: '1.6'
        }}>
          The command center requires an active internet connection. Please check your network and try again.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            backgroundColor: isOnline ? '#064e3b' : '#451a03',
            borderRadius: '8px',
            fontWeight: '500',
            color: isOnline ? '#6ee7b7' : '#fed7aa',
            border: `1px solid ${isOnline ? '#047857' : '#ea580c'}`
          }}>
            <span style={{ fontSize: '1.2rem' }}>
              {isOnline ? '🟢' : '🔴'}
            </span>
            {isOnline ? 'Connection restored! Reloading...' : 'Connection status: Offline'}
          </div>

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
          >
            Retry Connection
          </button>
        </div>

        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#374151',
          borderRadius: '8px',
          fontSize: '0.9rem',
          color: '#d1d5db',
          border: '1px solid #4b5563'
        }}>
          <strong>⚠️ Admin Notice:</strong> All administrative functions require real-time connectivity for security and data integrity.
        </div>
      </div>
    </div>
  );
}
