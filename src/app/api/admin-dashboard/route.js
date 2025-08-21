// --- Admin Dashboard API for real-time data ---
import { NextResponse } from 'next/server';
import { database } from '../../lib/firebase';
import { ref, get, set, query, orderByChild, limitToLast } from 'firebase/database';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const dataType = searchParams.get('type');
        const limit = parseInt(searchParams.get('limit')) || 50;

        switch (dataType) {
            case 'recent-activity':
                // Get recent user activity across both systems
                const activityRef = query(
                    ref(database, 'analytics/admin-events'),
                    orderByChild('timestamp'),
                    limitToLast(limit)
                );
                const activitySnapshot = await get(activityRef);
                
                return NextResponse.json({
                    success: true,
                    data: Object.values(activitySnapshot.val() || {}).reverse()
                });

            case 'system-metrics':
                // Get real-time system performance metrics
                const metricsRef = ref(database, 'system-health');
                const metricsSnapshot = await get(metricsRef);
                
                return NextResponse.json({
                    success: true,
                    data: metricsSnapshot.val() || {}
                });

            case 'user-stats':
                // Get aggregated user statistics
                const usersRef = ref(database, 'users');
                const usersSnapshot = await get(usersRef);
                const users = usersSnapshot.val() || {};
                
                const stats = {
                    totalUsers: Object.keys(users).length,
                    activeUsers: Object.values(users).filter(user => 
                        user.profile?.status === 'active'
                    ).length,
                    newUsersToday: Object.values(users).filter(user => {
                        const createdAt = user.profile?.createdAt;
                        if (!createdAt) return false;
                        const today = new Date().toDateString();
                        return new Date(createdAt).toDateString() === today;
                    }).length
                };

                return NextResponse.json({
                    success: true,
                    data: stats
                });

            case 'notifications':
                // Get unread admin notifications
                const notificationsRef = query(
                    ref(database, 'admin-notifications'),
                    orderByChild('read'),
                    // Firebase doesn't support false as orderBy value, so we'll filter on client
                );
                const notificationsSnapshot = await get(notificationsRef);
                const allNotifications = Object.values(notificationsSnapshot.val() || {});
                const unreadNotifications = allNotifications
                    .filter(notification => !notification.read)
                    .slice(-limit);

                return NextResponse.json({
                    success: true,
                    data: unreadNotifications
                });

            default:
                return NextResponse.json({ error: 'Invalid data type' }, { status: 400 });
        }

    } catch (error) {
        console.error('Admin dashboard API error:', error);
        return NextResponse.json({ 
            error: 'Failed to fetch dashboard data',
            details: error.message 
        }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { action, data } = await request.json();

        switch (action) {
            case 'mark-notification-read':
                const { notificationId } = data;
                
                if (!notificationId) {
                    return NextResponse.json({ 
                        error: 'notificationId required' 
                    }, { status: 400 });
                }

                const notificationRef = ref(database, `admin-notifications/${notificationId}`);
                await set(notificationRef, { read: true });

                return NextResponse.json({ 
                    success: true, 
                    message: 'Notification marked as read' 
                });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Admin dashboard API POST error:', error);
        return NextResponse.json({ 
            error: 'Failed to process request',
            details: error.message 
        }, { status: 500 });
    }
}
