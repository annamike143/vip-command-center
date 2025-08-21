// --- Global State Management Context ---
'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, off } from 'firebase/database';
import { auth, database } from '../lib/firebase';

// Initial state structure
const initialState = {
  // User state
  user: null,
  userProfile: null,
  userStatus: 'loading', // 'loading', 'authenticated', 'unauthenticated'
  userRole: null, // 'student', 'admin', 'instructor'
  
  // Course state
  courses: {},
  enrolledCourses: [],
  currentCourse: null,
  currentLesson: null,
  
  // Progress state
  userProgress: {},
  
  // UI state
  loading: true,
  error: null,
  notifications: [],
  sidebarOpen: false,
  
  // Admin state (for command center)
  allUsers: {},
  analytics: {},
  
  // Chat state
  activeChats: {},
  unreadMessages: 0
};

// Action types
const ActionTypes = {
  // User actions
  SET_USER: 'SET_USER',
  SET_USER_PROFILE: 'SET_USER_PROFILE',
  SET_USER_STATUS: 'SET_USER_STATUS',
  SET_USER_ROLE: 'SET_USER_ROLE',
  CLEAR_USER: 'CLEAR_USER',
  
  // Course actions
  SET_COURSES: 'SET_COURSES',
  SET_ENROLLED_COURSES: 'SET_ENROLLED_COURSES',
  SET_CURRENT_COURSE: 'SET_CURRENT_COURSE',
  SET_CURRENT_LESSON: 'SET_CURRENT_LESSON',
  UPDATE_COURSE: 'UPDATE_COURSE',
  
  // Progress actions
  SET_USER_PROGRESS: 'SET_USER_PROGRESS',
  UPDATE_LESSON_PROGRESS: 'UPDATE_LESSON_PROGRESS',
  UNLOCK_LESSON: 'UNLOCK_LESSON',
  COMPLETE_LESSON: 'COMPLETE_LESSON',
  
  // UI actions
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  
  // Admin actions
  SET_ALL_USERS: 'SET_ALL_USERS',
  UPDATE_USER: 'UPDATE_USER',
  SET_ANALYTICS: 'SET_ANALYTICS',
  
  // Chat actions
  SET_ACTIVE_CHATS: 'SET_ACTIVE_CHATS',
  UPDATE_CHAT: 'UPDATE_CHAT',
  SET_UNREAD_MESSAGES: 'SET_UNREAD_MESSAGES'
};

// Reducer function
function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_USER:
      return { ...state, user: action.payload, loading: false };
    
    case ActionTypes.SET_USER_PROFILE:
      return { ...state, userProfile: action.payload };
    
    case ActionTypes.SET_USER_STATUS:
      return { ...state, userStatus: action.payload };
    
    case ActionTypes.SET_USER_ROLE:
      return { ...state, userRole: action.payload };
    
    case ActionTypes.CLEAR_USER:
      return {
        ...state,
        user: null,
        userProfile: null,
        userStatus: 'unauthenticated',
        userRole: null,
        userProgress: {},
        enrolledCourses: [],
        loading: false
      };
    
    case ActionTypes.SET_COURSES:
      return { ...state, courses: action.payload };
    
    case ActionTypes.SET_ENROLLED_COURSES:
      return { ...state, enrolledCourses: action.payload };
    
    case ActionTypes.SET_CURRENT_COURSE:
      return { ...state, currentCourse: action.payload };
    
    case ActionTypes.SET_CURRENT_LESSON:
      return { ...state, currentLesson: action.payload };
    
    case ActionTypes.UPDATE_COURSE:
      return {
        ...state,
        courses: {
          ...state.courses,
          [action.payload.id]: action.payload.data
        }
      };
    
    case ActionTypes.SET_USER_PROGRESS:
      return { ...state, userProgress: action.payload };
    
    case ActionTypes.UPDATE_LESSON_PROGRESS:
      const { courseId, lessonId, progressType, value } = action.payload;
      return {
        ...state,
        userProgress: {
          ...state.userProgress,
          [courseId]: {
            ...state.userProgress[courseId],
            progress: {
              ...state.userProgress[courseId]?.progress,
              [progressType]: {
                ...state.userProgress[courseId]?.progress?.[progressType],
                [lessonId]: value
              }
            }
          }
        }
      };
    
    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    
    case ActionTypes.CLEAR_ERROR:
      return { ...state, error: null };
    
    case ActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
    
    case ActionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    
    case ActionTypes.TOGGLE_SIDEBAR:
      return { ...state, sidebarOpen: !state.sidebarOpen };
    
    case ActionTypes.SET_ALL_USERS:
      return { ...state, allUsers: action.payload };
    
    case ActionTypes.UPDATE_USER:
      return {
        ...state,
        allUsers: {
          ...state.allUsers,
          [action.payload.id]: action.payload.data
        }
      };
    
    case ActionTypes.SET_ANALYTICS:
      return { ...state, analytics: action.payload };
    
    case ActionTypes.SET_ACTIVE_CHATS:
      return { ...state, activeChats: action.payload };
    
    case ActionTypes.UPDATE_CHAT:
      return {
        ...state,
        activeChats: {
          ...state.activeChats,
          [action.payload.id]: action.payload.data
        }
      };
    
    case ActionTypes.SET_UNREAD_MESSAGES:
      return { ...state, unreadMessages: action.payload };
    
    default:
      return state;
  }
}

