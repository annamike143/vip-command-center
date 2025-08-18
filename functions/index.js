// --- functions/index.js (DEFINITIVE FINAL VERSION - All Functions) ---
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getDatabase } = require("firebase-admin/database");

initializeApp();

// --- FUNCTION #1: Add New VIP ---
exports.addNewVip = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication Error: You must be a logged-in admin.");
    }
    const { name, email } = request.data;
    if (!name || !email) {
        throw new HttpsError("invalid-argument", "Invalid Argument: Please provide both a name and an email.");
    }
    try {
        const tempPassword = Math.random().toString(36).slice(-8);
        const userRecord = await getAuth().createUser({
            email: email,
            password: tempPassword,
            displayName: name,
        });
        const db = getDatabase();
        const userRef = db.ref(`/users/${userRecord.uid}/profile`);
        await userRef.set({
            name: userRecord.displayName,
            email: userRecord.email,
            dateEnrolled: new Date().toISOString()
        });
        console.log(`Successfully created new VIP: ${name} (${email})`);
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

// --- FUNCTION #2: Unlock Next Lesson ---
exports.unlockNextLesson = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication Error: You must be logged in to unlock lessons.");
    }

    const { courseId, currentLessonId, unlockCode } = request.data;
    const uid = request.auth.uid;

    if (!courseId || !currentLessonId || !unlockCode) {
        throw new HttpsError("invalid-argument", "Invalid Argument: Missing required information.");
    }

    const db = getDatabase();
    const modulesRef = db.ref(`/courses/${courseId}/modules`);
    const modulesSnapshot = await modulesRef.once("value");
    const modules = modulesSnapshot.val();

    if (!modules) throw new HttpsError("not-found", "Course content not found.");

    let currentLessonData = null;
    let nextLessonId = null;
    let foundCurrent = false;

    const sortedModuleKeys = Object.keys(modules).sort((a, b) => modules[a].order - modules[b].order);
    
    for (const moduleId of sortedModuleKeys) {
        const moduleData = modules[moduleId];
        if (moduleData.lessons) {
            const sortedLessonKeys = Object.keys(moduleData.lessons).sort((a, b) => moduleData.lessons[a].order - moduleData.lessons[b].order);
            for (const lessonId of sortedLessonKeys) {
                if (foundCurrent) {
                    nextLessonId = lessonId;
                    break;
                }
                if (lessonId === currentLessonId) {
                    currentLessonData = moduleData.lessons[lessonId];
                    foundCurrent = true;
                }
            }
        }
        if (nextLessonId) break;
    }

    if (!currentLessonData) {
        throw new HttpsError("not-found", "Current lesson could not be found.");
    }
    if (currentLessonData.unlockCode !== unlockCode) {
        throw new HttpsError("permission-denied", "Incorrect unlock code. Please try again.");
    }

    const userEnrollmentRef = db.ref(`/users/${uid}/enrollments/${courseId}`);

    if (nextLessonId) {
        // Unlock the next lesson
        const unlockedLessonsRef = userEnrollmentRef.child('progress/unlockedLessons');
        await unlockedLessonsRef.update({ [nextLessonId]: true });

        // Mark the current lesson as completed
        const completedLessonsRef = userEnrollmentRef.child('progress/completedLessons');
        await completedLessonsRef.update({ [currentLessonId]: true });
        
        // Update the user's current position to the new lesson
        await userEnrollmentRef.child('progress/currentLessonId').set(nextLessonId);

        console.log(`User ${uid} successfully unlocked lesson ${nextLessonId}`);
        return { success: true, message: `Lesson unlocked!`, nextLessonId: nextLessonId };
    } else {
        // This is the last lesson of the course
        await userEnrollmentRef.child('progress/completedLessons').update({ [currentLessonId]: true });
        await userEnrollmentRef.child('status').set('completed'); // Mark the course as completed

        console.log(`User ${uid} completed the course ${courseId}.`);
        return { success: true, message: "Congratulations! You have completed the entire course!" };
    }
});
// --- Add this new function to functions/index.js ---
const OpenAI = require("openai");

/**
 * Securely interacts with the OpenAI Assistants API.
 */
exports.chatWithAssistant = onCall({
    cors: true,
    secrets: ["OPENAI_KEY"] // <-- RESTORE THIS LINE
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in.");
    }

    const { assistantId, threadId, message, courseId, userId } = request.data;
    if (!assistantId || !message) {
        throw new HttpsError("invalid-argument", "Missing required information.");
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
    let currentThreadId = threadId;

    try {
        // 1. If no threadId is provided, create a new one.
        if (!currentThreadId) {
            const thread = await openai.beta.threads.create();
            currentThreadId = thread.id;

            // Save the new threadId to the user's profile for this course
            const db = getDatabase();
            await update(ref(db, `messagingThreads/${courseId}/${userId}`), {
                assistantThreadId: currentThreadId
            });
        }

        // 2. Add the user's message to the thread.
        await openai.beta.threads.messages.create(currentThreadId, {
            role: "user",
            content: message,
        });

        // 3. Run the assistant.
        const run = await openai.beta.threads.runs.create(currentThreadId, {
            assistant_id: assistantId,
        });

        // 4. Wait for the run to complete.
        let runStatus;
        do {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
            runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
        } while (runStatus.status === "running" || runStatus.status === "in_progress" || runStatus.status === "queued");

        if (runStatus.status !== "completed") {
            throw new HttpsError("internal", "AI run failed with status: " + runStatus.status);
        }

        // 5. Retrieve the latest messages from the thread.
        const messages = await openai.beta.threads.messages.list(currentThreadId);
        const assistantResponse = messages.data.find(m => m.run_id === run.id && m.role === 'assistant');

        if (assistantResponse && assistantResponse.content[0].type === 'text') {
            return { success: true, response: assistantResponse.content[0].text.value, threadId: currentThreadId };
        } else {
            return { success: true, response: "I was unable to generate a response. Please try again.", threadId: currentThreadId };
        }

    } catch (error) {
        console.error("Error with OpenAI Assistant:", error);
        throw new HttpsError("internal", "An error occurred while communicating with the AI.");
    }
});