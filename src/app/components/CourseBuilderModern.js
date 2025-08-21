/* eslint-disable react/no-unescaped-entities */
// --- Enhanced Course Builder v4.0 - Knowledge Base Management ---
'use client';

import React, { useState, useEffect } from 'react';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '../lib/firebase';
import ThemeManager from '../components/ThemeManager';
import './CourseBuilderModern.css';

const CourseBuilderModern = () => {
    const [courses, setCourses] = useState({});
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ type: null, data: null });
    const [formData, setFormData] = useState({});
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [resourceFile, setResourceFile] = useState(null);
    const [resourceTitle, setResourceTitle] = useState('');
    const [uploading, setUploading] = useState(false);
    const [expandedCourses, setExpandedCourses] = useState({}); // Track which courses are expanded

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
        setThumbnailFile(null);
        setResourceFile(null);
        setResourceTitle('');
        
        // Auto-expand course when editing
        if (data.courseId) {
            setExpandedCourses(prev => ({ ...prev, [data.courseId]: true }));
        }
    };
    
    const closeModal = () => setModal({ type: null, data: null });

    const toggleCourseExpansion = (courseId) => {
        setExpandedCourses(prev => ({
            ...prev,
            [courseId]: !prev[courseId]
        }));
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleThumbnailFileChange = (e) => {
        if (e.target.files[0]) setThumbnailFile(e.target.files[0]);
    };

    const handleResourceFileChange = (e) => {
        if (e.target.files[0]) setResourceFile(e.target.files[0]);
    };

    const getPreviewText = (knowledgeBase) => {
        if (!knowledgeBase) return 'No knowledge base content yet...';
        
        return knowledgeBase
            .replace(/{firstName}/g, previewData.firstName)
            .replace(/{lastName}/g, previewData.lastName)
            .replace(/{experienceLevel}/g, previewData.experienceLevel)
            .replace(/{industry}/g, previewData.industry)
            .replace(/{lessonId}/g, previewData.lessonId)
            .replace(/{courseId}/g, previewData.courseId)
            .replace(/{fullName}/g, `${previewData.firstName} ${previewData.lastName}`);
    };

    const getDefaultKnowledgeBase = (type, courseTitle = '', lessonTitle = '') => {
        if (type === 'course') {
            return `You are a helpful AI Concierge for the "${courseTitle}" course.

Your role:
- Answer questions about course content and structure
- Provide technical support and guidance
- Help students navigate the learning materials
- Offer encouragement and motivation

Personalization:
- Always address the student as {firstName}
- Adapt explanations to their {experienceLevel} level
- Use examples relevant to their {industry} field
- Reference their progress in {courseId}

Response style:
- Professional yet friendly
- Patient and thorough
- Encouraging and supportive
- Clear and easy to understand

Remember: You are specifically trained on the "${courseTitle}" course content and should focus your responses on helping students succeed in this course.`;
        } else {
            return `You are an AI Coach for the "${lessonTitle}" lesson assessment.

Your role:
- Guide {firstName} through the lesson recitation
- Assess their understanding of the material
- Provide constructive feedback
- Award unlock codes when appropriate

Assessment criteria:
- Check understanding of key concepts
- Verify practical application knowledge
- Ensure readiness for next lesson
- Encourage continued learning

When the student demonstrates mastery, provide their unlock code: LESSON_UNLOCKED_{lessonId}

Personalization:
- Address them as {firstName} throughout
- Adapt coaching style to their {experienceLevel}
- Use examples from their {industry} when helpful
- Celebrate their achievements

Remember: Be encouraging but thorough in your assessment. The unlock code should only be given when the student truly understands the lesson material.`;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { type, data } = modal;
        setUploading(true);
        
        try {
            if (type === 'addCourse' || type === 'editCourse') {
                const { courseId, title, order, status, comingSoon, courseKnowledgeBase, thumbnailUrl } = formData;
                const finalCourseId = type === 'addCourse' ? courseId : data.courseId;
                if (!finalCourseId) { alert("Course ID is required."); setUploading(false); return; }
                
                let finalThumbnailUrl = thumbnailUrl || '';
                if (thumbnailFile) {
                    setUploading(true);
                    const fileRef = storageRef(storage, `course-thumbnails/${finalCourseId}/${thumbnailFile.name}`);
                    await uploadBytes(fileRef, thumbnailFile);
                    finalThumbnailUrl = await getDownloadURL(fileRef);
                    setUploading(false);
                }

                const path = `courses/${finalCourseId}`;
                const existingModules = data?.modules || {};
                await set(ref(database, path), {
                    details: { 
                        title: title || '', 
                        order: parseInt(order, 10) || 0, 
                        status: status || 'Draft',
                        comingSoon: comingSoon || false,
                        thumbnailUrl: finalThumbnailUrl 
                    },
                    courseKnowledgeBase: courseKnowledgeBase || getDefaultKnowledgeBase('course', title),
                    modules: existingModules
                });
            } else if (type === 'addModule' || type === 'editModule') {
                const { moduleId, title, order } = formData;
                const finalModuleId = type === 'addModule' ? moduleId : data.moduleId;
                const path = `courses/${data.courseId}/modules/${finalModuleId}`;
                const existingLessons = data?.lessons || {};
                await set(ref(database, path), {
                    title: title, order: parseInt(order, 10), lessons: existingLessons
                });
            } else if (type === 'addLesson' || type === 'editLesson') {
                const { lessonId, title, description, order, videoEmbedCode, lessonKnowledgeBase, unlockCode, instructorMessage } = formData;
                const finalLessonId = type === 'addLesson' ? lessonId : data.lessonId;
                const path = `courses/${data.courseId}/modules/${data.moduleId}/lessons/${finalLessonId}`;
                const existingResources = data?.resources || {};
                await set(ref(database, path), {
                    title, description, unlockCode, order: parseInt(order, 10),
                    videoEmbedCode: videoEmbedCode || '',
                    lessonKnowledgeBase: lessonKnowledgeBase || getDefaultKnowledgeBase('lesson', '', title),
                    instructorMessage: instructorMessage || '',
                    resources: existingResources
                });
            }
            closeModal();
        } catch (error) {
            console.error("Error saving data:", error);
            alert(`An error occurred: ${error.message}`);
        }
        setUploading(false);
    };

    const handleRemove = async (type, path) => {
        if (window.confirm(`Are you sure you want to PERMANENTLY DELETE this ${type}?`)) {
            await remove(ref(database, path));
        }
    };

    const handleAddResource = async () => {
        const { courseId, moduleId, lessonId } = modal.data;
        if (!resourceFile || !resourceTitle.trim()) return alert("Please select a file and provide a title.");
        setUploading(true);
        const fileRef = storageRef(storage, `resources/${courseId}/${lessonId}/${resourceFile.name}`);
        await uploadBytes(fileRef, resourceFile);
        const downloadURL = await getDownloadURL(fileRef);
        
        const resourcesRef = ref(database, `courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/resources`);
        const newResourceRef = push(resourcesRef);
        await set(newResourceRef, { title: resourceTitle, url: downloadURL });
        
        const newResource = { [newResourceRef.key]: { title: resourceTitle, url: downloadURL } };
        const newResources = { ...formData.resources, ...newResource };
        setFormData(prev => ({ ...prev, resources: newResources }));
        setResourceFile(null);
        setResourceTitle('');
        setUploading(false);
    };

    const handleRemoveResource = async (resourceId) => {
        const { courseId, moduleId, lessonId } = modal.data;
        if (window.confirm("Delete this resource?")) {
            await remove(ref(database, `courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/resources/${resourceId}`));
            const updatedResources = { ...formData.resources };
            delete updatedResources[resourceId];
            setFormData(prev => ({ ...prev, resources: updatedResources }));
        }
    };

    if (loading) return (
        <div className="builder-container">
            <div className="builder-header">
                <h1>Loading Course Builder...</h1>
            </div>
        </div>
    );

    return (
        <div className="builder-container">
            <div className="builder-header">
                <h1>🎓 Course Builder <span className="pro-badge">Pro</span></h1>
                <div className="header-actions">
                    <button onClick={() => openModal('addCourse')} className="add-button">
                        ✨ Create New Course
                    </button>
                </div>
            </div>

            <div className="courses-list">
                {Object.keys(courses).sort((a,b) => courses[a].details.order - courses[b].details.order).map(courseId => {
                    const course = courses[courseId];
                    return (
                        <div key={courseId} className="course-card">
                            <div className="course-header">
                                <div className="course-title-section">
                                    <h3>📚 {course.details.order}. {course.details.title}</h3>
                                    <button 
                                        className="toggle-expand-button"
                                        onClick={() => toggleCourseExpansion(courseId)}
                                        title={expandedCourses[courseId] ? "Collapse Course" : "Expand Course"}
                                    >
                                        {expandedCourses[courseId] ? '🔽' : '▶️'}
                                    </button>
                                </div>
                                <div className="actions">
                                    <button onClick={() => openModal('editCourse', { 
                                        courseId, 
                                        modules: course.modules, 
                                        initialData: { 
                                            ...course.details, 
                                            courseKnowledgeBase: course.courseKnowledgeBase,
                                            courseId: courseId 
                                        } 
                                    })}>
                                        ✏️ Edit Course
                                    </button>
                                    <button onClick={() => openModal('themeManager', { courseId })}>
                                        🎨 Theme & Branding
                                    </button>
                                    <button onClick={() => handleRemove('course', `courses/${courseId}`)} className="remove-button">
                                        🗑️ Delete
                                    </button>
                                    <button onClick={() => openModal('addModule', { courseId })} className="add-module-button">
                                        ➕ Add Module
                                    </button>
                                </div>
                            </div>
                            {expandedCourses[courseId] && (
                                <div className="modules-container">
                                {course.modules && Object.keys(course.modules).sort((a,b) => course.modules[a].order - course.modules[b].order).map(moduleId => {
                                    const moduleData = course.modules[moduleId];
                                    return (
                                        <div key={moduleId} className="module-item">
                                            <div className="module-item-header">
                                                <h4>📖 {moduleData.order}. {moduleData.title}</h4>
                                                <div className="actions">
                                                    <button onClick={() => openModal('editModule', { 
                                                        courseId, 
                                                        moduleId, 
                                                        lessons: moduleData.lessons, 
                                                        initialData: { ...moduleData, moduleId: moduleId } 
                                                    })}>
                                                        ✏️ Edit
                                                    </button>
                                                    <button onClick={() => handleRemove('module', `courses/${courseId}/modules/${moduleId}`)} className="remove-button">
                                                        🗑️ Delete
                                                    </button>
                                                    <button onClick={() => openModal('addLesson', { courseId, moduleId })} className="add-lesson-button">
                                                        ➕ Add Lesson
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="lessons-container">
                                                {moduleData.lessons && Object.keys(moduleData.lessons).sort((a,b) => moduleData.lessons[a].order - moduleData.lessons[b].order).map(lessonId => {
                                                    const lesson = moduleData.lessons[lessonId];
                                                    return (
                                                        <div key={lessonId} className="lesson-item">
                                                            <span>🎯 {lesson.order}. {lesson.title}</span>
                                                            <div className="actions">
                                                                <button onClick={() => openModal('editLesson', { 
                                                                    courseId, 
                                                                    moduleId, 
                                                                    lessonId, 
                                                                    initialData: { 
                                                                        ...lesson, 
                                                                        lessonId: lessonId, 
                                                                        resources: lesson.resources 
                                                                    } 
                                                                })}>
                                                                    ✏️ Edit
                                                                </button>
                                                                <button onClick={() => handleRemove('lesson', `courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`)} className="remove-button">
                                                                    🗑️ Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {modal.type && modal.type !== 'themeManager' && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <button 
                            type="button" 
                            className="modal-close-button"
                            onClick={closeModal}
                            title="Close Modal"
                        >
                            ✕
                        </button>
                        <h2>
                            {modal.type === 'addCourse' && '✨ Create New Course'}
                            {modal.type === 'editCourse' && '✏️ Edit Course'}
                            {modal.type === 'addModule' && `📖 Add Module to: ${courses[modal.data.courseId]?.details.title}`}
                            {modal.type === 'editModule' && '✏️ Edit Module'}
                            {modal.type === 'addLesson' && `🎯 Add Lesson to: ${courses[modal.data.courseId]?.modules[modal.data.moduleId]?.title}`}
                            {modal.type === 'editLesson' && '✏️ Edit Lesson'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            {/* Fields for Course */}
                            {(modal.type === 'addCourse' || modal.type === 'editCourse') && <>
                                <label>Course ID (Cannot be changed)</label>
                                <input name="courseId" value={formData.courseId || ''} onChange={handleFormChange} placeholder="e.g., ai_websites" required disabled={modal.type === 'editCourse'} />
                                
                                <label>Course Title</label>
                                <input name="title" value={formData.title || ''} onChange={handleFormChange} required />
                                
                                <label>Order</label>
                                <input name="order" type="number" value={formData.order || ''} onChange={handleFormChange} required />
                                
                                <div className="knowledge-base-section">
                                    <h4>🧠 Course AI Knowledge Base</h4>
                                    <p style={{fontSize: '0.9rem', color: '#64748b', margin: '0 0 1rem 0'}}>
                                        This knowledge base will be used for the Q&A assistant throughout the entire course.
                                    </p>
                                    <textarea
                                        name="courseKnowledgeBase"
                                        value={formData.courseKnowledgeBase || getDefaultKnowledgeBase('course', formData.title)}
                                        onChange={handleFormChange}
                                        className="knowledge-base-textarea"
                                        placeholder="Enter the AI knowledge base for this course..."
                                        style={{minHeight: '300px'}}
                                    />
                                    <div className="variable-guide">
                                        <strong>Available variables:</strong> {'{firstName}'}, {'{lastName}'}, {'{experienceLevel}'}, {'{industry}'}, {'{courseId}'}, {'{fullName}'}
                                    </div>
                                </div>
                                
                                <label>Course Thumbnail (Upload New)</label>
                                <input name="thumbnail" type="file" onChange={handleThumbnailFileChange} />
                                {formData.thumbnailUrl && <img src={formData.thumbnailUrl} alt="Current Thumbnail" style={{width: '100px', marginTop: '10px'}} />}
                                
                                <div className="course-lifecycle-controls">
                                    <div className="select-group">
                                        <label>Course Status</label>
                                        <select name="status" value={formData.status || 'Draft'} onChange={handleFormChange}>
                                            <option value="Draft">Draft (Hidden)</option>
                                            <option value="Published">Published (Live)</option>
                                            <option value="Archived">Archived (Legacy)</option>
                                        </select>
                                    </div>
                                    {formData.status === 'Draft' && (
                                        <div className="checkbox-group">
                                            <input 
                                                type="checkbox" 
                                                name="comingSoon" 
                                                checked={formData.comingSoon || false} 
                                                onChange={handleFormChange} 
                                                id="comingSoon" 
                                            />
                                            <label htmlFor="comingSoon">Display as "Coming Soon"</label>
                                        </div>
                                    )}
                                </div>
                            </>}
                            
                            {/* Fields for Module */}
                            {(modal.type === 'addModule' || modal.type === 'editModule') && <>
                                <label>Module ID (Cannot be changed)</label>
                                <input name="moduleId" value={formData.moduleId || ''} onChange={handleFormChange} placeholder="e.g., module_01" required disabled={modal.type === 'editModule'} />
                                
                                <label>Module Title</label>
                                <input name="title" value={formData.title || ''} onChange={handleFormChange} required />
                                
                                <label>Order</label>
                                <input name="order" type="number" value={formData.order || ''} onChange={handleFormChange} required />
                            </>}

                            {/* Fields for Lesson */}
                            {(modal.type === 'addLesson' || modal.type === 'editLesson') && <>
                                <label>Lesson ID (Cannot be changed)</label>
                                <input name="lessonId" value={formData.lessonId || ''} onChange={handleFormChange} required disabled={modal.type === 'editLesson'} />
                                
                                <label>Lesson Title</label>
                                <input name="title" value={formData.title || ''} onChange={handleFormChange} required />
                                
                                <label>Description</label>
                                <textarea name="description" value={formData.description || ''} onChange={handleFormChange} />
                                
                                <label>Order</label>
                                <input name="order" type="number" value={formData.order || ''} onChange={handleFormChange} required />
                                
                                <label>Groove Video Embed Code</label>
                                <textarea name="videoEmbedCode" value={formData.videoEmbedCode || ''} onChange={handleFormChange} />
                                
                                <div className="knowledge-base-section">
                                    <h4>🤖 Lesson AI Coach Knowledge Base</h4>
                                    <p style={{fontSize: '0.9rem', color: '#64748b', margin: '0 0 1rem 0'}}>
                                        This knowledge base will be used specifically for this lesson's recitation assessment.
                                    </p>
                                    <textarea
                                        name="lessonKnowledgeBase"
                                        value={formData.lessonKnowledgeBase || getDefaultKnowledgeBase('lesson', '', formData.title)}
                                        onChange={handleFormChange}
                                        className="knowledge-base-textarea"
                                        placeholder="Enter the AI knowledge base for this specific lesson..."
                                        style={{minHeight: '300px'}}
                                    />
                                    <div className="variable-guide">
                                        <strong>Available variables:</strong> {'{firstName}'}, {'{lastName}'}, {'{experienceLevel}'}, {'{industry}'}, {'{lessonId}'}, {'{courseId}'}, {'{fullName}'}
                                        <br/><strong>Important:</strong> Include "LESSON_UNLOCKED_{'{lessonId}'}" in successful completion responses.
                                    </div>
                                </div>
                                
                                <label>Instructor Welcome Message (Lesson-Specific Popup)</label>
                                <textarea 
                                    name="instructorMessage" 
                                    value={formData.instructorMessage || ''} 
                                    onChange={handleFormChange} 
                                    placeholder="Enter a personalized welcome message for this specific lesson. Use variables: {firstName}, {lastName}, {fullName}, {email}. Example: 'Hello {firstName}, welcome to this lesson!'"
                                    rows="4"
                                    style={{ minHeight: '100px', resize: 'vertical' }}
                                />
                                <small style={{ color: '#6b7280', fontSize: '0.875rem', display: 'block', marginTop: '0.25rem' }}>
                                    💡 Pro tip: Use {'{firstName}'} for personal touch, {'{fullName}'} for formal address
                                </small>
                                
                                <label>Unlock Code</label>
                                <input name="unlockCode" value={formData.unlockCode || ''} onChange={handleFormChange} required />
                            </>}
                            
                            <div className="modal-actions">
                                <button type="button" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="submit-button" disabled={uploading}>
                                    {uploading ? '⏳ Uploading...' : '💾 Save Changes'}
                                </button>
                            </div>
                        </form>

                        {modal.type === 'editLesson' && (
                            <div className="resource-manager">
                                <h4>📁 Manage Resources</h4>
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
                                    <input type="file" onChange={handleResourceFileChange} />
                                    <button type="button" onClick={handleAddResource} disabled={uploading}>
                                        {uploading ? 'Uploading...' : '+ Add'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {modal.type === 'themeManager' && (
                <ThemeManager
                    courseId={modal.data.courseId}
                    onClose={closeModal}
                />
            )}
        </div>
    );
};

export default CourseBuilderModern;
