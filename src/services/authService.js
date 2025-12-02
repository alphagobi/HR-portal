// Auth Service - API Version

const API_URL = '/api/auth.php';

export const login = async (email, password) => {
    try {
        const response = await fetch(`${API_URL}?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }

        const user = await response.json();
        localStorage.setItem('hr_current_user', JSON.stringify(user));
        return user;
    } catch (error) {
        throw error;
    }
};

export const logout = () => {
    localStorage.removeItem('hr_current_user');
    window.location.href = '/login';
};

export const getCurrentUser = () => {
    const userStr = localStorage.getItem('hr_current_user');
    return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = () => {
    return !!localStorage.getItem('hr_current_user');
};

// Admin: Create new user
export const createUser = async (userData) => {
    try {
        const response = await fetch(`${API_URL}?action=register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!response.ok) throw new Error('Failed to create user');
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};

// Admin: Update user
export const updateUser = async (id, userData) => {
    try {
        const response = await fetch(`/api/employees.php?id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!response.ok) throw new Error('Failed to update user');
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};

// Admin: Get all users (Using employees.php)
export const getAllUsers = async () => {
    try {
        const response = await fetch('/api/employees.php');
        if (!response.ok) throw new Error('Failed to fetch users');
        return await response.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

// Admin: Delete user
export const deleteUser = async (id) => {
    try {
        const response = await fetch(`/api/employees.php?id=${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete user');
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
};
