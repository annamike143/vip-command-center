// --- functions/index.js (THE DEFINITIVE, UNBREAKABLE FINAL VERSION) ---

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getDatabase } = require("firebase-admin/database");
const { defineSecret } = require("firebase-functions/params");
const OpenAI = require("openai");

// Define secret for OpenAI API key
const openaiKey = defineSecret("OPENAI_KEY");

initializeApp();

// --- addNewVip Function (ENHANCED - Supports both name formats) ---
exports.addNewVip = onCall({ cors: true }, async (request) => {
    if (!request.auth) { throw new HttpsError("unauthenticated", "Auth Error."); }
    
    // Support both old format (name) and new format (firstName + lastName)
    const { name, firstName, lastName, email } = request.data;
    
    // Determine the full name
    let fullName = name;
    if (!fullName && firstName && lastName) {
        fullName = `${firstName.trim()} ${lastName.trim()}`;
    } else if (!fullName && firstName) {
        fullName = firstName.trim();
    }
    
    // Validate required fields
    if (!fullName || !email) { 
        throw new HttpsError("invalid-argument", "Name and email required."); 
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new HttpsError("invalid-argument", "Valid email address required.");
    }
    
    try {
        const tempPassword = Math.random().toString(36).slice(-8);
        const userRecord = await getAuth().createUser({ 
            email, 
            password: tempPassword, 
            displayName: fullName 
        });
        
        const db = getDatabase();
        
        // Create enhanced user profile with new structure
        const userProfile = {
            // Support both formats for backward compatibility
            name: fullName,
            firstName: firstName?.trim() || fullName.split(' ')[0] || 'User',
            lastName: lastName?.trim() || fullName.split(' ').slice(1).join(' ') || '',
            email: email.trim(),
            status: 'active',
            role: 'student',
            createdAt: new Date().toISOString(),
            dateEnrolled: new Date().toISOString(), // Keep for backward compatibility
            createdBy: request.auth.uid,
            tempPassword // Store temporarily for admin reference
        };
        
        await db.ref(`/users/${userRecord.uid}/profile`).set(userProfile);
        
        logger.info(`New VIP created: ${fullName} (${email}) by ${request.auth.uid}`);
        
        return { 
            success: true, 
            message: `Success! VIP created. Temp password: ${tempPassword}`,
            userId: userRecord.uid,
            userProfile: {
                name: fullName,
                firstName: userProfile.firstName,
                lastName: userProfile.lastName,
                email: userProfile.email
            }
        };
        
    } catch (error) {
        logger.error("Error in addNewVip:", error);
        if (error.code === 'auth/email-already-exists') { 
            throw new HttpsError("already-exists", "Email already in use."); 
        }
        throw new HttpsError("internal", "Internal server error.");
    }
});

// --- unlockNextLesson Function (UNCOLLAPSED AND PERFECTED) ---
exports.unlockNextLesson = onCall({ cors: true }, async (request) => {
    if (!request.auth) { throw new HttpsError("unauthenticated", "You must be logged in."); }
    const { courseId, currentLessonId, unlockCode } = request.data;
    const uid = request.auth.uid;
    if (!courseId || !currentLessonId || !unlockCode) { throw new HttpsError("invalid-argument", "Missing required info."); }

    const db = getDatabase();
    const modulesRef = db.ref(`/courses/${courseId}/modules`);
    const modulesSnapshot = await modulesRef.once("value");
    const modules = modulesSnapshot.val();

    let currentLessonData = null;
    let nextLessonId = null;
    let foundCurrent = false;

    if (!modules) throw new HttpsError("not-found", "Course content not found.");
    const sortedModuleKeys = Object.keys(modules).sort((a,b) => modules[a].order - modules[b].order);
    
    for (const moduleId of sortedModuleKeys) {
        const moduleData = modules[moduleId];
        if (moduleData.lessons) {
            const sortedLessonKeys = Object.keys(moduleData.lessons).sort((a,b) => moduleData.lessons[a].order - moduleData.lessons[b].order);
            for (const lessonId of sortedLessonKeys) {
                if (foundCurrent) { nextLessonId = lessonId; break; }
                if (lessonId === currentLessonId) { currentLessonData = moduleData.lessons[lessonId]; foundCurrent = true; }
            }
        }
        if (nextLessonId) break;
    }

    if (!currentLessonData) { throw new HttpsError("not-found", "Current lesson not found."); }
    if (currentLessonData.unlockCode !== unlockCode) { throw new HttpsError("permission-denied", "Incorrect unlock code."); }
    
    const userProgressRef = db.ref(`/users/${uid}/enrollments/${courseId}/progress`);
    const dbUpdates = {};
    dbUpdates[`completedLessons/${currentLessonId}`] = true;
    if (nextLessonId) {
        dbUpdates[`unlockedLessons/${nextLessonId}`] = true;
        dbUpdates['currentLessonId'] = nextLessonId;
    }
    await userProgressRef.update(dbUpdates);

    if (nextLessonId) {
        logger.info(`User ${uid} unlocked lesson ${nextLessonId}.`);
        return { success: true, message: `Lesson unlocked!`, nextLessonId: nextLessonId };
    } else {
        logger.info(`User ${uid} completed course ${courseId}.`);
        return { success: true, message: "Congratulations! You have completed the course!" };
    }
});

