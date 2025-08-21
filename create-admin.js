// Emergency Admin Creation Script
// Run this ONCE to create a new admin user
// Usage: node create-admin.js

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');

// Initialize Firebase Admin (requires service account key)
const serviceAccount = require('./path-to-your-service-account-key.json');

initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

async function createAdminUser() {
  try {
    const email = 'admin@mikesalazaracademy.com';
    const password = 'TempAdmin123!'; // CHANGE THIS IMMEDIATELY AFTER LOGIN
    const displayName = 'System Administrator';

    // Create the user
    const userRecord = await getAuth().createUser({
      email: email,
      password: password,
      displayName: displayName,
      emailVerified: true
    });

    // Set admin role in database
    const db = getDatabase();
    await db.ref(`/users/${userRecord.uid}/profile`).set({
      name: displayName,
      firstName: 'System',
      lastName: 'Administrator', 
      email: email,
      role: 'super_admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: 'system'
    });

    console.log('✅ Admin user created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('🔐 CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
}

createAdminUser();
