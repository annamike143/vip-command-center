// --- vip-command-center/src/app/components/ThemeManager.js ---
'use client';
import React, { useState, useEffect } from 'react';
import { ref, set, onValue } from 'firebase/database';
import { database } from '../lib/firebase';
import './ThemeManager.css';

// Theme presets for the command center
const THEME_PRESETS = {
    classic: {
        name: 'Classic Red',
        primary: '#CC0000',
        primaryHover: '#a30000',
        primaryLight: '#ff4444',
        secondary: '#6b7280',
        accent: '#22c55e',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#111827',
        textSecondary: '#6b7280',
        border: '#e5e7eb',
        gradient: 'linear-gradient(135deg, #CC0000, #ff4444)',
        logoBackground: 'linear-gradient(135deg, #CC0000, #ff4444)',
    },
    ocean: {
        name: 'Ocean Blue',
        primary: '#0ea5e9',
        primaryHover: '#0284c7',
        primaryLight: '#38bdf8',
        secondary: '#64748b',
        accent: '#10b981',
        background: '#ffffff',
        surface: '#f1f5f9',
        text: '#0f172a',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
        logoBackground: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
    },
    forest: {
        name: 'Forest Green',
        primary: '#059669',
        primaryHover: '#047857',
        primaryLight: '#10b981',
        secondary: '#6b7280',
        accent: '#f59e0b',
        background: '#ffffff',
        surface: '#f0fdf4',
        text: '#064e3b',
        textSecondary: '#6b7280',
        border: '#d1fae5',
        gradient: 'linear-gradient(135deg, #059669, #10b981)',
        logoBackground: 'linear-gradient(135deg, #059669, #10b981)',
    },
    purple: {
        name: 'Royal Purple',
        primary: '#7c3aed',
        primaryHover: '#6d28d9',
        primaryLight: '#8b5cf6',
        secondary: '#6b7280',
        accent: '#f59e0b',
        background: '#ffffff',
        surface: '#faf5ff',
        text: '#3730a3',
        textSecondary: '#6b7280',
        border: '#e9d5ff',
        gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
        logoBackground: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
    },
    sunset: {
        name: 'Sunset Orange',
        primary: '#ea580c',
        primaryHover: '#dc2626',
        primaryLight: '#f97316',
        secondary: '#6b7280',
        accent: '#eab308',
        background: '#ffffff',
        surface: '#fff7ed',
        text: '#9a3412',
        textSecondary: '#6b7280',
        border: '#fed7aa',
        gradient: 'linear-gradient(135deg, #ea580c, #f97316)',
        logoBackground: 'linear-gradient(135deg, #ea580c, #f97316)',
    },
    dark: {
        name: 'Dark Mode',
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        primaryLight: '#60a5fa',
        secondary: '#9ca3af',
        accent: '#10b981',
        background: '#111827',
        surface: '#1f2937',
        text: '#f9fafb',
        textSecondary: '#d1d5db',
        border: '#374151',
        gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
        logoBackground: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    }
};