// --- chatWithAssistant Function (v4.0 - Knowledge Base Architecture) ---
exports.chatWithAssistant = onCall({ cors: true, secrets: [openaiKey] }, async (request) => {
    if (!request.auth) { 
        throw new HttpsError("unauthenticated", "Authentication required."); 
    }
    
    const { chatType, threadId, message, courseId, userId, lessonId } = request.data;
    
    if (!chatType || !message) { 
        throw new HttpsError("invalid-argument", "Chat type and message are required."); 
    }

    const apiKey = openaiKey.value();
    if (!apiKey) {
        throw new HttpsError("internal", "OpenAI API key not configured");
    }

    const openai = new OpenAI({ apiKey });
    const db = getDatabase();

    try {
        // 1. Load AI Settings from Firebase (Global settings)
        const aiSettingsSnapshot = await db.ref('aiSettings').once('value');
        const aiSettings = aiSettingsSnapshot.val() || {};
        
        // 2. Load User Profile for Personalization
        const userSnapshot = await db.ref(`users/${userId}`).once('value');
        const userProfile = userSnapshot.val()?.profile || {};
        
        // 3. Load Course/Lesson Knowledge Base
        let knowledgeBase = '';
        if (chatType === 'qna') {
            // Load course-level knowledge base
            const courseSnapshot = await db.ref(`courses/${courseId}/courseKnowledgeBase`).once('value');
            knowledgeBase = courseSnapshot.val() || '';
        } else if (chatType === 'recitation') {
            // Load lesson-specific knowledge base
            const lessonSnapshot = await db.ref(`courses/${courseId}`).once('value');
            const courseData = lessonSnapshot.val();
            
            // Find the lesson in the course structure
            if (courseData?.modules) {
                for (const moduleId in courseData.modules) {
                    const module = courseData.modules[moduleId];
                    if (module?.lessons?.[lessonId]) {
                        knowledgeBase = module.lessons[lessonId].lessonKnowledgeBase || '';
                        break;
                    }
                }
            }
        }

        // 4. Get system instructions from AI Settings or use knowledge base
        let systemInstructions = '';
        const globalInstructionTemplate = chatType === 'recitation' 
            ? aiSettings.systemInstructions?.coachAssistant?.instructions 
            : aiSettings.systemInstructions?.qnaAssistant?.instructions;
            
        if (knowledgeBase) {
            // Use specific knowledge base for this course/lesson
            systemInstructions = knowledgeBase;
            console.log("[DEBUG] Using specific knowledge base for", chatType);
        } else if (globalInstructionTemplate) {
            // Fall back to global AI settings
            systemInstructions = globalInstructionTemplate;
            console.log("[DEBUG] Using global AI settings for", chatType);
        } else {
            // Ultimate fallback
            console.log("[DEBUG] Using fallback instructions for chatType:", chatType);
            systemInstructions = chatType === 'recitation' 
                ? `You are an encouraging AI Coach helping with lesson recitation. When the user completes successfully, provide unlock code: LESSON_UNLOCKED_${lessonId}`
                : `You are a helpful AI Concierge answering questions about course content.`;
        }

        // 5. Personalize instructions with user data
        if (systemInstructions) {
            systemInstructions = systemInstructions
                .replace(/{firstName}/g, userProfile.firstName || 'Student')
                .replace(/{lastName}/g, userProfile.lastName || '')
                .replace(/{experienceLevel}/g, userProfile.experienceLevel || 'beginner')
                .replace(/{industry}/g, userProfile.industry || 'general')
                .replace(/{currentRole}/g, userProfile.currentRole || 'learner')
                .replace(/{lessonId}/g, lessonId || 'current_lesson')
                .replace(/{courseId}/g, courseId || 'current_course')
                .replace(/{fullName}/g, `${userProfile.firstName || 'Student'} ${userProfile.lastName || ''}`.trim());
        }



        // 6. Handle thread creation/retrieval
        let currentThreadId = threadId;
        
        if (!currentThreadId || typeof currentThreadId !== 'string') {
            const thread = await openai.beta.threads.create({
                metadata: {
                    userId: userId,
                    studentName: userProfile.firstName || 'Student',
                    courseId: courseId || 'unknown',
                    lessonId: lessonId || 'unknown',
                    chatType: chatType
                }
            });
            currentThreadId = thread.id;
            
            // Save thread ID to Firebase
            const threadPath = lessonId 
                ? `users/${userId}/enrollments/${courseId}/progress/lessonThreads/${lessonId}`
                : `messagingThreads/${courseId}/${userId}`;
            await db.ref(threadPath).update({ assistantThreadId: currentThreadId });
        }

        // 7. Add user message to thread
        await openai.beta.threads.messages.create(currentThreadId, {
            role: "user",
            content: message
        });

        // 8. Create run with personalized system instructions
        const runConfig = {
            model: aiSettings.globalSettings?.model || "gpt-4",
            instructions: systemInstructions,
            max_tokens: aiSettings.globalSettings?.maxTokens || 1000,
            temperature: aiSettings.globalSettings?.temperature || 0.7
        };


        
        const run = await openai.beta.threads.runs.create(currentThreadId, runConfig);

        // 9. Wait for completion
        let runStatus;
        let attempts = 0;
        const maxAttempts = 30; // 60 seconds max wait time
        
        do {
            await new Promise(resolve => setTimeout(resolve, 2000));
            runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
            attempts++;
            
            if (attempts >= maxAttempts) {
                throw new HttpsError("internal", 'Run timeout - exceeded maximum wait time');
            }
        } while (runStatus.status === "running" || runStatus.status === "in_progress" || runStatus.status === "queued");

        if (runStatus.status !== "completed") {
            logger.error("AI Run failed:", runStatus);
            throw new HttpsError("internal", `AI run failed with status: ${runStatus.status}`);
        }

        // 10. Get response
        const messages = await openai.beta.threads.messages.list(currentThreadId);
        const assistantResponse = messages.data.find(m => m.run_id === run.id && m.role === 'assistant');

        if (assistantResponse?.content[0]?.type === 'text') {
            const responseText = assistantResponse.content[0].text.value;
            
            // 11. Handle unlock codes for recitation
            let unlockCode = null;
            if (chatType === 'recitation' && responseText.includes('LESSON_UNLOCKED_')) {
                const unlockMatch = responseText.match(/LESSON_UNLOCKED_(\w+)/);
                if (unlockMatch) {
                    unlockCode = unlockMatch[0];
                    
                    // Update user progress
                    const progressRef = db.ref(`users/${userId}/enrollments/${courseId}/progress/lessons/${lessonId}`);
                    await progressRef.update({
                        unlocked: true,
                        unlockedAt: new Date().toISOString(),
                        unlockCode: unlockCode
                    });
                }
            }
            

            return { 
                success: true, 
                response: responseText, 
                threadId: currentThreadId,
                unlockCode: unlockCode,
                knowledgeBaseUsed: knowledgeBase ? 'specific' : 'global'
            };
        } else {
            throw new HttpsError("internal", "Unexpected response format from AI");
        }

    } catch (error) {
        logger.error("Error in knowledge-base chatWithAssistant:", error);
        throw new HttpsError("internal", error.message || "AI communication failed");
    }
});

