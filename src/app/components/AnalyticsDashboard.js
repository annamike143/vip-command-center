// --- Analytics Dashboard Component ---
'use client';

import React, { useState, useEffect } from 'react';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { database } from '../lib/firebase';
import { getPerformanceSummary, getPerformanceStatus } from '../shared/monitoring/performance';
import LoadingSpinner from '../shared/components/LoadingSpinner';

const AnalyticsDashboard = () => {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [performanceData, setPerformanceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('7d'); // 1d, 7d, 30d
    const [activeMetric, setActiveMetric] = useState('overview');

    useEffect(() => {
        loadAnalyticsData();
        loadPerformanceData();
    }, [timeRange]);

    const loadAnalyticsData = async () => {
        try {
            // In a real implementation, this would fetch from your analytics service
            // For now, we'll simulate some data
            const mockData = {
                overview: {
                    totalUsers: 152,
                    activeUsers: 47,
                    newSignups: 12,
                    courseCompletions: 8,
                    avgSessionDuration: '24m 15s',
                    bounce_rate: 23.5
                },
                userEngagement: {
                    daily_active_users: [32, 45, 38, 52, 47, 39, 44],
                    session_duration: [18, 22, 25, 21, 24, 26, 23],
                    pages_per_session: [3.2, 4.1, 3.8, 4.5, 3.9, 4.2, 4.0]
                },
                learning: {
                    courses_started: 24,
                    lessons_completed: 186,
                    ai_interactions: 341,
                    unlock_codes_used: 28,
                    avg_completion_rate: 67.3
                },
                admin: {
                    users_created: 5,
                    courses_published: 2,
                    messages_sent: 15,
                    system_actions: 42
                }
            };
            
            setAnalyticsData(mockData);
        } catch (error) {
            console.error('Error loading analytics data:', error);
        }
    };

    const loadPerformanceData = () => {
        try {
            const summary = getPerformanceSummary();
            const status = getPerformanceStatus();
            
            setPerformanceData({
                summary,
                status,
                metrics: {
                    page_load_time: summary.PAGE_LOAD_TIME?.current || 0,
                    memory_usage: summary.MEMORY_USAGE?.current?.percentage || 0,
                    error_rate: 2.1, // Mock data
                    uptime: 99.8 // Mock data
                }
            });
        } catch (error) {
            console.error('Error loading performance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (ms) => {
        if (!ms) return '0ms';
        if (ms < 1000) return `${Math.round(ms)}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    const formatPercentage = (value) => {
        return `${(value || 0).toFixed(1)}%`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'good': return '#16A34A';
            case 'needs-improvement': return '#F59E0B';
            case 'poor': return '#EF4444';
            default: return '#6B7280';
        }
    };

    if (loading) {
        return <LoadingSpinner message="Loading analytics..." />;
    }

    return (
        <div className="analytics-dashboard">
            <div className="dashboard-header">
                <h2>📊 Analytics Dashboard</h2>
                <div className="time-range-selector">
                    <select 
                        value={timeRange} 
                        onChange={(e) => setTimeRange(e.target.value)}
                        style={{
                            padding: '0.5rem',
                            borderRadius: '4px',
                            border: '1px solid var(--color-border)'
                        }}
                    >
                        <option value="1d">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>
                </div>
            </div>

            {/* Metric Tabs */}
            <div className="metric-tabs">
                {['overview', 'learning', 'performance', 'admin'].map(tab => (
                    <button
                        key={tab}
                        className={`metric-tab ${activeMetric === tab ? 'active' : ''}`}
                        onClick={() => setActiveMetric(tab)}
                        style={{
                            padding: '0.75rem 1rem',
                            margin: '0 0.25rem',
                            backgroundColor: activeMetric === tab ? 'var(--color-primary)' : 'transparent',
                            color: activeMetric === tab ? 'white' : 'var(--color-text)',
                            border: `1px solid ${activeMetric === tab ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                        }}
                    >
                        {tab === 'overview' && '📈'} 
                        {tab === 'learning' && '🎓'} 
                        {tab === 'performance' && '⚡'} 
                        {tab === 'admin' && '🔧'} 
                        {tab}
                    </button>
                ))}
            </div>

            {/* Overview Metrics */}
            {activeMetric === 'overview' && analyticsData && (
                <div className="metrics-grid">
                    <div className="metric-card">
                        <h3>👥 Total Users</h3>
                        <div className="metric-value">{analyticsData.overview.totalUsers}</div>
                        <div className="metric-change">+{analyticsData.overview.newSignups} this week</div>
                    </div>
                    <div className="metric-card">
                        <h3>🟢 Active Users</h3>
                        <div className="metric-value">{analyticsData.overview.activeUsers}</div>
                        <div className="metric-change">Online now</div>
                    </div>
                    <div className="metric-card">
                        <h3>⏱️ Avg Session</h3>
                        <div className="metric-value">{analyticsData.overview.avgSessionDuration}</div>
                        <div className="metric-change">Duration</div>
                    </div>
                    <div className="metric-card">
                        <h3>🎯 Completion Rate</h3>
                        <div className="metric-value">{formatPercentage(analyticsData.learning.avg_completion_rate)}</div>
                        <div className="metric-change">Course completion</div>
                    </div>
                </div>
            )}

            {/* Learning Metrics */}
            {activeMetric === 'learning' && analyticsData && (
                <div className="metrics-grid">
                    <div className="metric-card">
                        <h3>🚀 Courses Started</h3>
                        <div className="metric-value">{analyticsData.learning.courses_started}</div>
                        <div className="metric-change">This period</div>
                    </div>
                    <div className="metric-card">
                        <h3>✅ Lessons Completed</h3>
                        <div className="metric-value">{analyticsData.learning.lessons_completed}</div>
                        <div className="metric-change">Total completions</div>
                    </div>
                    <div className="metric-card">
                        <h3>🤖 AI Interactions</h3>
                        <div className="metric-value">{analyticsData.learning.ai_interactions}</div>
                        <div className="metric-change">Chat sessions</div>
                    </div>
                    <div className="metric-card">
                        <h3>🔓 Unlocks</h3>
                        <div className="metric-value">{analyticsData.learning.unlock_codes_used}</div>
                        <div className="metric-change">Lessons unlocked</div>
                    </div>
                </div>
            )}

            {/* Performance Metrics */}
            {activeMetric === 'performance' && performanceData && (
                <div className="metrics-grid">
                    <div className="metric-card">
                        <h3>🚀 Page Load Time</h3>
                        <div className="metric-value">{formatDuration(performanceData.metrics.page_load_time)}</div>
                        <div 
                            className="metric-change"
                            style={{ color: getStatusColor(performanceData.status.overall) }}
                        >
                            {performanceData.status.overall}
                        </div>
                    </div>
                    <div className="metric-card">
                        <h3>💾 Memory Usage</h3>
                        <div className="metric-value">{formatPercentage(performanceData.metrics.memory_usage)}</div>
                        <div className="metric-change">Of available memory</div>
                    </div>
                    <div className="metric-card">
                        <h3>🚨 Error Rate</h3>
                        <div className="metric-value">{formatPercentage(performanceData.metrics.error_rate)}</div>
                        <div className="metric-change">Last 24h</div>
                    </div>
                    <div className="metric-card">
                        <h3>⏰ Uptime</h3>
                        <div className="metric-value">{formatPercentage(performanceData.metrics.uptime)}</div>
                        <div className="metric-change">System availability</div>
                    </div>
                </div>
            )}

            {/* Admin Metrics */}
            {activeMetric === 'admin' && analyticsData && (
                <div className="metrics-grid">
                    <div className="metric-card">
                        <h3>👤 Users Created</h3>
                        <div className="metric-value">{analyticsData.admin.users_created}</div>
                        <div className="metric-change">This period</div>
                    </div>
                    <div className="metric-card">
                        <h3>📚 Courses Published</h3>
                        <div className="metric-value">{analyticsData.admin.courses_published}</div>
                        <div className="metric-change">New content</div>
                    </div>
                    <div className="metric-card">
                        <h3>💬 Messages Sent</h3>
                        <div className="metric-value">{analyticsData.admin.messages_sent}</div>
                        <div className="metric-change">Admin communications</div>
                    </div>
                    <div className="metric-card">
                        <h3>⚙️ System Actions</h3>
                        <div className="metric-value">{analyticsData.admin.system_actions}</div>
                        <div className="metric-change">Total admin actions</div>
                    </div>
                </div>
            )}

            {/* Performance Issues Alert */}
            {performanceData && performanceData.status.issues.length > 0 && (
                <div className="performance-alerts">
                    <h3>⚠️ Performance Issues</h3>
                    {performanceData.status.issues.map((issue, index) => (
                        <div key={index} className="alert-item">
                            {issue}
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .analytics-dashboard {
                    padding: var(--space-lg);
                }
                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-lg);
                }
                .metric-tabs {
                    display: flex;
                    margin-bottom: var(--space-lg);
                    flex-wrap: wrap;
                }
                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: var(--space-md);
                    margin-bottom: var(--space-lg);
                }
                .metric-card {
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: 8px;
                    padding: var(--space-lg);
                    text-align: center;
                }
                .metric-card h3 {
                    margin: 0 0 var(--space-sm) 0;
                    font-size: 0.875rem;
                    color: var(--color-textSecondary);
                }
                .metric-value {
                    font-size: 2rem;
                    font-weight: bold;
                    color: var(--color-text);
                    margin-bottom: var(--space-xs);
                }
                .metric-change {
                    font-size: 0.75rem;
                    color: var(--color-textMuted);
                }
                .performance-alerts {
                    background: var(--color-error-bg);
                    border: 1px solid var(--color-error);
                    border-radius: 8px;
                    padding: var(--space-md);
                    margin-top: var(--space-lg);
                }
                .alert-item {
                    color: var(--color-error);
                    margin: var(--space-xs) 0;
                }
            `}</style>
        </div>
    );
};

export default AnalyticsDashboard;