export default function ThemeManager({ courseId, onClose }) {
    const [activeTab, setActiveTab] = useState('presets');
    const [currentTheme, setCurrentTheme] = useState(THEME_PRESETS.classic);
    const [selectedPreset, setSelectedPreset] = useState('classic'); // Track selected preset
    const [loading, setLoading] = useState(true); // Add loading state
    const [branding, setBranding] = useState({
        logoText: 'MS',
        academyName: 'Mike Salazar Academy',
        brandName: 'Mike Salazar Academy', // New field for footer branding
        poweredByText: 'VIP Learning Platform', // Customizable "Powered by" text
        logoUrl: '',
        instructorMessage: '',
        instructor: {
            name: 'Mike Salazar',
            title: 'Chief Instructor',
            bio: 'Passionate educator with 10+ years of experience in technology and business.',
            avatarUrl: '',
            email: '',
            phone: ''
        },
        socialLinks: {
            // Flexible social media with enabled/disabled states
            facebook: { url: '', enabled: false },
            instagram: { url: '', enabled: false },
            tiktok: { url: '', enabled: false },
            youtube: { url: '', enabled: false },
            linkedin: { url: '', enabled: false },
            twitter: { url: '', enabled: false },
            pinterest: { url: '', enabled: false },
            website: { url: '', enabled: false }
        }
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!courseId) return;

        // Load existing theme settings
        const themeRef = ref(database, `courses/${courseId}/theme`);
        const brandingRef = ref(database, `courses/${courseId}/branding`);

        const unsubTheme = onValue(themeRef, (snapshot) => {
            const themeData = snapshot.val();
            if (themeData && themeData.preset && THEME_PRESETS[themeData.preset]) {
                setCurrentTheme(THEME_PRESETS[themeData.preset]);
                setSelectedPreset(themeData.preset); // Track the current preset
            } else {
                // Default to classic theme if no theme data exists
                setSelectedPreset('classic');
                setCurrentTheme(THEME_PRESETS.classic);
            }
            setLoading(false); // Theme data loaded
        });

        const unsubBranding = onValue(brandingRef, (snapshot) => {
            const brandingData = snapshot.val();
            if (brandingData) {
                setBranding(prev => ({ ...prev, ...brandingData }));
            }
        });

        return () => {
            unsubTheme();
            unsubBranding();
        };
    }, [courseId]);

    const handlePresetSelect = async (presetKey) => {
        setSaving(true);
        try {
            const themeRef = ref(database, `courses/${courseId}/theme`);
            await set(themeRef, {
                preset: presetKey,
                updatedAt: new Date().toISOString()
            });
            
            setCurrentTheme(THEME_PRESETS[presetKey]);
            setSelectedPreset(presetKey); // Update selected preset state
            
            // Better success feedback
            const themeAppliedEvent = new CustomEvent('themeChanged', { 
                detail: { preset: presetKey, theme: THEME_PRESETS[presetKey] } 
            });
            window.dispatchEvent(themeAppliedEvent);
            
            alert(`🎨 ${THEME_PRESETS[presetKey].name} theme applied successfully! Changes are visible on the frontend.`);
        } catch (error) {
            console.error('Error updating theme:', error);
            alert('Error updating theme. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleBrandingSave = async () => {
        setSaving(true);
        try {
            const brandingRef = ref(database, `courses/${courseId}/branding`);
            await set(brandingRef, {
                ...branding,
                updatedAt: new Date().toISOString()
            });
            
            alert('Branding updated successfully!');
        } catch (error) {
            console.error('Error updating branding:', error);
            alert('Error updating branding. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="theme-manager-overlay">
            <div className="theme-manager">
                <div className="manager-header">
                    <h2>🎨 Course Theme & Branding</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="manager-tabs">
                    <button 
                        className={`tab ${activeTab === 'presets' ? 'active' : ''}`}
                        onClick={() => setActiveTab('presets')}
                    >
                        Theme Presets
                    </button>
                    <button 
                        className={`tab ${activeTab === 'branding' ? 'active' : ''}`}
                        onClick={() => setActiveTab('branding')}
                    >
                        Branding
                    </button>
                </div>

                <div className="manager-content">
                    {loading ? (
                        <div className="theme-loading">
                            <div className="loading-spinner"></div>
                            <p>Loading theme settings...</p>
                        </div>
                    ) : (
                    <>
                    {activeTab === 'presets' && (
                        <div className="presets-section">
                            <h3>Choose a Theme Preset</h3>
                            <p>Select a color scheme that matches your brand. Changes will be applied to your course frontend immediately.</p>
                            
                            {/* Current Theme Display */}
                            <div className="current-theme-display">
                                <div className="theme-header">
                                    <h4>🎨 Current Theme: {THEME_PRESETS[selectedPreset]?.name || 'Classic Red'}</h4>
                                    <button 
                                        className="test-live-btn"
                                        onClick={() => window.open('http://localhost:3001', '_blank')}
                                    >
                                        🚀 Test Live
                                    </button>
                                </div>
                                <div className="current-theme-preview">
                                    <div 
                                        className="mini-preview"
                                        style={{
                                            background: currentTheme.gradient,
                                            border: `2px solid ${currentTheme.border}`
                                        }}
                                    >
                                        <div className="mini-logo" style={{ background: currentTheme.logoBackground }}></div>
                                        <div className="mini-bar" style={{ background: currentTheme.primary }}></div>
                                    </div>
                                    <div className="theme-details">
                                        <span>Primary: {currentTheme.primary}</span>
                                        <span>Background: {currentTheme.background}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="presets-grid">{/* Presets grid content */}
                                {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                                    <div key={key} className={`preset-card ${selectedPreset === key ? 'active' : ''}`}>
                                        <div 
                                            className="preset-preview"
                                            style={{
                                                background: preset.gradient,
                                                border: `2px solid ${preset.border}`
                                            }}
                                        >
                                            <div className="preview-logo" style={{ background: preset.logoBackground }}></div>
                                            <div className="preview-bar" style={{ background: preset.primary }}></div>
                                        </div>
                                        <h4>{preset.name}</h4>
                                        <button 
                                            className={`apply-btn ${selectedPreset === key ? 'selected' : ''}`}
                                            onClick={() => handlePresetSelect(key)}
                                            disabled={saving}
                                            style={{ background: selectedPreset === key ? '#10b981' : preset.primary }}
                                        >
                                            {selectedPreset === key ? '✓ Current Theme' : (saving ? 'Applying...' : 'Apply Theme')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'branding' && (
                        <div className="branding-section">
                            <h3>Course Branding</h3>
                            <p>Customize your course branding and instructor information.</p>
                            
                            <div className="branding-form">
                                <div className="form-group">
                                    <label>Academy Name (Header Display)</label>
                                    <input
                                        type="text"
                                        value={branding.academyName}
                                        onChange={(e) => setBranding(prev => ({ ...prev, academyName: e.target.value }))}
                                        placeholder="Your Academy Name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Brand Name (Footer Copyright)</label>
                                    <input
                                        type="text"
                                        value={branding.brandName}
                                        onChange={(e) => setBranding(prev => ({ ...prev, brandName: e.target.value }))}
                                        placeholder="Brand name for footer (e.g., Mike Salazar Academy)"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Powered By Text</label>
                                    <input
                                        type="text"
                                        value={branding.poweredByText}
                                        onChange={(e) => setBranding(prev => ({ ...prev, poweredByText: e.target.value }))}
                                        placeholder="Platform name (e.g., VIP Learning Platform)"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Logo Text (2-3 characters)</label>
                                    <input
                                        type="text"
                                        value={branding.logoText}
                                        onChange={(e) => setBranding(prev => ({ ...prev, logoText: e.target.value.substring(0, 3) }))}
                                        placeholder="MS"
                                        maxLength="3"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Logo Image URL (optional)</label>
                                    <input
                                        type="url"
                                        value={branding.logoUrl}
                                        onChange={(e) => setBranding(prev => ({ ...prev, logoUrl: e.target.value }))}
                                        placeholder="https://example.com/logo.png"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Instructor Welcome Message</label>
                                    <textarea
                                        value={branding.instructorMessage}
                                        onChange={(e) => setBranding(prev => ({ ...prev, instructorMessage: e.target.value }))}
                                        placeholder="Welcome message for students..."
                                        rows="3"
                                    />
                                </div>

                                {/* Instructor Profile Section */}
                                <div className="form-section">
                                    <h4>Instructor Profile</h4>
                                    
                                    <div className="form-group">
                                        <label>Instructor Name</label>
                                        <input
                                            type="text"
                                            value={branding.instructor.name}
                                            onChange={(e) => setBranding(prev => ({ 
                                                ...prev, 
                                                instructor: { ...prev.instructor, name: e.target.value }
                                            }))}
                                            placeholder="John Doe"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Instructor Title</label>
                                        <input
                                            type="text"
                                            value={branding.instructor.title}
                                            onChange={(e) => setBranding(prev => ({ 
                                                ...prev, 
                                                instructor: { ...prev.instructor, title: e.target.value }
                                            }))}
                                            placeholder="Chief Instructor, CEO, etc."
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Instructor Bio</label>
                                        <textarea
                                            value={branding.instructor.bio}
                                            onChange={(e) => setBranding(prev => ({ 
                                                ...prev, 
                                                instructor: { ...prev.instructor, bio: e.target.value }
                                            }))}
                                            placeholder="Brief bio about the instructor..."
                                            rows="3"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Instructor Avatar URL (optional)</label>
                                        <input
                                            type="url"
                                            value={branding.instructor.avatarUrl}
                                            onChange={(e) => setBranding(prev => ({ 
                                                ...prev, 
                                                instructor: { ...prev.instructor, avatarUrl: e.target.value }
                                            }))}
                                            placeholder="https://example.com/avatar.jpg"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Contact Email (optional)</label>
                                        <input
                                            type="email"
                                            value={branding.instructor.email}
                                            onChange={(e) => setBranding(prev => ({ 
                                                ...prev, 
                                                instructor: { ...prev.instructor, email: e.target.value }
                                            }))}
                                            placeholder="instructor@example.com"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Contact Phone (optional)</label>
                                        <input
                                            type="tel"
                                            value={branding.instructor.phone}
                                            onChange={(e) => setBranding(prev => ({ 
                                                ...prev, 
                                                instructor: { ...prev.instructor, phone: e.target.value }
                                            }))}
                                            placeholder="+1 (555) 123-4567"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Social Links & Website</label>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                                        Enable and configure social media links. Only enabled links with URLs will display.
                                    </p>
                                    <div className="social-links-flexible">
                                        {Object.entries(branding.socialLinks).map(([platform, config]) => (
                                            <div key={platform} className="social-link-item">
                                                <div className="social-link-header">
                                                    <label className="checkbox-label">
                                                        <input
                                                            type="checkbox"
                                                            checked={config.enabled}
                                                            onChange={(e) => setBranding(prev => ({ 
                                                                ...prev, 
                                                                socialLinks: { 
                                                                    ...prev.socialLinks, 
                                                                    [platform]: { ...config, enabled: e.target.checked }
                                                                }
                                                            }))}
                                                        />
                                                        <span className="checkmark"></span>
                                                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                                                    </label>
                                                </div>
                                                {config.enabled && (
                                                    <input
                                                        type="url"
                                                        value={config.url}
                                                        onChange={(e) => setBranding(prev => ({ 
                                                            ...prev, 
                                                            socialLinks: { 
                                                                ...prev.socialLinks, 
                                                                [platform]: { ...config, url: e.target.value }
                                                            }
                                                        }))}
                                                        placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                                                        style={{ marginTop: '0.5rem' }}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    className="save-branding"
                                    onClick={handleBrandingSave}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save Branding'}
                                </button>
                            </div>
                        </div>
                    )}
                    </>
                    )}
                </div>
            </div>
        </div>
    );
}
