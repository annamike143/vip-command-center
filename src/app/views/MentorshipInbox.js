// --- src/app/views/MentorshipInbox.js (v1.0 - Full Functionality) ---
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ref, onValue, push, serverTimestamp, update } from 'firebase/database';
import { database } from '../lib/firebase';
import './MentorshipInbox.css';
import SwipeTabs from '../components/SwipeTabs';

const MentorshipInbox = () => {
    const [threads, setThreads] = useState({});
    const [users, setUsers] = useState({});
    const [courses, setCourses] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedThreadKey, setSelectedThreadKey] = useState(null);
    const [replyText, setReplyText] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const threadsRef = ref(database, 'messagingThreads');
        const usersRef = ref(database, 'users');
        const coursesRef = ref(database, 'courses');

        const unsubThreads = onValue(threadsRef, (snapshot) => setThreads(snapshot.val() || {}));
        const unsubUsers = onValue(usersRef, (snapshot) => setUsers(snapshot.val() || {}));
        const unsubCourses = onValue(coursesRef, (snapshot) => {
            setCourses(snapshot.val() || {});
            setLoading(false);
        });

        return () => { unsubThreads(); unsubUsers(); unsubCourses(); };
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [selectedThreadKey, threads]);

    const selectedThread = useMemo(() => {
        if (!selectedThreadKey) return null;
        const [courseId, userId] = selectedThreadKey.split('___');
        return {
            courseId,
            userId,
            ...threads[courseId]?.[userId]
        };
    }, [selectedThreadKey, threads]);

    const handleSendReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedThread) return;
        
        const { courseId, userId } = selectedThread;
        const messageRef = ref(database, `messagingThreads/${courseId}/${userId}/messages`);
        
        await push(messageRef, {
            sender: 'admin',
            text: replyText,
            timestamp: serverTimestamp()
        });
        setReplyText('');
    };

    const handleAiToggle = async (status) => {
        if (!selectedThread) return;
        const { courseId, userId } = selectedThread;
        const statusRef = ref(database, `messagingThreads/${courseId}/${userId}`);
        await update(statusRef, { aiStatus: status });
    };
    
    const threadList = useMemo(() => {
        const list = [];
        for(const courseId in threads) {
            for(const userId in threads[courseId]) {
                list.push({ courseId, userId });
            }
        }
        return list;
    }, [threads]);

    if (loading) return <div>Loading Inbox...</div>;

            return (
                <SwipeTabs tabs={["Threads", "Messages"]}>
                    {/* Tab 1: Thread List */}
                    <div className="thread-list-panel">
                        <div className="panel-header"><h2>Inbox Threads</h2></div>
                        <div className="threads">
                            {threadList.length > 0 ? threadList.map(({ courseId, userId }) => (
                                <div
                                    key={`${courseId}-${userId}`}
                                    className={`thread-item ${selectedThreadKey === `${courseId}___${userId}` ? 'active' : ''}`}
                                    onClick={() => setSelectedThreadKey(`${courseId}___${userId}`)}
                                >
                                    <div className="thread-user">{users[userId]?.profile?.name || 'Unknown User'}</div>
                                    <div className="thread-lesson">{courses[courseId]?.details?.title || 'Unknown Course'}</div>
                                </div>
                            )) : <div className="empty-threads">No messages yet.</div>}
                        </div>
                    </div>
                    {/* Tab 2: Message View */}
                    <div className="message-view-panel">
                        {selectedThread ? (
                            <>
                                <div className="panel-header">
                                    <h3>{courses[selectedThread.courseId]?.details?.title}</h3>
                                    <p>Conversation with {users[selectedThread.userId]?.profile?.name}</p>
                                    <div className="ai-toggle">
                                        <span>AI Status: <strong>{selectedThread.aiStatus || 'active'}</strong></span>
                                        <button onClick={() => handleAiToggle('paused')} disabled={selectedThread.aiStatus === 'paused'}>Take Over</button>
                                        <button onClick={() => handleAiToggle('active')} disabled={selectedThread.aiStatus !== 'paused'}>Handover to AI</button>
                                    </div>
                                </div>
                                <div className="messages-area">
                                    {selectedThread.messages && Object.keys(selectedThread.messages).map(msgId => {
                                        const msg = selectedThread.messages[msgId];
                                        return (
                                            <div key={msgId} className={`message-bubble ${msg.sender}`}>
                                                {msg.sender === 'assistant' && <span className="sender-label">AI Concierge</span>}
                                                {msg.text}
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                                <form className="reply-form" onSubmit={handleSendReply}>
                                    <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type your reply as the Mentor..." />
                                    <button type="submit">Send</button>
                                </form>
                            </>
                        ) : (
                            <div className="no-thread-selected"><p>Select a thread to view the conversation.</p></div>
                        )}
                    </div>
                </SwipeTabs>
            );
};

export default MentorshipInbox;