// Create contexts
const AppStateContext = createContext();
const AppDispatchContext = createContext();

// Provider component
export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Firebase listeners
  useEffect(() => {
    // Auth state listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        dispatch({ type: ActionTypes.SET_USER, payload: firebaseUser });
        dispatch({ type: ActionTypes.SET_USER_STATUS, payload: 'authenticated' });
        
        // Listen to user profile
        const userProfileRef = ref(database, `users/${firebaseUser.uid}/profile`);
        const unsubscribeProfile = onValue(userProfileRef, (snapshot) => {
          const profile = snapshot.val();
          dispatch({ type: ActionTypes.SET_USER_PROFILE, payload: profile });
          dispatch({ type: ActionTypes.SET_USER_ROLE, payload: profile?.role || 'admin' }); // Default to admin for command center
        });

        // Listen to all users (for admin)
        const allUsersRef = ref(database, 'users');
        const unsubscribeAllUsers = onValue(allUsersRef, (snapshot) => {
          const users = snapshot.val() || {};
          dispatch({ type: ActionTypes.SET_ALL_USERS, payload: users });
        });

        // Cleanup function
        return () => {
          off(userProfileRef);
          off(allUsersRef);
        };
      } else {
        dispatch({ type: ActionTypes.CLEAR_USER });
      }
    });

    // Courses listener
    const coursesRef = ref(database, 'courses');
    const unsubscribeCourses = onValue(coursesRef, (snapshot) => {
      const courses = snapshot.val() || {};
      dispatch({ type: ActionTypes.SET_COURSES, payload: courses });
    });

    return () => {
      unsubscribeAuth();
      off(coursesRef);
    };
  }, []);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

// Custom hooks
export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

export function useAppDispatch() {
  const context = useContext(AppDispatchContext);
  if (context === undefined) {
    throw new Error('useAppDispatch must be used within an AppStateProvider');
  }
  return context;
}

// Action creators
export const actions = {
  // User actions
  setUser: (user) => ({ type: ActionTypes.SET_USER, payload: user }),
  setUserProfile: (profile) => ({ type: ActionTypes.SET_USER_PROFILE, payload: profile }),
  setUserStatus: (status) => ({ type: ActionTypes.SET_USER_STATUS, payload: status }),
  setUserRole: (role) => ({ type: ActionTypes.SET_USER_ROLE, payload: role }),
  clearUser: () => ({ type: ActionTypes.CLEAR_USER }),
  
  // Course actions
  setCourses: (courses) => ({ type: ActionTypes.SET_COURSES, payload: courses }),
  setEnrolledCourses: (courses) => ({ type: ActionTypes.SET_ENROLLED_COURSES, payload: courses }),
  setCurrentCourse: (course) => ({ type: ActionTypes.SET_CURRENT_COURSE, payload: course }),
  setCurrentLesson: (lesson) => ({ type: ActionTypes.SET_CURRENT_LESSON, payload: lesson }),
  updateCourse: (id, data) => ({ type: ActionTypes.UPDATE_COURSE, payload: { id, data } }),
  
  // Progress actions
  setUserProgress: (progress) => ({ type: ActionTypes.SET_USER_PROGRESS, payload: progress }),
  updateLessonProgress: (courseId, lessonId, progressType, value) => ({
    type: ActionTypes.UPDATE_LESSON_PROGRESS,
    payload: { courseId, lessonId, progressType, value }
  }),
  
  // UI actions
  setLoading: (loading) => ({ type: ActionTypes.SET_LOADING, payload: loading }),
  setError: (error) => ({ type: ActionTypes.SET_ERROR, payload: error }),
  clearError: () => ({ type: ActionTypes.CLEAR_ERROR }),
  addNotification: (notification) => ({
    type: ActionTypes.ADD_NOTIFICATION,
    payload: { ...notification, id: Date.now() }
  }),
  removeNotification: (id) => ({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id }),
  toggleSidebar: () => ({ type: ActionTypes.TOGGLE_SIDEBAR }),
  
  // Admin actions
  setAllUsers: (users) => ({ type: ActionTypes.SET_ALL_USERS, payload: users }),
  updateUser: (id, data) => ({ type: ActionTypes.UPDATE_USER, payload: { id, data } }),
  setAnalytics: (analytics) => ({ type: ActionTypes.SET_ANALYTICS, payload: analytics }),
  
  // Chat actions
  setActiveChats: (chats) => ({ type: ActionTypes.SET_ACTIVE_CHATS, payload: chats }),
  updateChat: (id, data) => ({ type: ActionTypes.UPDATE_CHAT, payload: { id, data } }),
  setUnreadMessages: (count) => ({ type: ActionTypes.SET_UNREAD_MESSAGES, payload: count })
};

export { ActionTypes };
