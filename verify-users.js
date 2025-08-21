// User Verification Script
// This script checks if users exist in Firebase Authentication
// Run with: node verify-users.js

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  "type": "service_account",
  "project_id": "smartbot-status-dashboard",
  "client_email": "firebase-adminsdk-abc123@smartbot-status-dashboard.iam.gserviceaccount.com", // You'll need to replace this
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" // You'll need to replace this
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://smartbot-status-dashboard-default-rtdb.firebaseio.com'
  });
} catch (error) {
  console.log('⚠️  Admin initialization failed (expected if no service account)');
  console.log('💡 Alternative: Use Firebase Console to check users');
}

async function checkUsers() {
  console.log('🔍 Checking Firebase Authentication users...\n');
  
  const testEmails = [
    'admin@mikesalazaracademy.com',
    'mike@mikesalazaracademy.com',
    'admin@courses.themikesalazar.com'
  ];

  for (const email of testEmails) {
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      console.log(`✅ User exists: ${email}`);
      console.log(`   - UID: ${userRecord.uid}`);
      console.log(`   - Created: ${userRecord.metadata.creationTime}`);
      console.log(`   - Last login: ${userRecord.metadata.lastSignInTime || 'Never'}`);
      console.log(`   - Disabled: ${userRecord.disabled ? 'Yes' : 'No'}`);
      console.log(`   - Email verified: ${userRecord.emailVerified ? 'Yes' : 'No'}`);
      console.log('');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`❌ User NOT found: ${email}`);
      } else {
        console.log(`⚠️  Error checking ${email}: ${error.message}`);
      }
      console.log('');
    }
  }
}

async function createTestAdmin() {
  console.log('🔧 Creating test admin user...\n');
  
  try {
    const userRecord = await admin.auth().createUser({
      email: 'admin@mikesalazaracademy.com',
      password: 'TempAdmin123!',
      displayName: 'System Administrator',
      emailVerified: true
    });

    console.log('✅ Admin user created successfully!');
    console.log(`   - UID: ${userRecord.uid}`);
    console.log(`   - Email: ${userRecord.email}`);
    console.log('🔐 Password: TempAdmin123!');
    console.log('⚠️  CHANGE PASSWORD AFTER FIRST LOGIN!');

    // Also set user profile in database
    const db = admin.database();
    await db.ref(`/users/${userRecord.uid}/profile`).set({
      name: 'System Administrator',
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@mikesalazaracademy.com',
      role: 'super_admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: 'system'
    });

    console.log('✅ User profile created in database');

  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log('⚠️  User already exists with this email');
    } else {
      console.log(`❌ Error creating user: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  try {
    await checkUsers();
    
    console.log('🎯 Options:');
    console.log('1. If no users found, run: createTestAdmin()');
    console.log('2. If users exist but login fails, check Firebase Console');
    console.log('3. Verify environment variables match Firebase project');
    
    // Uncomment the next line to create admin user
    // await createTestAdmin();
    
  } catch (error) {
    console.log('❌ Script error:', error.message);
    console.log('\n💡 Alternative methods:');
    console.log('1. Use Firebase Console: https://console.firebase.google.com');
    console.log('2. Check Authentication → Users section');
    console.log('3. Add user manually if none exist');
  }
}

main();
