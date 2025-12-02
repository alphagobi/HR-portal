// Mock activity log service
const MOCK_ACTIVITIES = [
    { id: 1, text: 'System initialized', time: '2023-11-20T10:00:00.000Z', type: 'system' }
];

const getStoredActivities = () => {
    const stored = localStorage.getItem('hr_activities');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to parse stored activities", e);
            localStorage.removeItem('hr_activities');
        }
    }
    localStorage.setItem('hr_activities', JSON.stringify(MOCK_ACTIVITIES));
    return MOCK_ACTIVITIES;
};

export const getRecentActivities = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const activities = getStoredActivities();
            // Sort by time descending and take top 10
            const sorted = activities.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
            resolve(sorted);
        }, 300);
    });
};

export const logActivity = async (text, type = 'info') => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const activities = getStoredActivities();
            const newActivity = {
                id: Date.now(),
                text,
                time: new Date().toISOString(),
                type
            };
            activities.unshift(newActivity);
            localStorage.setItem('hr_activities', JSON.stringify(activities));
            resolve(newActivity);
        }, 100);
    });
};
