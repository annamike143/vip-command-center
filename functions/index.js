// --- functions/index.js (DEFINITIVE MODERN SYNTAX) ---
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getDatabase } = require("firebase-admin/database");

initializeApp();

// This is the modern, v2 syntax for creating an onCall function
exports.addNewVip = onCall({
    // This 'cors' option is the modern, built-in way to handle this.
    // It allows requests from any origin.
    cors: true 
}, async (request) => {

    // 1. Authentication Check
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated", 
            "Authentication Error: You must be a logged-in admin."
        );
    }

    const { name, email } = request.data;
    if (!name || !email) {
        throw new HttpsError(
            "invalid-argument", 
            "Invalid Argument: Please provide both a name and an email."
        );
    }

    try {
        // 2. Create the User in Firebase Authentication
        const tempPassword = Math.random().toString(36).slice(-8);
        const userRecord = await getAuth().createUser({
            email: email,
            password: tempPassword,
            displayName: name,
        });

        // 3. Create the User's Profile in the Realtime Database
        const db = getDatabase();
        const userRef = db.ref(`/users/${userRecord.uid}/profile`);
        await userRef.set({
            name: userRecord.displayName,
            email: userRecord.email,
            dateEnrolled: new Date().toISOString()
        });
        
        console.log(`Successfully created new VIP: ${name} (${email})`);
        
        // 4. Return the temporary password
        return { 
            success: true, 
            message: `Success! VIP created. Temporary password: ${tempPassword}` 
        };

    } catch (error) {
        console.error("Error creating new VIP:", error);
        if (error.code === 'auth/email-already-exists') {
             throw new HttpsError("already-exists", "This email address is already in use.");
        }
        throw new HttpsError("internal", "An internal server error occurred.");
    }
});