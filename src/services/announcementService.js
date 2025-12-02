// Announcement Service - API Version

const API_URL = '/api/announcements.php';

export const getAnnouncements = async () => {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Failed to fetch announcements');
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const postAnnouncement = async (announcementData) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(announcementData)
        });
        if (!response.ok) throw new Error('Failed to post announcement');
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};
