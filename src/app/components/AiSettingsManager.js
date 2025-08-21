'use client';

import React, { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { database, functions } from '../lib/firebase';
import './AiSettingsManager.css';

const AiSettingsManager = () => {
    const [aiSettings, setAiSettings] = useState({
        coachAssistant: '',
        qnaAssistant: '',
        globalSettings: {
            model: 'gpt-4',
            maxTokens: 1000,
            temperature: 0.7
        }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('coach');
    const [previewData, setPreviewData] = useState({
        firstName: 'John',
        experienceLevel: 'intermediate',
        industry: 'technology',
        lessonId: 'lesson_1',
        courseId: 'course_1'
    });

    useEffect(() => {
        const settingsRef = ref(database, 'aiSettings');
        const unsubscribe = onValue(settingsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setAiSettings({
                    coachAssistant: data.systemInstructions?.coachAssistant?.instructions || '',
                    qnaAssistant: data.systemInstructions?.qnaAssistant?.instructions || '',
                    globalSettings: data.globalSettings || {
                        model: 'gpt-4',
                        maxTokens: 1000,
                        temperature: 0.7
                    }
                });
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const settingsRef = ref(database, 'aiSettings');
            await set(settingsRef, {
                systemInstructions: {
                    coachAssistant: {
                        instructions: aiSettings.coachAssistant,
                        lastUpdated: new Date().toISOString(),
                        updatedBy: 'admin' // TODO: Replace with actual user
                    },
                    qnaAssistant: {
                        instructions: aiSettings.qnaAssistant,
                        lastUpdated: new Date().toISOString(),
                        updatedBy: 'admin'
                    }
                },
                globalSettings: aiSettings.globalSettings
            });
            alert('✅ AI Settings saved successfully!');
        } catch (error) {
            console.error('Error saving AI settings:', error);
            alert('❌ Error saving settings: ' + error.message);
        }
        setSaving(false);
    };

    const getPreviewText = (instructions) => {
        return instructions
            .replace(/{firstName}/g, previewData.firstName)
            .replace(/{experienceLevel}/g, previewData.experienceLevel)
            .replace(/{industry}/g, previewData.industry)
            .replace(/{lessonId}/g, previewData.lessonId)
            .replace(/{courseId}/g, previewData.courseId);
    };

    const defaultInstructions = {
        coach: `You are an encouraging AI Coach helping {firstName} complete their lesson recitation. 

Address them personally by name and provide motivational guidance. When they complete the recitation successfully, provide them with their unlock code: LESSON_UNLOCKED_{lessonId}

Your personality:
- Encouraging and supportive
- Patient with mistakes
- Celebrates achievements
- Provides constructive feedback

Remember to:
- Always address {firstName} by their first name
- Adapt your coaching style to their {experienceLevel} level
- Use examples relevant to their {industry} field when appropriate
- Guide them through the recitation process step by step`,

        qna: `You are a knowledgeable AI Concierge helping {firstName} with questions about their course content.

Address them by their first name and provide clear, helpful explanations tailored to their {experienceLevel} level in the {industry} field.

Your personality:
- Professional yet friendly
- Patient and thorough
- Adapts explanations to user's level
- Provides practical examples

Remember to:
- Always greet {firstName} by name
- Tailor complexity to their {experienceLevel}
- Use industry-relevant examples from {industry}
- Encourage further questions
- Stay focused on course content from {courseId}`
    };

    if (loading) return <div className="ai-settings-loading">Loading AI Settings...</div>;

    return (
        <div className="ai-settings-manager">
            <div className="ai-settings-header">
                <h2>🤖 AI Assistant Settings</h2>
                <p>Configure system instructions for your AI assistants. Use variables like {`{firstName}`}, {`{experienceLevel}`}, {`{industry}`}, {`{lessonId}`}, and {`{courseId}`} for personalization.</p>
            </div>

            <div className="ai-settings-tabs">
                <button 
                    className={`ai-tab ${activeTab === 'coach' ? 'active' : ''}`}
                    onClick={() => setActiveTab('coach')}
                >
                    🏃‍♂️ AI Coach (Recitation)
                </button>
                <button 
                    className={`ai-tab ${activeTab === 'qna' ? 'active' : ''}`}
                    onClick={() => setActiveTab('qna')}
                >
                    🎓 AI Concierge (Q&A)
                </button>
                <button 
                    className={`ai-tab ${activeTab === 'global' ? 'active' : ''}`}
                    onClick={() => setActiveTab('global')}
                >
                    ⚙️ Global Settings
                </button>
            </div>

            <div className="ai-settings-content">
                {activeTab === 'coach' && (
                    <div className="instruction-editor">
                        <div className="editor-section">
                            <h3>AI Coach System Instructions</h3>
                            <textarea
                                value={aiSettings.coachAssistant}
                                onChange={(e) => setAiSettings({...aiSettings, coachAssistant: e.target.value})}
                                placeholder={defaultInstructions.coach}
                                className="instruction-textarea"
                                rows={15}
                            />
                            <button 
                                onClick={() => setAiSettings({...aiSettings, coachAssistant: defaultInstructions.coach})}
                                className="load-default-btn"
                            >
                                📋 Load Default Instructions
                            </button>
                        </div>
                        <div className="preview-section">
                            <h4>📖 Preview (with sample data)</h4>
                            <div className="preview-box">
                                {getPreviewText(aiSettings.coachAssistant || defaultInstructions.coach)}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'qna' && (
                    <div className="instruction-editor">
                        <div className="editor-section">
                            <h3>AI Concierge System Instructions</h3>
                            <textarea
                                value={aiSettings.qnaAssistant}
                                onChange={(e) => setAiSettings({...aiSettings, qnaAssistant: e.target.value})}
                                placeholder={defaultInstructions.qna}
                                className="instruction-textarea"
                                rows={15}
                            />
                            <button 
                                onClick={() => setAiSettings({...aiSettings, qnaAssistant: defaultInstructions.qna})}
                                className="load-default-btn"
                            >
                                📋 Load Default Instructions
                            </button>
                        </div>
                        <div className="preview-section">
                            <h4>📖 Preview (with sample data)</h4>
                            <div className="preview-box">
                                {getPreviewText(aiSettings.qnaAssistant || defaultInstructions.qna)}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'global' && (
                    <div className="global-settings">
                        <h3>🌐 Global AI Settings</h3>
                        <div className="settings-grid">
                            <div className="setting-row">
                                <label>Model:</label>
                                <select 
                                    value={aiSettings.globalSettings.model}
                                    onChange={(e) => setAiSettings({
                                        ...aiSettings, 
                                        globalSettings: {...aiSettings.globalSettings, model: e.target.value}
                                    })}
                                >
                                    <option value="gpt-4">GPT-4</option>
                                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                </select>
                            </div>
                            <div className="setting-row">
                                <label>Max Tokens:</label>
                                <input 
                                    type="number" 
                                    value={aiSettings.globalSettings.maxTokens}
                                    onChange={(e) => setAiSettings({
                                        ...aiSettings,
                                        globalSettings: {...aiSettings.globalSettings, maxTokens: parseInt(e.target.value)}
                                    })}
                                />
                            </div>
                            <div className="setting-row">
                                <label>Temperature:</label>
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    min="0" 
                                    max="2" 
                                    value={aiSettings.globalSettings.temperature}
                                    onChange={(e) => setAiSettings({
                                        ...aiSettings,
                                        globalSettings: {...aiSettings.globalSettings, temperature: parseFloat(e.target.value)}
                                    })}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="preview-data-editor">
                <h4>🔧 Preview Data (for testing)</h4>
                <div className="preview-inputs">
                    <input 
                        placeholder="First Name" 
                        value={previewData.firstName}
                        onChange={(e) => setPreviewData({...previewData, firstName: e.target.value})}
                    />
                    <input 
                        placeholder="Experience Level" 
                        value={previewData.experienceLevel}
                        onChange={(e) => setPreviewData({...previewData, experienceLevel: e.target.value})}
                    />
                    <input 
                        placeholder="Industry" 
                        value={previewData.industry}
                        onChange={(e) => setPreviewData({...previewData, industry: e.target.value})}
                    />
                    <input 
                        placeholder="Lesson ID" 
                        value={previewData.lessonId}
                        onChange={(e) => setPreviewData({...previewData, lessonId: e.target.value})}
                    />
                    <input 
                        placeholder="Course ID" 
                        value={previewData.courseId}
                        onChange={(e) => setPreviewData({...previewData, courseId: e.target.value})}
                    />
                </div>
            </div>

            <div className="save-section">
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="save-button"
                >
                    {saving ? '💾 Saving...' : '💾 Save AI Settings'}
                </button>
            </div>
        </div>
    );
};

export default AiSettingsManager;
