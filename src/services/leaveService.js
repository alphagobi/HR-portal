// Leave Service - API Version

const API_URL = '/api/leaves.php';

export const getLeaves = async (employeeId = null) => {
    try {
        const url = employeeId ? `${API_URL}?employee_id=${employeeId}` : API_URL;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch leaves');
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const submitLeaveRequest = async (leaveData) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(leaveData)
        });
        if (!response.ok) throw new Error('Failed to submit leave');
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const updateLeaveStatus = async (id, status) => {
    try {
        const response = await fetch(`${API_URL}?id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (!response.ok) throw new Error('Failed to update status');
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};
