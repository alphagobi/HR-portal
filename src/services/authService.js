// Mock Auth Service

const ADMIN_USER = {
    id: 1,
    email: 'admin@company.com',
    name: 'Admin User',
    role: 'admin',
    department: 'Administration'
};

// Initial mock employees
const INITIAL_EMPLOYEES = [
    {
        id: 2,
        email: 'employee@company.com',
        password: 'password123', // In a real app, this would be hashed
        name: 'John Doe',
        role: 'employee',
        department: 'Engineering',
        designation: 'Software Engineer',
        joinedDate: '2023-01-15'
    }
];

// Helper to get users from storage
const getUsers = () => {
    const stored = localStorage.getItem('hr_users');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to parse stored users", e);
            localStorage.removeItem('hr_users');
        }
    }
    localStorage.setItem('hr_users', JSON.stringify(INITIAL_EMPLOYEES));
    return INITIAL_EMPLOYEES;
};

export const login = async (email, password) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Check Admin
            if (email === 'admin@company.com' && password === 'Welcome@123') {
                const user = ADMIN_USER;
                localStorage.setItem('hr_current_user', JSON.stringify(user));
                resolve(user);
                return;
            }

            // Check Employees
            const users = getUsers();
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                // Don't store password in session
                const { password, ...safeUser } = user;
                localStorage.setItem('hr_current_user', JSON.stringify(safeUser));
                resolve(safeUser);
            } else {
                reject(new Error('Invalid email or password'));
            }
        }, 800);
    });
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
    return new Promise((resolve) => {
        setTimeout(() => {
            const users = getUsers();
            const newUser = {
                ...userData,
                id: Date.now(),
                role: 'employee' // Default to employee for now
            };
            users.push(newUser);
            localStorage.setItem('hr_users', JSON.stringify(users));
            resolve(newUser);
        }, 500);
    });
};

// Admin: Update user
export const updateUser = async (id, userData) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const users = getUsers();
            const index = users.findIndex(u => u.id === id);
            if (index !== -1) {
                users[index] = { ...users[index], ...userData };
                localStorage.setItem('hr_users', JSON.stringify(users));
                resolve(users[index]);
            } else {
                resolve(null);
            }
        }, 500);
    });
};

// Admin: Delete user
export const deleteUser = async (id) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const users = getUsers();
            const filteredUsers = users.filter(u => u.id !== id);
            localStorage.setItem('hr_users', JSON.stringify(filteredUsers));
            resolve(true);
        }, 500);
    });
};

// Admin: Get all users
export const getAllUsers = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const users = getUsers();
            // Return admin + employees for the list, but hide passwords
            const allUsers = [ADMIN_USER, ...users].map(({ password, ...u }) => u);
            resolve(allUsers);
        }, 500);
    });
};
