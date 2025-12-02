// Activity Service - API Version

const API_URL = '/api/activities.php';

export const getRecentActivities = async () => {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Failed to fetch activities');
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const logActivity = async (text, type = 'info') => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, type })
        });
        if (!response.ok) throw new Error('Failed to log activity');
        return await response.json();
    } catch (error) {
        console.error(error);
        // Fallback to console if logging fails
        console.log(`[Activity Log] ${type}: ${text}`);
    }
};
