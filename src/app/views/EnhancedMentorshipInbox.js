// EnhancedMentorshipInbox.js - Phase 3: Complete Mentorship Inbox Redesign
// Features: AI Controls, File Sharing, Thread Organization, Enhanced UI

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ref, onValue, push, serverTimestamp, update, set } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { database, storage } from '../lib/firebase';
import './EnhancedMentorshipInbox.css';

const EnhancedMentorshipInbox = () => {
    // Core State
    const [threads, setThreads] = useState({});
    const [users, setUsers] = useState({});
    const [courses, setCourses] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedThreadKey, setSelectedThreadKey] = useState(null);
    
    // Enhanced Features State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, ai-active, ai-paused, needs-attention
    const [priorityFilter, setPriorityFilter] = useState('all'); // all, high, normal, low
    const [replyText, setReplyText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    
    // File Sharing State
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    
    // UI State
    const [showThreadDetails, setShowThreadDetails] = useState(false);
    const [showAiSettings, setShowAiSettings] = useState(false);
    const [aiModel, setAiModel] = useState('gpt-4');
    const [aiPromptOverride, setAiPromptOverride] = useState('');
    
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // ========================================
    // CORE DATA LOADING
    // ========================================

    useEffect(() => {
        const threadsRef = ref(database, 'messagingThreads');
        const usersRef = ref(database, 'users');
        const coursesRef = ref(database, 'courses');

        const unsubThreads = onValue(threadsRef, (snapshot) => {
            const threadsData = snapshot.val() || {};
            setThreads(threadsData);
            
            // Calculate unread count
            let unread = 0;
            Object.values(threadsData).forEach(courseThreads => {
                Object.values(courseThreads).forEach(thread => {
                    if (thread.messages) {
                        Object.values(thread.messages).forEach(msg => {
                            if (!msg.read && msg.sender !== 'admin') unread++;
                        });
                    }
                });
            });
            setUnreadCount(unread);
        });

        const unsubUsers = onValue(usersRef, (snapshot) => setUsers(snapshot.val() || {}));
        const unsubCourses = onValue(coursesRef, (snapshot) => {
            setCourses(snapshot.val() || {});
            setLoading(false);
        });

        return () => { unsubThreads(); unsubUsers(); unsubCourses(); };
    }, []);

    // ========================================
    // ENHANCED THREAD PROCESSING
    // ========================================

    const processedThreads = useMemo(() => {
        const threadList = [];
        
        for (const courseId in threads) {
            for (const userId in threads[courseId]) {
                const thread = threads[courseId][userId];
                const user = users[userId];
                const course = courses[courseId];
                
                if (!user || !course) continue;
                
                const messages = thread.messages ? Object.values(thread.messages) : [];
                const lastMessage = messages[messages.length - 1];
                const unreadMessages = messages.filter(msg => !msg.read && msg.sender !== 'admin').length;
                
                // Calculate priority based on unread count, last activity, and thread status
                let priority = 'normal';
                if (unreadMessages > 5 || (thread.priority === 'high')) priority = 'high';
                if (unreadMessages === 0 && !lastMessage) priority = 'low';
                
                // Determine if needs attention
                const needsAttention = thread.aiStatus === 'paused' || unreadMessages > 3 || 
                                     (lastMessage && lastMessage.sender === 'user' && 
                                      Date.now() - new Date(lastMessage.timestamp).getTime() > 24 * 60 * 60 * 1000);

                threadList.push({
                    courseId,
                    userId,
                    user: user.profile,
                    course: course.details,
                    thread,
                    lastMessage,
                    unreadMessages,
                    priority,
                    needsAttention,
                    lastActivity: lastMessage ? new Date(lastMessage.timestamp) : new Date(0),
                    aiStatus: thread.aiStatus || 'active'
                });
            }
        }
        
        return threadList;
    }, [threads, users, courses]);

    // ========================================
    // FILTERING AND SEARCH
    // ========================================

    const filteredThreads = useMemo(() => {
        let filtered = processedThreads;
        
        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(t => 
                t.user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.course.title?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(t => {
                switch (statusFilter) {
                    case 'ai-active': return t.aiStatus === 'active';
                    case 'ai-paused': return t.aiStatus === 'paused';
                    case 'needs-attention': return t.needsAttention;
                    default: return true;
                }
            });
        }
        
        // Priority filter
        if (priorityFilter !== 'all') {
            filtered = filtered.filter(t => t.priority === priorityFilter);
        }
        
        // Sort by priority, then by last activity
        return filtered.sort((a, b) => {
            const priorityOrder = { high: 3, normal: 2, low: 1 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            return b.lastActivity - a.lastActivity;
        });
    }, [processedThreads, searchTerm, statusFilter, priorityFilter]);

    // ========================================
    // SELECTED THREAD PROCESSING
    // ========================================

    const selectedThread = useMemo(() => {
        if (!selectedThreadKey) return null;
        return filteredThreads.find(t => `${t.courseId}___${t.userId}` === selectedThreadKey);
    }, [selectedThreadKey, filteredThreads]);

    // ========================================
    // FILE HANDLING
    // ========================================

    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files);
        setSelectedFiles(prev => [...prev, ...files]);
    };

    const removeSelectedFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async (messageId) => {
        if (selectedFiles.length === 0) return [];
        
        setUploading(true);
        const uploadedFiles = [];
        
        try {
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                setUploadProgress(((i + 1) / selectedFiles.length) * 100);
                
                const fileName = `${Date.now()}_${file.name}`;
                const fileRef = storageRef(storage, `mentorship-files/${selectedThread.courseId}/${selectedThread.userId}/${fileName}`);
                
                await uploadBytes(fileRef, file);
                const downloadURL = await getDownloadURL(fileRef);
                
                uploadedFiles.push({
                    name: file.name,
                    url: downloadURL,
                    size: file.size,
                    type: file.type,
                    uploadedAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('File upload error:', error);
            alert('Error uploading files: ' + error.message);
        } finally {
            setUploading(false);
            setUploadProgress(0);
            setSelectedFiles([]);
        }
        
        return uploadedFiles;
    };

    // ========================================
    // MESSAGE HANDLING
    // ========================================

    const handleSendReply = async (e) => {
        e.preventDefault();
        if ((!replyText.trim() && selectedFiles.length === 0) || !selectedThread) return;
        
        setIsTyping(true);
        try {
            const { courseId, userId } = selectedThread;
            const messageRef = ref(database, `messagingThreads/${courseId}/${userId}/messages`);
            
            // Create the message object
            const messageData = {
                sender: 'admin',
                text: replyText.trim(),
                timestamp: serverTimestamp(),
                read: true
            };
            
            // Add message to get the message ID
            const newMessageRef = await push(messageRef, messageData);
            const messageId = newMessageRef.key;
            
            // Upload files if any
            if (selectedFiles.length > 0) {
                const files = await uploadFiles(messageId);
                if (files.length > 0) {
                    await update(newMessageRef, { files });
                }
            }
            
            // Update thread metadata
            const threadRef = ref(database, `messagingThreads/${courseId}/${userId}`);
            await update(threadRef, {
                lastActivity: serverTimestamp(),
                adminLastReply: serverTimestamp(),
                needsAttention: false
            });
            
            setReplyText('');
            setSelectedFiles([]);
            
        } catch (error) {
            console.error('Error sending reply:', error);
            alert('Error sending message: ' + error.message);
        } finally {
            setIsTyping(false);
        }
    };

    // ========================================
    // AI CONTROL FUNCTIONS
    // ========================================

    const handleAiToggle = async (status) => {
        if (!selectedThread) return;
        
        const { courseId, userId } = selectedThread;
        const threadRef = ref(database, `messagingThreads/${courseId}/${userId}`);
        
        const updateData = {
            aiStatus: status,
            aiStatusChangedAt: serverTimestamp(),
            aiStatusChangedBy: 'admin'
        };
        
        if (status === 'paused') {
            updateData.aiPausedReason = 'Manual mentor intervention';
        }
        
        await update(threadRef, updateData);
    };

    const updateAiSettings = async () => {
        if (!selectedThread) return;
        
        const { courseId, userId } = selectedThread;
        const settingsRef = ref(database, `messagingThreads/${courseId}/${userId}/aiSettings`);
        
        await set(settingsRef, {
            model: aiModel,
            promptOverride: aiPromptOverride,
            updatedAt: serverTimestamp(),
            updatedBy: 'admin'
        });
        
        setShowAiSettings(false);
        alert('AI settings updated successfully!');
    };

    // ========================================
    // THREAD MANAGEMENT
    // ========================================

    const markThreadAsRead = async (threadKey) => {
        const thread = filteredThreads.find(t => `${t.courseId}___${t.userId}` === threadKey);
        if (!thread) return;
        
        const { courseId, userId } = thread;
        const messagesRef = ref(database, `messagingThreads/${courseId}/${userId}/messages`);
        
        // Mark all messages as read
        const messages = thread.thread.messages || {};
        const updates = {};
        
        Object.keys(messages).forEach(msgId => {
            if (!messages[msgId].read && messages[msgId].sender !== 'admin') {
                updates[`${msgId}/read`] = true;
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await update(messagesRef, updates);
        }
    };

    const setThreadPriority = async (priority) => {
        if (!selectedThread) return;
        
        const { courseId, userId } = selectedThread;
        const threadRef = ref(database, `messagingThreads/${courseId}/${userId}`);
        
        await update(threadRef, {
            priority,
            prioritySetAt: serverTimestamp(),
            prioritySetBy: 'admin'
        });
    };

    // ========================================
    // UI HELPER FUNCTIONS
    // ========================================

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [selectedThreadKey, threads]);

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'active': return '🤖';
            case 'paused': return '⏸️';
            default: return '❓';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return '#f44336';
            case 'normal': return '#2196f3';
            case 'low': return '#4caf50';
            default: return '#757575';
        }
    };

    // ========================================
    // RENDER COMPONENT
    // ========================================

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading Enhanced Mentorship Inbox...</p>
            </div>
        );
    }

    return (
        <div className="enhanced-inbox-container">
            {/* Sidebar - Thread List */}
            <div className="thread-sidebar">
                <div className="sidebar-header">
                    <h2>Mentorship Inbox</h2>
                    <div className="inbox-stats">
                        <span className="unread-badge">{unreadCount} unread</span>
                        <span className="total-threads">{filteredThreads.length} conversations</span>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="inbox-filters">
                    <input
                        type="text"
                        placeholder="🔍 Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    
                    <div className="filter-row">
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="all">All Status</option>
                            <option value="ai-active">🤖 AI Active</option>
                            <option value="ai-paused">⏸️ AI Paused</option>
                            <option value="needs-attention">⚠️ Needs Attention</option>
                        </select>
                        
                        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                            <option value="all">All Priority</option>
                            <option value="high">🔴 High</option>
                            <option value="normal">🔵 Normal</option>
                            <option value="low">🟢 Low</option>
                        </select>
                    </div>
                </div>

                {/* Thread List */}
                <div className="thread-list">
                    {filteredThreads.length > 0 ? filteredThreads.map((thread) => {
                        const threadKey = `${thread.courseId}___${thread.userId}`;
                        const isSelected = selectedThreadKey === threadKey;
                        
                        return (
                            <div
                                key={threadKey}
                                className={`thread-item ${isSelected ? 'selected' : ''} ${thread.needsAttention ? 'needs-attention' : ''}`}
                                onClick={() => {
                                    setSelectedThreadKey(threadKey);
                                    markThreadAsRead(threadKey);
                                }}
                            >
                                <div className="thread-header">
                                    <div className="user-info">
                                        <span className="user-name">
                                            {thread.user.firstName} {thread.user.lastName}
                                        </span>
                                        <div className="thread-badges">
                                            <span className="ai-status">{getStatusIcon(thread.aiStatus)}</span>
                                            <span 
                                                className="priority-badge" 
                                                style={{ backgroundColor: getPriorityColor(thread.priority) }}
                                            >
                                                {thread.priority}
                                            </span>
                                            {thread.unreadMessages > 0 && (
                                                <span className="unread-count">{thread.unreadMessages}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="course-name">{thread.course.title}</div>
                                </div>
                                
                                <div className="thread-preview">
                                    {thread.lastMessage ? (
                                        <p className="last-message">
                                            <strong>{thread.lastMessage.sender === 'admin' ? 'You' : thread.user.firstName}:</strong> 
                                            {thread.lastMessage.text?.substring(0, 60)}...
                                        </p>
                                    ) : (
                                        <p className="no-messages">No messages yet</p>
                                    )}
                                    <span className="last-activity">
                                        {thread.lastActivity.toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="no-threads">
                            <p>No conversations match your filters.</p>
                            <p>Try adjusting your search or filter criteria.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="chat-main">
                {selectedThread ? (
                    <>
                        {/* Chat Header */}
                        <div className="chat-header">
                            <div className="student-info">
                                <h3>{selectedThread.user.firstName} {selectedThread.user.lastName}</h3>
                                <p>{selectedThread.course.title}</p>
                                <span className="student-email">{selectedThread.user.email}</span>
                            </div>
                            
                            <div className="chat-controls">
                                <button 
                                    className="control-btn priority-btn"
                                    onClick={() => setThreadPriority(selectedThread.priority === 'high' ? 'normal' : 'high')}
                                >
                                    {selectedThread.priority === 'high' ? '🔴 High Priority' : '⭐ Set High Priority'}
                                </button>
                                
                                <button 
                                    className="control-btn ai-btn"
                                    onClick={() => handleAiToggle(selectedThread.aiStatus === 'paused' ? 'active' : 'paused')}
                                >
                                    {selectedThread.aiStatus === 'paused' ? '🤖 Resume AI' : '⏸️ Pause AI'}
                                </button>
                                
                                <button 
                                    className="control-btn settings-btn"
                                    onClick={() => setShowAiSettings(true)}
                                >
                                    ⚙️ AI Settings
                                </button>
                                
                                <button 
                                    className="control-btn details-btn"
                                    onClick={() => setShowThreadDetails(true)}
                                >
                                    📊 Details
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="messages-container">
                            {selectedThread.thread.messages && Object.keys(selectedThread.thread.messages).map(msgId => {
                                const msg = selectedThread.thread.messages[msgId];
                                return (
                                    <div key={msgId} className={`message-bubble ${msg.sender}`}>
                                        <div className="message-header">
                                            <span className="sender-name">
                                                {msg.sender === 'admin' ? 'You (Mentor)' : 
                                                 msg.sender === 'assistant' ? '🤖 AI Concierge' : 
                                                 selectedThread.user.firstName}
                                            </span>
                                            <span className="message-time">
                                                {new Date(msg.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        
                                        <div className="message-content">
                                            {msg.text}
                                        </div>
                                        
                                        {msg.files && msg.files.length > 0 && (
                                            <div className="message-files">
                                                {msg.files.map((file, index) => (
                                                    <div key={index} className="file-attachment">
                                                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                                                            📎 {file.name} ({formatFileSize(file.size)})
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Reply Form */}
                        <div className="reply-section">
                            {selectedFiles.length > 0 && (
                                <div className="selected-files">
                                    <h4>Selected Files:</h4>
                                    {selectedFiles.map((file, index) => (
                                        <div key={index} className="selected-file">
                                            <span>📎 {file.name} ({formatFileSize(file.size)})</span>
                                            <button onClick={() => removeSelectedFile(index)}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <form onSubmit={handleSendReply} className="reply-form">
                                <div className="reply-input-area">
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Type your mentor response..."
                                        rows={3}
                                        disabled={isTyping || uploading}
                                    />
                                    
                                    <div className="reply-controls">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            multiple
                                            style={{ display: 'none' }}
                                        />
                                        
                                        <button 
                                            type="button"
                                            className="file-btn"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                        >
                                            📎 Add Files
                                        </button>
                                        
                                        <button 
                                            type="submit" 
                                            className="send-btn"
                                            disabled={(!replyText.trim() && selectedFiles.length === 0) || isTyping || uploading}
                                        >
                                            {isTyping ? '⏳ Sending...' : uploading ? `📤 Uploading... ${uploadProgress.toFixed(0)}%` : '📤 Send'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="no-conversation-selected">
                        <div className="empty-state">
                            <h3>💬 Select a Conversation</h3>
                            <p>Choose a conversation from the sidebar to start mentoring</p>
                            <div className="inbox-summary">
                                <div className="summary-stat">
                                    <strong>{processedThreads.length}</strong>
                                    <span>Total Conversations</span>
                                </div>
                                <div className="summary-stat">
                                    <strong>{unreadCount}</strong>
                                    <span>Unread Messages</span>
                                </div>
                                <div className="summary-stat">
                                    <strong>{processedThreads.filter(t => t.needsAttention).length}</strong>
                                    <span>Need Attention</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* AI Settings Modal */}
            {showAiSettings && selectedThread && (
                <div className="modal-overlay">
                    <div className="modal-content ai-settings-modal">
                        <div className="modal-header">
                            <h3>🤖 AI Settings for {selectedThread.user.firstName}</h3>
                            <button onClick={() => setShowAiSettings(false)}>✕</button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="setting-group">
                                <label>AI Model:</label>
                                <select value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
                                    <option value="gpt-4">GPT-4 (Recommended)</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
                                    <option value="claude">Claude (Alternative)</option>
                                </select>
                            </div>
                            
                            <div className="setting-group">
                                <label>Custom Prompt Override:</label>
                                <textarea
                                    value={aiPromptOverride}
                                    onChange={(e) => setAiPromptOverride(e.target.value)}
                                    placeholder="Enter custom instructions for the AI when responding to this student..."
                                    rows={4}
                                />
                            </div>
                            
                            <div className="current-settings">
                                <h4>Current AI Status:</h4>
                                <p>Status: <strong>{selectedThread.aiStatus}</strong></p>
                                <p>Model: <strong>{selectedThread.thread.aiSettings?.model || 'gpt-4'}</strong></p>
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button onClick={updateAiSettings} className="save-btn">💾 Save Settings</button>
                            <button onClick={() => setShowAiSettings(false)} className="cancel-btn">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Thread Details Modal */}
            {showThreadDetails && selectedThread && (
                <div className="modal-overlay">
                    <div className="modal-content thread-details-modal">
                        <div className="modal-header">
                            <h3>📊 Conversation Details</h3>
                            <button onClick={() => setShowThreadDetails(false)}>✕</button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="details-section">
                                <h4>Student Information</h4>
                                <p><strong>Name:</strong> {selectedThread.user.firstName} {selectedThread.user.lastName}</p>
                                <p><strong>Email:</strong> {selectedThread.user.email}</p>
                                <p><strong>Course:</strong> {selectedThread.course.title}</p>
                                <p><strong>Enrolled:</strong> {new Date(selectedThread.user.dateEnrolled).toLocaleDateString()}</p>
                            </div>
                            
                            <div className="details-section">
                                <h4>Conversation Stats</h4>
                                <p><strong>Total Messages:</strong> {selectedThread.thread.messages ? Object.keys(selectedThread.thread.messages).length : 0}</p>
                                <p><strong>Unread Messages:</strong> {selectedThread.unreadMessages}</p>
                                <p><strong>Priority:</strong> {selectedThread.priority}</p>
                                <p><strong>AI Status:</strong> {selectedThread.aiStatus}</p>
                                <p><strong>Last Activity:</strong> {selectedThread.lastActivity.toLocaleString()}</p>
                            </div>
                            
                            <div className="details-section">
                                <h4>Quick Actions</h4>
                                <div className="quick-actions">
                                    <button onClick={() => setThreadPriority('high')} disabled={selectedThread.priority === 'high'}>
                                        🔴 Set High Priority
                                    </button>
                                    <button onClick={() => setThreadPriority('normal')} disabled={selectedThread.priority === 'normal'}>
                                        🔵 Set Normal Priority
                                    </button>
                                    <button onClick={() => setThreadPriority('low')} disabled={selectedThread.priority === 'low'}>
                                        🟢 Set Low Priority
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button onClick={() => setShowThreadDetails(false)} className="close-btn">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnhancedMentorshipInbox;
