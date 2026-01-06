import React, { useState, useEffect } from 'react';
import { getAllUsers, createUser, updateUser, deleteUser } from '../../services/authService';
import { getUserSetting } from '../../services/userSettingsService';
import { UserPlus, Search, Mail, Briefcase, Shield, Edit, Trash2, Clock, X } from 'lucide-react';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        password: '',
        role: 'employee',
        department: '',
        designation: '',
        informed_leave_limit: 6,
        emergency_leave_limit: 6
    });

    // Core Hours Modal State
    const [showCoreHoursModal, setShowCoreHoursModal] = useState(false);
    const [viewingUser, setViewingUser] = useState(null);
    const [userCoreHours, setUserCoreHours] = useState(null);
    const [loadingCoreHours, setLoadingCoreHours] = useState(false);

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
        setNewUser({
            name: user.name,
            email: user.email,
            password: '', // Don't populate password
            role: user.role,
            department: user.department || '',
            designation: user.designation || '',
            informed_leave_limit: user.informed_leave_limit || 6,
            emergency_leave_limit: user.emergency_leave_limit || 6
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

    const handleViewCoreHours = async (user) => {
        setViewingUser(user);
        setShowCoreHoursModal(true);
        setLoadingCoreHours(true);
        try {
            const settings = await getUserSetting(user.id, 'core_hours');
            setUserCoreHours(settings);
        } catch (error) {
            console.error("Failed to load core hours", error);
        } finally {
            setLoadingCoreHours(false);
        }
    };

    const closeCoreHoursModal = () => {
        setShowCoreHoursModal(false);
        setViewingUser(null);
        setUserCoreHours(null);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setNewUser({ name: '', email: '', password: '', role: 'employee', department: '', designation: '', informed_leave_limit: 6, emergency_leave_limit: 6 });
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
                                                <p className="font-medium text-gray-900">{user.name}</p>
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
                                                    onClick={() => handleViewCoreHours(user)}
                                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                                    title="View Core Hours"
                                                >
                                                    <Clock size={18} />
                                                </button>
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
                    </div>
                </div>
            )}

            {/* View Core Hours Modal */}
            {showCoreHoursModal && viewingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
                        <button
                            onClick={closeCoreHoursModal}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-bold text-gray-900 mb-1">Core Working Hours</h2>
                        <p className="text-sm text-gray-500 mb-6">Settings for {viewingUser.name}</p>

                        {loadingCoreHours ? (
                            <div className="text-center py-8 text-gray-400">Loading...</div>
                        ) : !userCoreHours ? (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                <Clock size={32} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-gray-500 font-medium">No Core Hours Configured</p>
                                <p className="text-xs text-gray-400">User hasn't set up their schedule yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Days */}
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Working Days</h3>
                                    <div className="flex gap-2 flex-wrap">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                            <div
                                                key={day}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${userCoreHours.working_days.includes(day)
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-400'
                                                    }`}
                                            >
                                                {day.charAt(0)}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Hours */}
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Time Slots</h3>
                                    {userCoreHours.working_slots && userCoreHours.working_slots.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            {userCoreHours.working_slots.map((slot, idx) => (
                                                <div key={idx} className="bg-gray-50 p-2 rounded text-sm text-gray-700 font-medium text-center border border-gray-100">
                                                    {slot.start} - {slot.end}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">No time slots defined.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
                            <button
                                type="button"
                                onClick={closeCoreHoursModal}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