// --- manageUserAccount Function (NEW - For freeze/unfreeze functionality) ---
exports.manageUserAccount = onCall({ cors: true }, async (request) => {
    if (!request.auth) { 
        throw new HttpsError("unauthenticated", "Authentication required."); 
    }
    
    const { userId, action, reason } = request.data;
    
    // Validate required fields
    if (!userId || !action) {
        throw new HttpsError("invalid-argument", "User ID and action are required.");
    }
    
    // Validate action
    if (!['enable', 'disable'].includes(action)) {
        throw new HttpsError("invalid-argument", "Action must be 'enable' or 'disable'.");
    }
    
    try {
        const auth = getAuth();
        
        if (action === 'disable') {
            // Disable the user account
            await auth.updateUser(userId, {
                disabled: true
            });
            
            // Log the action
            const db = getDatabase();
            await db.ref(`admin/userActions/${userId}`).push({
                action: 'account_disabled',
                reason: reason || 'Account frozen by admin',
                timestamp: new Date().toISOString(),
                performedBy: request.auth.uid
            });
            
            logger.info(`User account disabled: ${userId} by ${request.auth.uid}`);
            
        } else if (action === 'enable') {
            // Enable the user account
            await auth.updateUser(userId, {
                disabled: false
            });
            
            // Log the action
            const db = getDatabase();
            await db.ref(`admin/userActions/${userId}`).push({
                action: 'account_enabled',
                reason: reason || 'Account unfrozen by admin',
                timestamp: new Date().toISOString(),
                performedBy: request.auth.uid
            });
            
            logger.info(`User account enabled: ${userId} by ${request.auth.uid}`);
        }
        
        return { 
            success: true, 
            message: `User account ${action}d successfully`,
            userId: userId,
            action: action
        };
        
    } catch (error) {
        logger.error(`Error ${action}ing user account:`, error);
        throw new HttpsError("internal", `Failed to ${action} user account: ${error.message}`);
    }
});