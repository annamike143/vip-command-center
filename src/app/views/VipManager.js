// --- src/app/views/VipManager.js (v1.1 - DEFINITIVE PURITY FIX) ---
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { database } from '../lib/firebase';
import './VipManager.css';

const VipManager = () => {
    const [vips, setVips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ isOpen: false, data: null });
    const [formData, setFormData] = useState({ name: '', email: '' });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const usersRef = ref(database, 'users');
        const unsubscribe = onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            const vipsList = data ? Object.keys(data).map(key => ({ id: key, ...data[key].profile })) : [];
            setVips(vipsList);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const openModal = () => {
        setFormData({ name: '', email: '' });
        setModal({ isOpen: true, data: null });
        setError('');
    };
    const closeModal = () => setModal({ isOpen: false, data: null });
    const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleAddVip = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        const functions = getFunctions();
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
                                <td>{vip.name}</td>
                                <td>{vip.email}</td>
                                <td>{vip.dateEnrolled ? new Date(vip.dateEnrolled).toLocaleDateString() : 'N/A'}</td>
                                <td>
                                    <button className="action-button">Messages</button>
                                    <button className="action-button">Edit</button>
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
        </div>
    );
};

export default VipManager;