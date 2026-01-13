import React, { useState, useEffect } from 'react';
import { getAllUsers, createUser, updateUser, deleteUser } from '../../services/authService';

import { UserPlus, Search, Mail, Briefcase, Shield, Edit, Trash2, X } from 'lucide-react';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newUser, setNewUser] = useState({
        employee_code: '',
        name: '',
        email: '',
        password: '',
        role: 'employee',
        department: '',
        designation: '',
        informed_leave_limit: 6,
        emergency_leave_limit: 6,
        working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        visible_to: [],
        visible_to_core_hours: []
    });



    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const data = await getAllUsers();
        setUsers(data);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (editingId) {
            await updateUser(editingId, newUser);
        } else {
            await createUser(newUser);
        }

        await fetchUsers();
        closeModal();
        setLoading(false);
    };

    const handleEdit = (user) => {
        let parsedWorkingDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        if (user.working_days) {
            try {
                parsedWorkingDays = JSON.parse(user.working_days);
            } catch (e) {
                console.error("Failed to parse working_days", e);
            }
        }

        let parsedVisibleTo = [];
        if (user.visible_to) {
            try {
                // If it's already an array (from API response which might auto-parse JSON), use it.
                // If it's a string, parse it.
                parsedVisibleTo = Array.isArray(user.visible_to) ? user.visible_to : JSON.parse(user.visible_to);
            } catch (e) {
                console.error("Failed to parse visible_to", e);
            }
        }

        let parsedVisibleToCore = [];
        if (user.visible_to_core_hours) {
            try {
                parsedVisibleToCore = Array.isArray(user.visible_to_core_hours) ? user.visible_to_core_hours : JSON.parse(user.visible_to_core_hours);
            } catch (e) {
                console.error("Failed to parse visible_to_core_hours", e);
            }
        }

        setNewUser({
            employee_code: user.employee_code,
            name: user.name,
            email: user.email,
            password: '', // Don't populate password
            role: user.role,
            department: user.department || '',
            designation: user.designation || '',
            informed_leave_limit: user.informed_leave_limit || 6,
            emergency_leave_limit: user.emergency_leave_limit || 6,
            working_days: parsedWorkingDays,
            visible_to: parsedVisibleTo,
            visible_to_core_hours: parsedVisibleToCore
        });
        setEditingId(user.id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this employee?')) {
            setLoading(true);
            await deleteUser(id);
            await fetchUsers();
            setLoading(false);
        }
    };



    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setNewUser({ name: '', email: '', password: '', role: 'employee', department: '', designation: '', informed_leave_limit: 6, emergency_leave_limit: 6, working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], visible_to: [], visible_to_core_hours: [] });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500">Manage employee accounts and access.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                >
                    <UserPlus size={20} />
                    Add Employee
                </button>
            </div>

            {/* User List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 font-medium text-gray-500">Employee</th>
                                <th className="p-4 font-medium text-gray-500">Role</th>
                                <th className="p-4 font-medium text-gray-500">Department</th>
                                <th className="p-4 font-medium text-gray-500">Joined Date</th>
                                <th className="p-4 font-medium text-gray-500">Status</th>
                                <th className="p-4 font-medium text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {user.name}
                                                    {user.employee_code && <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">#{user.employee_code}</span>}
                                                </p>
                                                <p className="text-sm text-gray-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            <Shield size={12} />
                                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm text-gray-900">{user.department}</div>
                                        <div className="text-xs text-gray-500">{user.designation}</div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {user.joinedDate || 'N/A'}
                                    </td>
                                    <td className="p-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                            Active
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {/* Protect admin@company.com from actions */}
                                        {user.email !== 'admin@company.com' && (
                                            <div className="flex items-center gap-2">

                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        )}
                                        {user.email === 'admin@company.com' && (
                                            <span className="text-xs text-gray-400 italic">Protected</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit User Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            {editingId ? 'Edit Employee' : 'Add New Employee'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newUser.employee_code || ''}
                                    onChange={(e) => setNewUser({ ...newUser, employee_code: e.target.value })}
                                    placeholder="e.g. EMP001"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {editingId ? 'New Password (leave blank to keep current)' : 'Password'}
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    placeholder={editingId ? "Unchanged" : "Set temporary password"}
                                    required={!editingId}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newUser.department}
                                        onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newUser.designation}
                                        onChange={(e) => setNewUser({ ...newUser, designation: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Informed Leave Limit</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newUser.informed_leave_limit}
                                        onChange={(e) => setNewUser({ ...newUser, informed_leave_limit: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Leave Limit</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newUser.emergency_leave_limit}
                                        onChange={(e) => setNewUser({ ...newUser, emergency_leave_limit: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>
                            {/* Visibility selector removed as moved to Framework/Team page */}

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
                                <div className="flex gap-2 flex-wrap">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => {
                                                const days = newUser.working_days.includes(day)
                                                    ? newUser.working_days.filter(d => d !== day)
                                                    : [...newUser.working_days, day];
                                                setNewUser({ ...newUser, working_days: days });
                                            }}
                                            className={`w-8 h-8 rounded text-xs font-bold transition-colors border flex items-center justify-center ${newUser.working_days.includes(day) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                                        >
                                            {day.slice(0, 2)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                >
                                    <option value="employee">Employee</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    {editingId ? 'Update User' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div >
                </div >
            )}


        </div >
    );
};

export default AdminUsers;
