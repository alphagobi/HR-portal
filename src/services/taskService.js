const API_URL = '/api/tasks.php';

export const getTasks = async (userId, date) => {
    const response = await fetch(`${API_URL}?user_id=${userId}&date=${date}`);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return await response.json();
};

export const createTask = async (task) => {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
    });
    if (!response.ok) throw new Error('Failed to create task');
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
