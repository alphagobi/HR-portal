// User Settings Service
const API_URL = '/api/user_settings.php';

export const getUserSetting = async (userId, key) => {
    try {
        const response = await fetch(`${API_URL}?user_id=${userId}&key=${key}`);
        if (!response.ok) throw new Error('Failed to fetch setting');
        return await response.json();
    } catch (error) {
        console.error("Error fetching setting:", error);
        return null;
    }
};

export const saveUserSetting = async (userId, key, value) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, key, value })
        });
        if (!response.ok) throw new Error('Failed to save setting');
        return await response.json();
    } catch (error) {
        console.error("Error saving setting:", error);
        throw error;
    }
};
