// Timesheet Service - API Version
import { getCurrentUser } from './authService';

const API_URL = '/api/timesheets.php';

export const getTimesheets = async (employeeId = null) => {
    try {
        const url = employeeId
            ? `${API_URL}?employee_id=${employeeId}&_t=${new Date().getTime()}`
            : `${API_URL}?_t=${new Date().getTime()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch timesheets');
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const saveTimesheet = async (timesheetData) => {
    try {
        const user = getCurrentUser();
        const payload = {
            ...timesheetData,
            // PRIORITIZE existing ID (snake_case or camelCase) over current user
            employeeId: timesheetData.employeeId || timesheetData.employee_id || (user ? user.id : null)
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to save timesheet');
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};

// Deprecated: Use saveTimesheet instead
export const saveTimesheetEntry = async (entry) => {
    console.warn("saveTimesheetEntry is deprecated. Use saveTimesheet with full data.");
};

export const deleteTimesheetEntry = async (date, entryId) => {
    console.warn("deleteTimesheetEntry is deprecated. Use saveTimesheet with full data.");
};

export const saveDailySummary = async (date, summaryData) => {
    console.warn("saveDailySummary is deprecated. Use saveTimesheet with full data.");
};
