// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBvG7DHwpAmLUKjB4SQ8YjIIpgeMUgV2rI",
  authDomain: "smartbot-status-dashboard.firebaseapp.com",
  databaseURL: "https://smartbot-status-dashboard-default-rtdb.firebaseio.com",
  projectId: "smartbot-status-dashboard",
  storageBucket: "smartbot-status-dashboard.firebasestorage.app",
  messagingSenderId: "962499826914",
  appId: "1:962499826914:web:2a3e66c7fd20dac4283abb",
  measurementId: "G-DSDQLN7YJ0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);