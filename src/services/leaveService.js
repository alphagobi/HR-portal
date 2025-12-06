// Leave Service - API Version

const API_URL = '/api/leaves.php';

export const getLeaves = async (employeeId = null) => {
    try {
        const url = employeeId
            ? `${API_URL}?employee_id=${employeeId}&_t=${new Date().getTime()}`
            : `${API_URL}?_t=${new Date().getTime()}`;
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
        const response = await fetch(`${API_URL}?_t=${new Date().getTime()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...leaveData, user_id: JSON.parse(localStorage.getItem('hr_current_user'))?.id })
        });
        if (!response.ok) throw new Error('Failed to submit leave');
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const updateLeaveStatus = async (id, status, admin_note = null, employee_note = null) => {
    try {
        const payload = { status };
        if (admin_note) payload.admin_note = admin_note;
        if (employee_note) {
            payload.employee_note = employee_note;
            payload.action = 'challenge';
        }

        const response = await fetch(`${API_URL}?id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to update status');
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const getLeaveMessages = async (leaveId) => {
    try {
        const response = await fetch(`/api/leave_chat.php?leave_id=${leaveId}&_t=${new Date().getTime()}`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

export const sendLeaveMessage = async (messageData) => {
    try {
        const response = await fetch('/api/leave_chat.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageData)
        });
        if (!response.ok) throw new Error('Failed to send message');
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const markLeaveMessagesRead = async (leaveId, userType) => {
    try {
        const response = await fetch('/api/leave_chat.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'mark_read',
                leave_id: leaveId,
                user_type: userType
            })
        });
        if (!response.ok) throw new Error('Failed to mark messages as read');
        return await response.json();
    } catch (error) {
        console.error(error);
        // Don't throw, just log
    }
};
