// --- Cross-System Communication API ---
import { NextResponse } from 'next/server';
import { database } from '../../lib/firebase';
import { ref, get, set, push, serverTimestamp } from 'firebase/database';

// GET /api/cross-system - Get communication status between systems
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        switch (action) {
            case 'health':
                // Check if both systems are communicating properly
                const healthRef = ref(database, 'system-health/command-center');
                const healthSnapshot = await get(healthRef);
                
                return NextResponse.json({
                    success: true,
                    status: 'healthy',
                    lastCheck: new Date().toISOString(),
                    data: healthSnapshot.val() || {}
                });

            case 'user-sync-status':
                // Check user synchronization status between systems
                const userId = searchParams.get('userId');
                if (!userId) {
                    return NextResponse.json({ error: 'userId required' }, { status: 400 });
                }

                const userRef = ref(database, `users/${userId}/profile`);
                const userSnapshot = await get(userRef);
                
                return NextResponse.json({
                    success: true,
                    userExists: userSnapshot.exists(),
                    lastSync: userSnapshot.val()?.lastSync || null
                });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Cross-system API GET error:', error);
        return NextResponse.json({ 
            error: 'Failed to process request',
            details: error.message 
        }, { status: 500 });
    }
}

// POST /api/cross-system - Handle cross-system communications
export async function POST(request) {
    try {
        const { action, data } = await request.json();

        switch (action) {
            case 'sync-user-progress':
                // Sync user progress from learning realm to command center
                const { userId, progressData } = data;
                
                if (!userId || !progressData) {
                    return NextResponse.json({ 
                        error: 'userId and progressData required' 
                    }, { status: 400 });
                }

                const progressRef = ref(database, `admin-dashboard/user-progress/${userId}`);
                await set(progressRef, {
                    ...progressData,
                    lastUpdated: serverTimestamp(),
                    syncedFrom: 'learning-realm'
                });

                return NextResponse.json({ 
                    success: true, 
                    message: 'User progress synced successfully' 
                });

            case 'notify-admin':
                // Send notification from learning realm to command center
                const { type, message, metadata } = data;
                
                const notificationRef = ref(database, 'admin-notifications');
                await push(notificationRef, {
                    type,
                    message,
                    metadata: metadata || {},
                    timestamp: serverTimestamp(),
                    read: false,
                    source: 'learning-realm'
                });

                return NextResponse.json({ 
                    success: true, 
                    message: 'Admin notification sent' 
                });

            case 'update-system-status':
                // Update system status for monitoring
                const { system, status, metrics } = data;
                
                const statusRef = ref(database, `system-health/${system}`);
                await set(statusRef, {
                    status,
                    metrics: metrics || {},
                    lastUpdate: serverTimestamp()
                });

                return NextResponse.json({ 
                    success: true, 
                    message: 'System status updated' 
                });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Cross-system API POST error:', error);
        return NextResponse.json({ 
            error: 'Failed to process request',
            details: error.message 
        }, { status: 500 });
    }
}
