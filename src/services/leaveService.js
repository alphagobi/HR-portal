import { logActivity } from './activityService';
import { getCurrentUser } from './authService';

// ... existing code ...

export const submitLeaveRequest = async (request) => {
    console.log("Submitting leave:", request);
    return new Promise((resolve) => {
        setTimeout(() => {
            const user = getCurrentUser();
            const leaves = getStoredLeaves();
            const newLeave = {
                id: Date.now(),
                employeeId: user ? user.id : 2,
                employeeName: user ? user.name : 'Unknown',
                status: 'Pending',
                ...request
            };
            leaves.push(newLeave);
            localStorage.setItem('hr_leaves', JSON.stringify(leaves));

            // Log activity
            logActivity(`${newLeave.employeeName} submitted a leave request.`, 'leave');

            resolve({ success: true });
        }, 600);
    });
};
const MOCK_LEAVES = [
    {
        id: 1,
        employeeId: 2,
        employeeName: 'John Doe',
        type: 'Emergency Leave',
        startDate: '2023-11-10',
        endDate: '2023-11-11',
        reason: 'Viral fever',
        status: 'Approved',
        days: 2
    },
    {
        id: 2,
        employeeId: 2,
        employeeName: 'John Doe',
        type: 'Informed Leave',
        startDate: '2023-12-24',
        endDate: '2023-12-26',
        reason: 'Family vacation',
        status: 'Pending',
        days: 3
    },
    {
        id: 3,
        employeeId: 3,
        employeeName: 'Jane Smith',
        type: 'Informed Leave',
        startDate: '2023-12-01',
        endDate: '2023-12-02',
        reason: 'Personal work',
        status: 'Pending',
        days: 2
    }
];

const getStoredLeaves = () => {
    const stored = localStorage.getItem('hr_leaves');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to parse stored leaves", e);
            localStorage.removeItem('hr_leaves');
        }
    }
    localStorage.setItem('hr_leaves', JSON.stringify(MOCK_LEAVES));
    return MOCK_LEAVES;
};

export const getLeaves = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(getStoredLeaves());
        }, 500);
    });
};

export const getAllLeaves = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(getStoredLeaves());
        }, 500);
    });
};

export const updateLeaveStatus = async (id, status) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const leaves = getStoredLeaves();
            const leave = leaves.find(l => l.id === id);
            if (leave) {
                leave.status = status;
                localStorage.setItem('hr_leaves', JSON.stringify(leaves));
                resolve(leave);
            } else {
                resolve(null);
            }
        }, 500);
    });
};


