// --- src/app/views/VipManager.js (v3.0 - Enhanced with AI Settings Tab) ---
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ref, onValue, set, remove, update, push, get, serverTimestamp } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { database, functions } from '../lib/firebase';
import CourseBuilderModern from '../components/CourseBuilderModern';
import './VipManager.css';

const VipManager = () => {
    const [vips, setVips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ isOpen: false, data: null });
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '' });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [courses, setCourses] = useState({});
    const [manageUser, setManageUser] = useState(null);
    const [progressData, setProgressData] = useState({});
    const [selectedCourseToEnroll, setSelectedCourseToEnroll] = useState('');

    // NEW: Enhanced search and filtering
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageTarget, setMessageTarget] = useState(null);
    const [messageSubject, setMessageSubject] = useState('');
    const [messageBody, setMessageBody] = useState('');

    // NEW: Tab management
    const [activeMainTab, setActiveMainTab] = useState('vips');

    useEffect(() => {
        const usersRef = ref(database, 'users');
        const coursesRef = ref(database, 'courses');

        const unsubUsers = onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            const vipsList = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            setVips(vipsList);
            setLoading(false);
        });
        const unsubCourses = onValue(coursesRef, (snapshot) => setCourses(snapshot.val() || {}));
        
        return () => { unsubUsers(); unsubCourses(); };
    }, []);

    // NEW: Filtered VIPs based on search and status
    const filteredVips = useMemo(() => {
        return vips.filter(vip => {
            const profile = vip.profile || {};
            
            // Search filter
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm || 
                (profile.firstName?.toLowerCase().includes(searchLower)) ||
                (profile.lastName?.toLowerCase().includes(searchLower)) ||
                (profile.email?.toLowerCase().includes(searchLower)) ||
                (`${profile.firstName || ''} ${profile.lastName || ''}`.toLowerCase().includes(searchLower));

            // Status filter
            const userStatus = profile.status || 'active';
            const matchesStatus = statusFilter === 'all' || userStatus === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [vips, searchTerm, statusFilter]);

    const openModal = () => {
        setFormData({ firstName: '', lastName: '', email: '' });
        setModal({ isOpen: true, data: null });
        setError('');
    };

    const closeModal = () => {
        setModal({ isOpen: false, data: null });
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddVip = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        const addNewVip = httpsCallable(functions, 'addNewVip');
        try {
            const result = await addNewVip({ 
                firstName: formData.firstName, 
                lastName: formData.lastName, 
                email: formData.email 
            });
            if (result.data.success) {
                alert(result.data.message);
                closeModal();
            }
        } catch (err) {
            console.error("Error calling function:", err);
            setError(err.message || 'An unknown error occurred.');
        }
        setIsSubmitting(false);
    };

    // NEW: Enhanced user management functions
    const freezeUser = async (userId, userName, currentStatus) => {
        const isCurrentlyFrozen = currentStatus === 'frozen';
        const action = isCurrentlyFrozen ? 'unfreeze' : 'freeze';
        
        if (!confirm(`Are you sure you want to ${action} ${userName}?\n\n${isCurrentlyFrozen ? 'This will restore their access to all courses.' : 'This will block their login but preserve all data.'}`)) {
            return;
        }

        setLoading(true);
        try {
            // First update user status in database
            await update(ref(database, `users/${userId}/profile`), {
                status: isCurrentlyFrozen ? 'active' : 'frozen',
                [`${action}dAt`]: new Date().toISOString(),
                [`${action}dBy`]: 'admin'
            });

            // Call Firebase Function to disable/enable the user account
            const manageUserAccount = httpsCallable(functions, 'manageUserAccount');
            await manageUserAccount({
                userId: userId,
                action: isCurrentlyFrozen ? 'enable' : 'disable',
                reason: `Account ${action}d by admin`
            });

            alert(`✅ ${userName} has been ${action}d successfully.\n${isCurrentlyFrozen ? 'They can now log in again.' : 'They will not be able to log in until unfrozen.'}`);

        } catch (error) {
            console.error(`Error ${action}ing user:`, error);
            
            // If Firebase function fails, revert the database status
            try {
                await update(ref(database, `users/${userId}/profile`), {
                    status: currentStatus
                });
            } catch (revertError) {
                console.error('Error reverting status:', revertError);
            }
            
            alert(`Error ${action}ing user: ${error.message}\nPlease try again or contact support.`);
        } finally {
            setLoading(false);
        }
    };

    const deleteUserPermanently = async (userId, userName) => {
        if (!confirm(`⚠️ PERMANENT DELETION\n\nThis will permanently delete ${userName} and ALL their data:\n• Account access\n• Course progress\n• Messages\n• Files\n\nThis action CANNOT be undone!\n\nType 'DELETE' to confirm:`)) {
            return;
        }

        const confirmation = prompt('Type DELETE to confirm:');
        if (confirmation !== 'DELETE') {
            alert('Deletion cancelled.');
            return;
        }

        setLoading(true);
        try {
            // Simple direct deletion - safer than using cleanup service
            await remove(ref(database, `users/${userId}`));
            
            // Clean up any messaging threads
            const threadsRef = ref(database, 'messagingThreads');
            const snapshot = await get(threadsRef);
            const threads = snapshot.val() || {};

            for (const [courseId, courseThreads] of Object.entries(threads)) {
                if (courseThreads[userId]) {
                    await remove(ref(database, `messagingThreads/${courseId}/${userId}`));
                }
            }

            alert(`✅ ${userName} has been permanently deleted.`);

        } catch (error) {
            console.error('Error deleting user:', error);
            alert(`Error deleting user: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const sendDirectMessage = async (target) => {
        if (!target || !messageSubject.trim() || !messageBody.trim()) return;

        setLoading(true);
        try {
            // Send message to BOTH the student's QnA thread AND the admin mentorship inbox
            // This ensures bi-directional communication
            
            // 1. Add to student's QnA thread (where they can see it)
            const studentQnaRef = ref(database, `users/${target.id}/enrollments`);
            const enrollmentsSnapshot = await get(studentQnaRef);
            
            if (enrollmentsSnapshot.exists()) {
                const enrollments = enrollmentsSnapshot.val();
                
                // Send to all enrolled courses' QnA threads
                for (const courseId in enrollments) {
                    const qnaThreadRef = ref(database, `users/${target.id}/enrollments/${courseId}/progress/qnaThreads/messages`);
                    await push(qnaThreadRef, {
                        sender: 'admin',
                        text: `📧 ${messageSubject}\n\n${messageBody}`,
                        timestamp: serverTimestamp(),
                        isDirectMessage: true,
                        fromAdmin: true
                    });
                }
            }
            
            // 2. Add to admin mentorship inbox (where admin can track it)
            // Find the most recent course or use first available
            const enrollmentsData = enrollmentsSnapshot.val();
            const firstCourseId = enrollmentsData ? Object.keys(enrollmentsData)[0] : 'general';
            
            const adminInboxRef = ref(database, `messagingThreads/${firstCourseId}/${target.id}/messages`);
            await push(adminInboxRef, {
                sender: 'admin',
                text: `📧 ${messageSubject}\n\n${messageBody}`,
                timestamp: serverTimestamp(),
                isDirectMessage: true
            });

            alert(`✅ Message sent to ${target.profile.firstName || 'Student'} ${target.profile.lastName || ''}`);
            setMessageSubject('');
            setMessageBody('');
            setShowMessageModal(false);
            setMessageTarget(null);

        } catch (error) {
            console.error('Error sending message:', error);
            alert(`Error sending message: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const openManageModal = (vip) => {
        setManageUser(vip);
        setProgressData(vip.enrollments || {});
        setSelectedCourseToEnroll('');
    };

    const closeManageModal = () => {
        setManageUser(null);
        setProgressData({});
    };

    const handleProgressChange = async (courseId, lessonId, type, isChecked) => {
        const progressPath = `users/${manageUser.id}/enrollments/${courseId}/progress/${type}/${lessonId}`;
        
        if (isChecked) {
            await set(ref(database, progressPath), true);
        } else {
            await remove(ref(database, progressPath));
        }

        const newProgressData = { ...progressData };
        if (isChecked) {
            if (!newProgressData[courseId]) newProgressData[courseId] = { progress: { unlockedLessons: {}, completedLessons: {} } };
            if (!newProgressData[courseId].progress[type]) newProgressData[courseId].progress[type] = {};
            newProgressData[courseId].progress[type][lessonId] = true;
        } else {
            if (newProgressData[courseId]?.progress?.[type]?.[lessonId]) {
                delete newProgressData[courseId].progress[type][lessonId];
            }
        }
        setProgressData(newProgressData);
    };

    const handleEnrollInCourse = async () => {
        if (!selectedCourseToEnroll || !manageUser) return;
        
        const courseModules = courses[selectedCourseToEnroll]?.modules;
        let firstLessonId = 'lesson_01'; // Default fallback
        if (courseModules) {
            const firstModuleKey = Object.keys(courseModules).find(key => courseModules[key].order === 1);
            const firstModule = courseModules[firstModuleKey];
            if (firstModule?.lessons) {
                const firstLessonKey = Object.keys(firstModule.lessons).find(key => firstModule.lessons[key].order === 1);
                if (firstLessonKey) firstLessonId = firstLessonKey;
            }
        }

        const enrollmentPath = `users/${manageUser.id}/enrollments/${selectedCourseToEnroll}`;
        const newEnrollmentData = {
            progress: {
                unlockedLessons: { [firstLessonId]: true },
                completedLessons: {},
                currentLessonId: firstLessonId
            }
        };
        await set(ref(database, enrollmentPath), newEnrollmentData);

        const newProgressData = { ...progressData, [selectedCourseToEnroll]: newEnrollmentData };
        setProgressData(newProgressData);
        setSelectedCourseToEnroll('');
        alert(`${manageUser.profile.firstName || ''} ${manageUser.profile.lastName || ''} has been enrolled in ${courses[selectedCourseToEnroll].details.title}!`);
    };

    if (loading) return <div className="manager-container">Loading VIP Data...</div>;

    return (
        <div className="manager-container">
            <div className="manager-header">
                <h1>VIP Command Center</h1>
                <div className="header-actions">
                    {activeMainTab === 'vips' && (
                        <button onClick={openModal} className="add-button">+ Add New VIP</button>
                    )}
                </div>
            </div>

            {/* NEW: Main Tab Navigation */}
            <div className="main-tabs">
                <button 
                    className={`main-tab ${activeMainTab === 'vips' ? 'active' : ''}`}
                    onClick={() => setActiveMainTab('vips')}
                >
                    👥 VIP Management
                </button>
                <button 
                    className={`main-tab ${activeMainTab === 'course-builder' ? 'active' : ''}`}
                    onClick={() => setActiveMainTab('course-builder')}
                >
                    🎓 Course Builder
                </button>
            </div>

            {/* Conditional Content Based on Active Tab */}
            {activeMainTab === 'vips' && (
                <>
                    {/* NEW: Search and Filter Section */}
                    <div className="search-filters">
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="🔍 Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <div className="filters">
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">All Status</option>
                                <option value="active">🟢 Active</option>
                                <option value="frozen">🔵 Frozen</option>
                                <option value="pending">🟡 Pending</option>
                            </select>
                        </div>
                        <div className="results-count">
                            Showing {filteredVips.length} of {vips.length} users
                        </div>
                    </div>

            <div className="manager-table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>First Name</th>
                            <th>Last Name</th>
                            <th>Email</th>
                            <th>Date Enrolled</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredVips.map(vip => {
                            const profile = vip.profile || {};
                            const status = profile.status || 'active';
                            const firstName = profile.firstName || 'Unknown';
                            const lastName = profile.lastName || 'User';
                            const fullName = `${firstName} ${lastName}`; // Keep for message modal
                            
                            return (
                                <tr key={vip.id} className={`user-row ${status}`}>
                                    <td>
                                        <span className={`status-badge ${status}`}>
                                            {status === 'active' ? '🟢' : status === 'frozen' ? '🔵' : '🟡'} {status}
                                        </span>
                                    </td>
                                    <td>{firstName}</td>
                                    <td>{lastName}</td>
                                    <td>{profile.email || 'No email'}</td>
                                    <td>{profile.dateEnrolled ? new Date(profile.dateEnrolled).toLocaleDateString() : 'N/A'}</td>
                                    <td className="actions-cell">
                                        <button 
                                            className="action-button message-btn"
                                            onClick={() => {
                                                setMessageTarget(vip);
                                                setShowMessageModal(true);
                                            }}
                                            title="Send Message"
                                        >
                                            💬
                                        </button>
                                        <button 
                                            className={`action-button ${status === 'frozen' ? 'unfreeze-btn' : 'freeze-btn'}`}
                                            onClick={() => freezeUser(vip.id, fullName, status)}
                                            title={status === 'frozen' ? 'Unfreeze Account' : 'Freeze Account'}
                                        >
                                            {status === 'frozen' ? '🔓' : '🔒'}
                                        </button>
                                        <button 
                                            className="action-button manage-btn"
                                            onClick={() => openManageModal(vip)}
                                            title="Manage Courses"
                                        >
                                            ⚙️
                                        </button>
                                        <button 
                                            className="action-button delete-btn"
                                            onClick={() => deleteUserPermanently(vip.id, fullName)}
                                            title="Delete Account"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filteredVips.length === 0 && (
                    <div className="no-results">
                        <p>No users found matching your criteria.</p>
                        <p>Try adjusting your search terms or filters.</p>
                    </div>
                )}
            </div>

            {/* Message Modal */}
            {showMessageModal && (
                <div className="modal-backdrop" onClick={() => setShowMessageModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Send Message to {messageTarget?.profile?.firstName} {messageTarget?.profile?.lastName}</h2>
                            <button className="close-button" onClick={() => setShowMessageModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Subject:</label>
                                <input
                                    type="text"
                                    value={messageSubject}
                                    onChange={(e) => setMessageSubject(e.target.value)}
                                    placeholder="Enter message subject..."
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Message:</label>
                                <textarea
                                    value={messageBody}
                                    onChange={(e) => setMessageBody(e.target.value)}
                                    placeholder="Enter your message..."
                                    rows={6}
                                    className="form-textarea"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                onClick={() => sendDirectMessage(messageTarget)}
                                className="confirm-button"
                                disabled={!messageSubject.trim() || !messageBody.trim()}
                            >
                                Send Message
                            </button>
                            <button onClick={() => setShowMessageModal(false)} className="cancel-button">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modal.isOpen && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h2>Add New VIP</h2>
                        <p>This will create a new user and return their temporary password. You must then send it to them manually.</p>
                        <form onSubmit={handleAddVip}>
                            <input name="firstName" value={formData.firstName} onChange={handleFormChange} placeholder="First Name" required />
                            <input name="lastName" value={formData.lastName} onChange={handleFormChange} placeholder="Last Name" required />
                            <input name="email" type="email" value={formData.email} onChange={handleFormChange} placeholder="Email Address" required />
                            {error && <p className="error-message">{error}</p>}
                            <div className="modal-actions">
                                <button type="button" onClick={closeModal} disabled={isSubmitting}>Cancel</button>
                                <button type="submit" className="submit-button" disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating User...' : 'Add VIP & Get Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {manageUser && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h2>Manage Enrollments for {manageUser.profile.firstName || ''} {manageUser.profile.lastName || ''}</h2>
                        
                        <div className="enroll-section">
                            <h3>Enroll in a New Course</h3>
                            <div className="enroll-form">
                                <select value={selectedCourseToEnroll} onChange={(e) => setSelectedCourseToEnroll(e.target.value)}>
                                    <option value="">Select a course to enroll...</option>
                                    {Object.keys(courses).filter(courseId => !(manageUser.enrollments && manageUser.enrollments[courseId])).map(courseId => (
                                        <option key={courseId} value={courseId}>{courses[courseId].details.title}</option>
                                    ))}
                                </select>
                                <button onClick={handleEnrollInCourse} disabled={!selectedCourseToEnroll}>Enroll</button>
                            </div>
                        </div>
                        
                        <div className="enrollments-list">
                            <h4>Current Enrollments</h4>
                            {Object.keys(progressData).length > 0 ? Object.keys(progressData).map(courseId => {
                                const course = courses[courseId];
                                if (!course) return null;
                                
                                const allLessons = course.modules ? Object.values(course.modules).flatMap(module => module.lessons ? Object.entries(module.lessons) : []).sort((a,b) => a[1].order - b[1].order) : [];

                                return (
                                    <div key={courseId} className="course-progress-item">
                                        <h3>{course.details.title}</h3>
                                        <div className="lessons-progress-list">
                                            {allLessons.map(([lessonId, lesson]) => {
                                                const isUnlocked = !!progressData[courseId]?.progress?.unlockedLessons?.[lessonId];
                                                const isCompleted = !!progressData[courseId]?.progress?.completedLessons?.[lessonId];
                                                return (
                                                    <div key={lessonId} className="lesson-progress-row">
                                                        <span>{lesson.title}</span>
                                                        <div className="checkbox-group">
                                                            <label><input type="checkbox" checked={isUnlocked} onChange={(e) => handleProgressChange(courseId, lessonId, 'unlockedLessons', e.target.checked)} /> Unlocked</label>
                                                            <label><input type="checkbox" checked={isCompleted} onChange={(e) => handleProgressChange(courseId, lessonId, 'completedLessons', e.target.checked)} /> Completed</label>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            }) : <p>This user is not enrolled in any courses yet.</p>}
                        </div>
                        <div className="modal-actions">
                            <button type="button" onClick={closeManageModal}>Close</button>
                        </div>
                    </div>
                </div>
            )}
                </>
            )}

            {/* Course Builder Tab Content */}
            {activeMainTab === 'course-builder' && (
                <CourseBuilderModern />
            )}
        </div>
    );
};

export default VipManager;