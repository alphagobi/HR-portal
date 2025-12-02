// Announcement Service - API Version

const API_URL = '/api/announcements.php';

export const getAnnouncements = async () => {
    try {
        const response = await fetch(`${API_URL}?_t=${new Date().getTime()}`);
        if (!response.ok) throw new Error('Failed to fetch announcements');
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const createAnnouncement = async (announcementData) => {
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

export const deleteAnnouncement = async (id) => {
    try {
        const response = await fetch(`${API_URL}?id=${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete announcement');
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};

// Alias for backward compatibility if needed
export const postAnnouncement = createAnnouncement;
