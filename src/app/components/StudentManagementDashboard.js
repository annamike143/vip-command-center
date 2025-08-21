// StudentManagementDashboard.js - Complete redesign of student management
// Phase 2: Revolutionary student management interface

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ref, onValue, remove, update, push } from 'firebase/database';
// ✅ FIXED: Import the correct Firebase Auth functions
import { 
    deleteUser, 
    updateProfile, 
    updateEmail, 
    updatePassword,
    updateCurrentUser 
} from 'firebase/auth';
import { database, auth } from '../lib/firebase';
import './StudentManagementDashboard.css';

export default function StudentManagementDashboard() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    // Load users from Firebase Realtime Database
    useEffect(() => {
        const usersRef = ref(database, 'users');
        const unsubscribe = onValue(usersRef, (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                const usersArray = Object.keys(userData).map(key => ({
                    id: key,
                    ...userData[key]
                }));
                setUsers(usersArray);
            } else {
                setUsers([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // ✅ FIXED: Use correct Firebase functions for user operations
    const handleUserUpdate = async (userId, updateData) => {
        try {
            // Update user data in Realtime Database
            const userRef = ref(database, `users/${userId}`);
            await update(userRef, updateData);
            
            // If updating current user's profile
            if (auth.currentUser && auth.currentUser.uid === userId) {
                if (updateData.displayName || updateData.photoURL) {
                    await updateProfile(auth.currentUser, {
                        displayName: updateData.displayName || auth.currentUser.displayName,
                        photoURL: updateData.photoURL || auth.currentUser.photoURL
                    });
                }
                
                if (updateData.email && updateData.email !== auth.currentUser.email) {
                    await updateEmail(auth.currentUser, updateData.email);
                }
            }
            
            console.log('✅ User updated successfully');
        } catch (error) {
            console.error('❌ Error updating user:', error);
            throw error;
        }
    };

    const handleUserDelete = async (userId) => {
        try {
            // Remove user data from Realtime Database
            const userRef = ref(database, `users/${userId}`);
            await remove(userRef);
            
            // Note: Deleting user authentication requires admin privileges
            // This would typically be done through Firebase Admin SDK on the backend
            console.log('✅ User data removed from database');
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            throw error;
        }
    };

    const handleFreezeUser = async (userId) => {
        try {
            await handleUserUpdate(userId, { 
                status: 'frozen',
                frozenAt: new Date().toISOString()
            });
            console.log('✅ User frozen successfully');
        } catch (error) {
            console.error('❌ Error freezing user:', error);
        }
    };

    const handleUnfreezeUser = async (userId) => {
        try {
            await handleUserUpdate(userId, { 
                status: 'active',
                unfrozenAt: new Date().toISOString()
            });
            console.log('✅ User unfrozen successfully');
        } catch (error) {
            console.error('❌ Error unfreezing user:', error);
        }
    };

    const handleCreateUser = async (userData) => {
        try {
            const usersRef = ref(database, 'users');
            await push(usersRef, {
                ...userData,
                createdAt: new Date().toISOString(),
                status: 'active'
            });
            console.log('✅ User created successfully');
        } catch (error) {
            console.error('❌ Error creating user:', error);
            throw error;
        }
    };

    // Filter and search users
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                user.name?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;
            
            return matchesSearch && matchesStatus && matchesRole;
        });
    }, [users, searchTerm, statusFilter, roleFilter]);

    // Bulk actions
    const handleBulkAction = async () => {
        if (!bulkAction || selectedUsers.length === 0) return;

        try {
            const promises = selectedUsers.map(userId => {
                switch (bulkAction) {
                    case 'freeze':
                        return handleFreezeUser(userId);
                    case 'unfreeze':
                        return handleUnfreezeUser(userId);
                    case 'delete':
                        return handleUserDelete(userId);
                    default:
                        return Promise.resolve();
                }
            });

            await Promise.all(promises);
            setSelectedUsers([]);
            setBulkAction('');
            console.log(`✅ Bulk ${bulkAction} completed successfully`);
        } catch (error) {
            console.error(`❌ Error in bulk ${bulkAction}:`, error);
        }
    };

    // Modal handlers
    const openDeleteModal = (user) => {
        setModalData({ type: 'delete', user });
        setShowModal(true);
    };

    const openEditModal = (user) => {
        setModalData({ type: 'edit', user });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setModalData(null);
    };

    const confirmAction = async () => {
        if (!modalData) return;

        try {
            switch (modalData.type) {
                case 'delete':
                    await handleUserDelete(modalData.user.id);
                    break;
                case 'edit':
                    await handleUserUpdate(modalData.user.id, modalData.updateData);
                    break;
                default:
                    break;
            }
            closeModal();
        } catch (error) {
            console.error('❌ Error in modal action:', error);
        }
    };

    // Statistics
    const stats = useMemo(() => {
        const total = users.length;
        const active = users.filter(u => u.status === 'active').length;
        const frozen = users.filter(u => u.status === 'frozen').length;
        const newUsers = users.filter(u => {
            const createdDate = new Date(u.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return createdDate > weekAgo;
        }).length;

        return { total, active, frozen, newUsers };
    }, [users]);

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading student data...</p>
            </div>
        );
    }

    return (
        <div className="student-management-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <h1>Student Management Dashboard</h1>
                <div className="header-actions">
                    <button 
                        className="btn-primary"
                        onClick={() => openEditModal(null)}
                    >
                        ➕ Add New Student
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="stats-overview">
                <div className="stat-card">
                    <div className="stat-number">{stats.total}</div>
                    <div className="stat-label">Total Students</div>
                </div>
                <div className="stat-card active">
                    <div className="stat-number">{stats.active}</div>
                    <div className="stat-label">Active Students</div>
                </div>
                <div className="stat-card frozen">
                    <div className="stat-number">{stats.frozen}</div>
                    <div className="stat-label">Frozen Accounts</div>
                </div>
                <div className="stat-card new">
                    <div className="stat-number">{stats.newUsers}</div>
                    <div className="stat-label">New This Week</div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="search-filters">
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search students by name or email..."
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
                        <option value="active">Active</option>
                        <option value="frozen">Frozen</option>
                        <option value="pending">Pending</option>
                    </select>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Roles</option>
                        <option value="student">Student</option>
                        <option value="instructor">Instructor</option>
                        <option value="admin">Admin</option>
                        <option value="vip">VIP</option>
                    </select>
                </div>
                <div className="results-count">
                    Showing {filteredUsers.length} of {users.length} students
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
                <div className="bulk-actions">
                    <span className="bulk-info">
                        {selectedUsers.length} student{selectedUsers.length > 1 ? 's' : ''} selected
                    </span>
                    <select
                        value={bulkAction}
                        onChange={(e) => setBulkAction(e.target.value)}
                        className="bulk-select"
                    >
                        <option value="">Choose Action</option>
                        <option value="freeze">Freeze Accounts</option>
                        <option value="unfreeze">Unfreeze Accounts</option>
                        <option value="delete">Delete Accounts</option>
                    </select>
                    <button 
                        className="btn-warning"
                        onClick={handleBulkAction}
                        disabled={!bulkAction}
                    >
                        Apply Action
                    </button>
                </div>
            )}

            {/* Users Table */}
            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>
                                <input
                                    type="checkbox"
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedUsers(filteredUsers.map(u => u.id));
                                        } else {
                                            setSelectedUsers([]);
                                        }
                                    }}
                                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                />
                            </th>
                            <th>Student</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Join Date</th>
                            <th>Last Active</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr 
                                key={user.id} 
                                className={`user-row ${user.status === 'frozen' ? 'frozen' : ''}`}
                            >
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(user.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedUsers([...selectedUsers, user.id]);
                                            } else {
                                                setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                            }
                                        }}
                                    />
                                </td>
                                <td>
                                    <div className="user-name">
                                        <div className="name-primary">
                                            {user.displayName || user.name || 'No Name'}
                                        </div>
                                        <div className="name-secondary">
                                            ID: {user.id.substring(0, 8)}...
                                        </div>
                                    </div>
                                </td>
                                <td>{user.email}</td>
                                <td>
                                    <span className={`status-badge ${user.role || 'student'}`}>
                                        {user.role || 'student'}
                                    </span>
                                </td>
                                <td>
                                    <span className={`status-badge ${user.status || 'active'}`}>
                                        {user.status || 'active'}
                                    </span>
                                </td>
                                <td>
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                                </td>
                                <td>
                                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                                </td>
                                <td>
                                    <div className="actions-cell">
                                        <button
                                            className="btn-icon"
                                            onClick={() => openEditModal(user)}
                                            title="Edit user"
                                        >
                                            ✏️
                                        </button>
                                        {user.status === 'active' ? (
                                            <button
                                                className="btn-icon freeze"
                                                onClick={() => handleFreezeUser(user.id)}
                                                title="Freeze account"
                                            >
                                                ❄️
                                            </button>
                                        ) : (
                                            <button
                                                className="btn-icon unfreeze"
                                                onClick={() => handleUnfreezeUser(user.id)}
                                                title="Unfreeze account"
                                            >
                                                🔥
                                            </button>
                                        )}
                                        <button
                                            className="btn-icon delete"
                                            onClick={() => openDeleteModal(user)}
                                            title="Delete user"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredUsers.length === 0 && (
                    <div className="no-results">
                        <p>No students found matching your criteria.</p>
                        <p>Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && modalData && (
                <div className="modal-backdrop">
                    <div className={`modal-content ${modalData.type === 'delete' ? 'warning' : ''}`}>
                        {modalData.type === 'delete' ? (
                            <>
                                <h2>⚠️ Confirm Deletion</h2>
                                <div className="user-details">
                                    <p><strong>Student:</strong> {modalData.user.displayName || modalData.user.name}</p>
                                    <p><strong>Email:</strong> {modalData.user.email}</p>
                                    <p><strong>Role:</strong> {modalData.user.role || 'student'}</p>
                                </div>
                                <div className="warning-text">
                                    <strong>This action cannot be undone!</strong>
                                    <ul>
                                        <li>All student data will be permanently deleted</li>
                                        <li>Course progress will be lost</li>
                                        <li>Account access will be revoked immediately</li>
                                    </ul>
                                </div>
                                <div className="modal-actions">
                                    <button className="btn-secondary" onClick={closeModal}>
                                        Cancel
                                    </button>
                                    <button className="btn-danger" onClick={confirmAction}>
                                        Delete Student
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2>{modalData.user ? 'Edit Student' : 'Add New Student'}</h2>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.target);
                                    const updateData = {
                                        displayName: formData.get('name'),
                                        email: formData.get('email'),
                                        role: formData.get('role'),
                                        status: formData.get('status')
                                    };
                                    
                                    if (modalData.user) {
                                        handleUserUpdate(modalData.user.id, updateData);
                                    } else {
                                        handleCreateUser(updateData);
                                    }
                                    closeModal();
                                }}>
                                    <div className="form-group">
                                        <label>Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            defaultValue={modalData.user?.displayName || modalData.user?.name || ''}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            defaultValue={modalData.user?.email || ''}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Role</label>
                                        <select name="role" defaultValue={modalData.user?.role || 'student'}>
                                            <option value="student">Student</option>
                                            <option value="instructor">Instructor</option>
                                            <option value="admin">Admin</option>
                                            <option value="vip">VIP</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Status</label>
                                        <select name="status" defaultValue={modalData.user?.status || 'active'}>
                                            <option value="active">Active</option>
                                            <option value="frozen">Frozen</option>
                                            <option value="pending">Pending</option>
                                        </select>
                                    </div>
                                    <div className="modal-actions">
                                        <button type="button" className="btn-secondary" onClick={closeModal}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn-primary">
                                            {modalData.user ? 'Update Student' : 'Create Student'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
