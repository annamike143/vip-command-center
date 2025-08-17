// --- src/app/views/CourseBuilder.js (v3.0 - Full CRUD Functionality) ---
'use client';

import React, { useState, useEffect } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { database } from '../lib/firebase';
import './CourseBuilder.css';

const CourseBuilder = () => {
    const [courses, setCourses] = useState({});
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ type: null, data: null });
    const [formData, setFormData] = useState({});

    useEffect(() => {
        const coursesRef = ref(database, 'courses');
        const unsubscribe = onValue(coursesRef, (snapshot) => {
            const data = snapshot.val();
            setCourses(data || {});
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const openModal = (type, data = {}) => {
        setModal({ type, data });
        setFormData(data.initialData || {});
    };
    const closeModal = () => setModal({ type: null, data: null });
    const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // --- THE DEFINITIVE, PRECISION-ENGINEERED handleSubmit FUNCTION ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        const { type, data } = modal;

        if (type === 'addCourse' || type === 'editCourse') {
            const { courseId, title, order, isPublished, courseConciergeAssistantId } = formData;
            const path = type === 'addCourse' ? `courses/${courseId}` : `courses/${data.courseId}`;
            
            await set(ref(database, path), {
                details: { 
                    title: title || '', 
                    order: parseInt(order, 10) || 0, 
                    isPublished: isPublished || true 
                },
                courseConciergeAssistantId: courseConciergeAssistantId || '',
                modules: type === 'editCourse' ? data.modules : {}
            });

        } else if (type === 'addModule' || type === 'editModule') {
            const { moduleId, title, order } = formData;
            const path = type === 'addModule' ? `courses/${data.courseId}/modules/${moduleId}` : `courses/${data.courseId}/modules/${data.moduleId}`;
            
            await set(ref(database, path), {
                title: title || '',
                order: parseInt(order, 10) || 0,
                lessons: type === 'editModule' ? data.lessons : {}
            });

        } else if (type === 'addLesson' || type === 'editLesson') {
            const { lessonId, title, description, order, videoEmbedCode, recitationAssistantId, unlockCode } = formData;
            const path = type === 'addLesson' ? `courses/${data.courseId}/modules/${data.moduleId}/lessons/${lessonId}` : `courses/${data.courseId}/modules/${data.moduleId}/lessons/${data.lessonId}`;
            
            await set(ref(database, path), {
                title: title || '', 
                description: description || '', 
                unlockCode: unlockCode || '',
                order: parseInt(order, 10) || 0,
                videoEmbedCode: videoEmbedCode || '',
                recitationAssistantId: recitationAssistantId || ''
            });
        }
        closeModal();
    };

    const handleRemove = async (type, path) => {
        if (window.confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
            await remove(ref(database, path));
        }
    };

    if (loading) return <div>Loading Curriculum...</div>;

    return (
        <div className="builder-container">
            <div className="builder-header">
                <h1>Course Builder</h1>
                <button onClick={() => openModal('addCourse')} className="add-button">+ Add New Course</button>
            </div>

            <div className="courses-list">
                {Object.keys(courses).sort((a,b) => courses[a].details.order - courses[b].details.order).map(courseId => {
                    const course = courses[courseId];
                    return (
                        <div key={courseId} className="course-card">
                            <div className="course-header">
                                <h3>{course.details.order}. {course.details.title}</h3>
                                <div>
                                    <button onClick={() => openModal('editCourse', { courseId, modules: course.modules, initialData: { ...course.details, courseConciergeAssistantId: course.courseConciergeAssistantId } })}>Edit Course</button>
                                    <button onClick={() => handleRemove('course', `courses/${courseId}`)} className="remove-button">Delete</button>
                                    <button onClick={() => openModal('addModule', { courseId })} className="add-module-button">+ Add Module</button>
                                </div>
                            </div>
                            <div className="modules-container">
                                {course.modules && Object.keys(course.modules).sort((a,b) => course.modules[a].order - course.modules[b].order).map(moduleId => {
                                    const moduleData = course.modules[moduleId];
                                    return (
                                        <div key={moduleId} className="module-item">
                                            <div className="module-item-header">
                                                <h4>{moduleData.order}. {moduleData.title}</h4>
                                                <div>
                                                    <button onClick={() => openModal('editModule', { courseId, moduleId, lessons: moduleData.lessons, initialData: { title: moduleData.title, order: moduleData.order } })}>Edit</button>
                                                    <button onClick={() => handleRemove('module', `courses/${courseId}/modules/${moduleId}`)} className="remove-button">Delete</button>
                                                    <button onClick={() => openModal('addLesson', { courseId, moduleId })} className="add-lesson-button">+ Add Lesson</button>
                                                </div>
                                            </div>
                                            <div className="lessons-container">
                                                {moduleData.lessons && Object.keys(moduleData.lessons).sort((a,b) => moduleData.lessons[a].order - moduleData.lessons[b].order).map(lessonId => {
                                                    const lesson = moduleData.lessons[lessonId];
                                                    return (
                                                        <div key={lessonId} className="lesson-item">
                                                            <span>{lesson.order}. {lesson.title}</span>
                                                            <div>
                                                                <button onClick={() => openModal('editLesson', { courseId, moduleId, lessonId, initialData: lesson })}>Edit</button>
                                                                <button onClick={() => handleRemove('lesson', `courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`)} className="remove-button">Delete</button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* --- The Universal Modal --- */}
            {modal.type && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h2>{/* ... Modal Title Logic ... */}</h2>
                        <form onSubmit={handleSubmit}>
                            {/* Fields for Course */}
                            {(modal.type === 'addCourse' || modal.type === 'editCourse') && <>
                                <label>Course ID</label>
                                <input name="courseId" onChange={handleFormChange} placeholder="e.g., ai_websites" defaultValue={formData.courseId} required disabled={modal.type === 'editCourse'} />
                                {/* ... other course fields ... */}
                            </>}
                            
                            {/* Fields for Module */}
                            {(modal.type === 'addModule' || modal.type === 'editModule') && <>
                                <label>Module ID</label>
                                <input name="moduleId" onChange={handleFormChange} placeholder="e.g., module_01" defaultValue={formData.moduleId} required disabled={modal.type === 'editModule'} />
                                {/* ... other module fields ... */}
                            </>}

                            {/* Fields for Lesson */}
                            {(modal.type === 'addLesson' || modal.type === 'editLesson') && <>
                                <label>Lesson ID</label>
                                <input name="lessonId" onChange={handleFormChange} placeholder="e.g., lesson_01" defaultValue={formData.lessonId} required disabled={modal.type === 'editLesson'} />
                                <label>Lesson Title</label>
                                <input name="title" onChange={handleFormChange} placeholder="e.g., Welcome!" defaultValue={formData.title} required />
                                <label>Description</label>
                                <textarea name="description" onChange={handleFormChange} defaultValue={formData.description} />
                                <label>Order</label>
                                <input name="order" type="number" onChange={handleFormChange} defaultValue={formData.order} required />
                                <label>Groove Video Embed Code</label>
                                <textarea name="videoEmbedCode" onChange={handleFormChange} defaultValue={formData.videoEmbedCode} required />
                                <label>Lesson Coach (Recitation) Assistant ID</label>
                                <input name="recitationAssistantId" onChange={handleFormChange} placeholder="asst_..." defaultValue={formData.recitationAssistantId} />
                                <label>Unlock Code</label>
                                <input name="unlockCode" onChange={handleFormChange} defaultValue={formData.unlockCode} required />
                            </>}

                            <div className="modal-actions">
                                <button type="button" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="submit-button">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseBuilder;