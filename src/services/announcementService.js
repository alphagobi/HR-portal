import { logActivity } from './activityService';

// ... existing code ...
const MOCK_ANNOUNCEMENTS = [
    {
        id: 1,
        title: 'New Health Insurance Policy',
        content: 'We have updated our health insurance provider to BlueCross. Please check the policy portal for more details.',
        date: '2023-10-25',
        author: 'HR Department'
    },
    {
        id: 2,
        title: 'Holiday Schedule 2024',
        content: 'The holiday calendar for the upcoming year has been finalized. Plan your leaves accordingly!',
        date: '2023-10-20',
        author: 'Admin'
    },
    {
        id: 3,
        title: 'Office Renovation',
        content: 'The cafeteria will be closed for renovation next week. Temporary arrangements have been made on the 2nd floor.',
        date: '2023-10-15',
        author: 'Facilities'
    }
];

const getStoredAnnouncements = () => {
    const stored = localStorage.getItem('hr_announcements');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to parse stored announcements", e);
            localStorage.removeItem('hr_announcements');
        }
    }
    localStorage.setItem('hr_announcements', JSON.stringify(MOCK_ANNOUNCEMENTS));
    return MOCK_ANNOUNCEMENTS;
};

export const getAnnouncements = async () => {
    // Simulate API delay
    return new Promise((resolve) => {
        setTimeout(() => {
            const announcements = getStoredAnnouncements();
            // Sort by date descending
            const sorted = announcements.sort((a, b) => new Date(b.date) - new Date(a.date));
            resolve(sorted);
        }, 500);
    });
};

export const createAnnouncement = async (announcement) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const announcements = getStoredAnnouncements();
            const newAnnouncement = {
                id: Date.now(),
                date: new Date().toISOString().split('T')[0],
                author: 'Admin', // Mock author
                ...announcement
            };
            announcements.unshift(newAnnouncement);
            localStorage.setItem('hr_announcements', JSON.stringify(announcements));

            // Log activity
            logActivity(`New announcement "${announcement.title}" posted.`, 'announcement');

            resolve(newAnnouncement);
        }, 500);
    });
};

export const deleteAnnouncement = async (id) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const announcements = getStoredAnnouncements();
            const index = announcements.findIndex(a => a.id === id);
            if (index !== -1) {
                announcements.splice(index, 1);
                localStorage.setItem('hr_announcements', JSON.stringify(announcements));
                resolve(true);
            } else {
                resolve(false);
            }
        }, 500);
    });
};
