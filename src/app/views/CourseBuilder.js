// --- src/app/views/CourseBuilder.js (THE DEFINITIVE FINAL VERSION) ---
'use client';

import React, { useState, useEffect } from 'react';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '../lib/firebase';
import './CourseBuilder.css';

const CourseBuilder = () => {
    const [courses, setCourses] = useState({});
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ type: null, data: null });
    const [formData, setFormData] = useState({});
    const [resourceFile, setResourceFile] = useState(null);
    const [resourceTitle, setResourceTitle] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const coursesRef = ref(database, 'courses');
        const unsubscribe = onValue(coursesRef, (snapshot) => {
            setCourses(snapshot.val() || {});
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const openModal = (type, data = {}) => {
        setModal({ type, data });
        setFormData(data.initialData || {});
        setResourceFile(null);
        setResourceTitle('');
    };
    const closeModal = () => setModal({ type: null, data: null });
    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        const { type, data } = modal;
        
        try {
            if (type === 'addCourse' || type === 'editCourse') {
                const { courseId, title, order, isPublished, courseConciergeAssistantId } = formData;
                if (!courseId || !title || !order) return alert("Please fill all required course fields.");
                const path = type === 'addCourse' ? `courses/${courseId}` : `courses/${data.courseId}`;
                await set(ref(database, path), {
                    details: { title, order: parseInt(order, 10), isPublished: isPublished || false },
                    courseConciergeAssistantId: courseConciergeAssistantId || '',
                    modules: type === 'editCourse' ? data.modules : {}
                });
            } else if (type === 'addModule' || type === 'editModule') {
                const { moduleId, title, order } = formData;
                if (!moduleId || !title || !order) return alert("Please fill all required module fields.");
                const path = type === 'addModule' ? `courses/${data.courseId}/modules/${moduleId}` : `courses/${data.courseId}/modules/${data.moduleId}`;
                await set(ref(database, path), {
                    title, order: parseInt(order, 10),
                    lessons: type === 'editModule' ? data.lessons : {}
                });
            } else if (type === 'addLesson' || type === 'editLesson') {
                const { lessonId, title, description, order, videoEmbedCode, recitationAssistantId, unlockCode } = formData;
                if (!lessonId || !title || !order || !unlockCode) return alert("Please fill all required lesson fields.");
                const path = type === 'addLesson' ? `courses/${data.courseId}/modules/${data.moduleId}/lessons/${lessonId}` : `courses/${data.courseId}/modules/${data.moduleId}/lessons/${data.lessonId}`;
                await set(ref(database, path), {
                    title: title || '', description: description || '', unlockCode: unlockCode || '',
                    order: parseInt(order, 10) || 0, videoEmbedCode: videoEmbedCode || '',
                    recitationAssistantId: recitationAssistantId || '',
                    resources: type === 'editLesson' ? data.resources : {}
                });
            }
            closeModal();
        } catch (error) {
            console.error("Error saving data:", error);
            alert(`An error occurred: ${error.message}`);
        }
    };

    const handleRemove = async (type, path) => {
        if (window.confirm(`Are you sure you want to PERMANENTLY DELETE this ${type}?`)) {
            await remove(ref(database, path));
        }
    };

    const handleFileChange = (e) => { if (e.target.files[0]) setResourceFile(e.target.files[0]); };

    const handleAddResource = async () => {
        const { courseId, moduleId, lessonId } = modal.data;
        if (!resourceFile || !resourceTitle.trim()) return alert("Please select a file and provide a title.");
        setUploading(true);
        const fileRef = storageRef(storage, `resources/${courseId}/${lessonId}/${resourceFile.name}`);
        await uploadBytes(fileRef, resourceFile);
        const downloadURL = await getDownloadURL(fileRef);
        const resourcesRef = ref(database, `courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/resources`);
        await push(resourcesRef, { title: resourceTitle, url: downloadURL });
        // Manually update the form data to show the new resource instantly
        const newResources = { ...formData.resources, [Date.now()]: { title: resourceTitle, url: downloadURL } };
        setFormData(prev => ({ ...prev, resources: newResources }));
        setResourceFile(null);
        setResourceTitle('');
        setUploading(false);
    };

    const handleRemoveResource = async (resourceId) => {
        const { courseId, moduleId, lessonId } = modal.data;
        if (window.confirm("Delete this resource?")) {
            await remove(ref(database, `courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/resources/${resourceId}`));
            // Manually update the form data to remove the resource instantly
            const updatedResources = { ...formData.resources };
            delete updatedResources[resourceId];
            setFormData(prev => ({ ...prev, resources: updatedResources }));
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
                                    <button onClick={() => openModal('editCourse', { courseId, modules: course.modules, initialData: { ...course.details, courseConciergeAssistantId: course.courseConciergeAssistantId, courseId: courseId } })}>Edit Course</button>
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
                                                    <button onClick={() => openModal('editModule', { courseId, moduleId, lessons: moduleData.lessons, initialData: { ...moduleData, moduleId: moduleId } })}>Edit</button>
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
                                                                <button onClick={() => openModal('editLesson', { courseId, moduleId, lessonId, initialData: { ...lesson, lessonId: lessonId, resources: lesson.resources } })}>Edit</button>
                                                                <button onClick={() => handleRemove('lesson', `courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`)} className="remove-button">Delete</button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {modal.type && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <h2>
                            {modal.type === 'addCourse' && 'Add New Course'}
                            {modal.type === 'editCourse' && 'Edit Course'}
                            {modal.type === 'addModule' && `Add Module to: ${courses[modal.data.courseId]?.details.title}`}
                            {modal.type === 'editModule' && 'Edit Module'}
                            {modal.type === 'addLesson' && `Add Lesson to: ${courses[modal.data.courseId]?.modules[modal.data.moduleId]?.title}`}
                            {modal.type === 'editLesson' && 'Edit Lesson'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            {/* Fields for Course */}
                            {(modal.type === 'addCourse' || modal.type === 'editCourse') && <>
                                <label>Course ID (Cannot be changed)</label><input name="courseId" value={formData.courseId || ''} onChange={handleFormChange} placeholder="e.g., ai_websites" required disabled={modal.type === 'editCourse'} />
                                <label>Course Title</label><input name="title" value={formData.title || ''} onChange={handleFormChange} required />
                                <label>Order</label><input name="order" type="number" value={formData.order || ''} onChange={handleFormChange} required />
                                <label>Course Concierge Assistant ID</label><input name="courseConciergeAssistantId" value={formData.courseConciergeAssistantId || ''} onChange={handleFormChange} placeholder="asst_..." />
                                <div className="checkbox-wrapper"><input type="checkbox" name="isPublished" checked={formData.isPublished || false} onChange={handleFormChange} id="isPublished" /><label htmlFor="isPublished">Publish this course</label></div>
                            </>}
                            
                            {/* Fields for Module */}
                            {(modal.type === 'addModule' || modal.type === 'editModule') && <>
                                <label>Module ID (Cannot be changed)</label><input name="moduleId" value={formData.moduleId || ''} onChange={handleFormChange} placeholder="e.g., module_01" required disabled={modal.type === 'editModule'} />
                                <label>Module Title</label><input name="title" value={formData.title || ''} onChange={handleFormChange} required />
                                <label>Order</label><input name="order" type="number" value={formData.order || ''} onChange={handleFormChange} required />
                            </>}

                            {/* Fields for Lesson */}
                            {(modal.type === 'addLesson' || modal.type === 'editLesson') && <>
                                <label>Lesson ID (Cannot be changed)</label><input name="lessonId" value={formData.lessonId || ''} onChange={handleFormChange} required disabled={modal.type === 'editLesson'} />
                                <label>Lesson Title</label><input name="title" value={formData.title || ''} onChange={handleFormChange} required />
                                <label>Description</label><textarea name="description" value={formData.description || ''} onChange={handleFormChange} />
                                <label>Order</label><input name="order" type="number" value={formData.order || ''} onChange={handleFormChange} required />
                                <label>Groove Video Embed Code</label><textarea name="videoEmbedCode" value={formData.videoEmbedCode || ''} onChange={handleFormChange} />
                                <label>Lesson Coach Assistant ID</label><input name="recitationAssistantId" value={formData.recitationAssistantId || ''} onChange={handleFormChange} placeholder="asst_..." />
                                <label>Unlock Code</label><input name="unlockCode" value={formData.unlockCode || ''} onChange={handleFormChange} required />
                            </>}
                            
                            <div className="modal-actions">
                                <button type="button" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="submit-button">Save Changes</button>
                            </div>
                        </form>

                        {modal.type === 'editLesson' && (
                            <div className="resource-manager">
                                <h4>Manage Resources</h4>
                                <div className="resource-list">
                                    {formData.resources && Object.keys(formData.resources).map(key => (
                                        <div key={key} className="resource-item">
                                            <span>{formData.resources[key].title}</span>
                                            <button type="button" onClick={() => handleRemoveResource(key)} className="remove-button">Remove</button>
                                        </div>
                                    ))}
                                </div>
                                <div className="add-resource-form">
                                    <input type="text" value={resourceTitle} onChange={(e) => setResourceTitle(e.target.value)} placeholder="Resource Title" />
                                    <input type="file" onChange={handleFileChange} />
                                    <button type="button" onClick={handleAddResource} disabled={uploading}>{uploading ? 'Uploading...' : '+ Add'}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseBuilder;