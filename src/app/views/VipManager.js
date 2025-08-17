// --- src/app/views/VipManager.js (v1.3 - DEFINITIVE UNCOLLAPSED with Enrollment) ---
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ref, onValue, set, remove, update } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { database, functions } from '../lib/firebase';
import './VipManager.css';

const VipManager = () => {
    const [vips, setVips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ isOpen: false, data: null });
    const [formData, setFormData] = useState({ name: '', email: '' });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [courses, setCourses] = useState({});
    const [manageUser, setManageUser] = useState(null);
    const [progressData, setProgressData] = useState({});
    const [selectedCourseToEnroll, setSelectedCourseToEnroll] = useState('');

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

    const openModal = () => {
        setFormData({ name: '', email: '' });
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
            const result = await addNewVip({ name: formData.name, email: formData.email });
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
        alert(`${manageUser.profile.name} has been enrolled in ${courses[selectedCourseToEnroll].details.title}!`);
    };

    if (loading) return <div className="manager-container">Loading VIP Data...</div>;

    return (
        <div className="manager-container">
            <div className="manager-header">
                <h1>VIP Member Management</h1>
                <button onClick={openModal} className="add-button">+ Add New VIP</button>
            </div>

            <div className="manager-table-wrapper">
                <table>
                    <thead>
                        <tr><th>Name</th><th>Email</th><th>Date Enrolled</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {vips.map(vip => (
                            <tr key={vip.id}>
                                <td>{vip.profile?.name}</td>
                                <td>{vip.profile?.email}</td>
                                <td>{vip.profile?.dateEnrolled ? new Date(vip.profile.dateEnrolled).toLocaleDateString() : 'N/A'}</td>
                                <td>
                                    <button className="action-button">Messages</button>
                                    <button className="action-button" onClick={() => openManageModal(vip)}>Manage</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal.isOpen && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h2>Add New VIP</h2>
                        <p>This will create a new user and return their temporary password. You must then send it to them manually.</p>
                        <form onSubmit={handleAddVip}>
                            <input name="name" value={formData.name} onChange={handleFormChange} placeholder="Full Name" required />
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
                        <h2>Manage Enrollments for {manageUser.profile.name}</h2>
                        
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
        </div>
    );
};

export default VipManager;