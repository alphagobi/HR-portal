const API_URL = '/api/tasks.php';

export const getTasks = async (userId, date) => {
    let url = `${API_URL}?user_id=${userId}`;
    if (date) {
        url += `&date=${date}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return await response.json();
};

export const createTask = async (task) => {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
    });
    if (!response.ok) {
        let errorMessage = 'Failed to create task';
        try {
            const errorData = await response.json();
            if (errorData.error) errorMessage = errorData.error;
        } catch (e) {
            // If JSON parse fails, use default message
        }
        throw new Error(errorMessage);
    }
    return await response.json();
};

export const updateTask = async (id, updates) => {
    const response = await fetch(`${API_URL}?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update task');
    return await response.json();
};

export const deleteTask = async (id) => {
    const response = await fetch(`${API_URL}?id=${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete task');
    return await response.json();
};
