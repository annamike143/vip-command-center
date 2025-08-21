// --- Analytics API Endpoint ---
import { database } from '../../lib/firebase';
import { ref, push, serverTimestamp } from 'firebase/database';

export async function POST(request) {
  try {
    const event = await request.json();

    // Validate event structure
    if (!event.name || !event.timestamp || !event.sessionId) {
      return Response.json(
        { error: 'Missing required fields: name, timestamp, sessionId' },
        { status: 400 }
      );
    }

    // Add server timestamp
    const analyticsEvent = {
      ...event,
      serverTimestamp: serverTimestamp(),
      environment: process.env.NODE_ENV,
      platform: 'command-center'
    };

    // Store in Firebase
    const analyticsRef = ref(database, 'analytics/admin-events');
    await push(analyticsRef, analyticsEvent);

    // Log important admin events
    if (process.env.NODE_ENV === 'development') {
      console.log('Admin analytics event stored:', event.name);
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('Analytics API error:', error);
    
    return Response.json(
      { error: 'Failed to store analytics event' },
      { status: 500 }
    );
  }
}
