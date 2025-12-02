import { getCurrentUser } from './authService';

// ... existing code ...

export const saveTimesheetEntry = async (entry) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const user = getCurrentUser();
            const timesheets = getStoredTimesheets();
            // Assuming entry has a date, or we use today's date if not provided
            const date = entry.date || new Date().toISOString().split('T')[0];

            let dayRecord = timesheets.find(t => t.date === date);
            if (!dayRecord) {
                dayRecord = {
                    id: Date.now(),
                    employeeId: user ? user.id : 2,
                    employeeName: user ? user.name : 'Unknown',
                    date,
                    entries: [],
                    milestone: '',
                    taskDescription: '',
                    comments: ''
                };
                timesheets.push(dayRecord);
            }

            const existingEntryIndex = dayRecord.entries.findIndex(e => e.id === entry.id);
            if (existingEntryIndex >= 0) {
                dayRecord.entries[existingEntryIndex] = entry;
            } else {
                dayRecord.entries.push(entry);
            }

            localStorage.setItem('hr_timesheets', JSON.stringify(timesheets));
            resolve({ success: true });
        }, 500);
    });
};

export const deleteTimesheetEntry = async (date, entryId) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const timesheets = getStoredTimesheets();
            const dayRecord = timesheets.find(t => t.date === date);

            if (dayRecord) {
                dayRecord.entries = dayRecord.entries.filter(e => e.id !== entryId);
                localStorage.setItem('hr_timesheets', JSON.stringify(timesheets));
            }
            resolve({ success: true });
        }, 500);
    });
};

export const saveDailySummary = async (date, summaryData) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const user = getCurrentUser();
            const timesheets = getStoredTimesheets();
            let dayRecord = timesheets.find(t => t.date === date);

            if (!dayRecord) {
                dayRecord = {
                    id: Date.now(),
                    employeeId: user ? user.id : 2,
                    employeeName: user ? user.name : 'Unknown',
                    date,
                    entries: [],
                    ...summaryData
                };
                timesheets.push(dayRecord);
            } else {
                Object.assign(dayRecord, summaryData);
            }

            localStorage.setItem('hr_timesheets', JSON.stringify(timesheets));
            resolve({ success: true });
        }, 500);
    });
};
const MOCK_TIMESHEETS = [
    {
        id: 1,
        employeeId: 2,
        employeeName: 'John Doe',
        date: new Date().toISOString().split('T')[0],
        totalHours: 8,
        status: 'draft',
        entries: [
            { id: 101, startTime: '09:00', endTime: '13:00', description: 'Frontend Development - Dashboard', project: 'HR System' },
            { id: 102, startTime: '14:00', endTime: '18:00', description: 'Team Meeting & Planning', project: 'Internal' }
        ],
        milestone: 'Completed Dashboard UI',
        taskDescription: 'Implemented widgets and charts',
        comments: 'Need to optimize performance'
    }
];

const getStoredTimesheets = () => {
    const stored = localStorage.getItem('hr_timesheets');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to parse stored timesheets", e);
            localStorage.removeItem('hr_timesheets');
        }
    }
    localStorage.setItem('hr_timesheets', JSON.stringify(MOCK_TIMESHEETS));
    return MOCK_TIMESHEETS;
};

export const getTimesheets = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(getStoredTimesheets());
        }, 400);
    });
};

export const getAllTimesheets = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(getStoredTimesheets());
        }, 400);
    });
};


