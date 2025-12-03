import React, { useState, useEffect } from 'react';
import { getLeaves, updateLeaveStatus } from '../../services/leaveService';
import { CheckCircle, XCircle, Clock, Calendar, Search, Filter } from 'lucide-react';

const AdminLeaves = () => {
    const [activeTab, setActiveTab] = useState('approvals');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [selectedLeaveId, setSelectedLeaveId] = useState(null);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        const data = await getLeaves();
        // Sort by pending first, then date
        const sorted = (data || []).sort((a, b) => {
            if (a.status === 'Pending' && b.status !== 'Pending') return -1;
            if (a.status !== 'Pending' && b.status === 'Pending') return 1;
            return new Date(b.start_date) - new Date(a.start_date);
        });
        setLeaves(sorted);

        // Extract unique users for balance view
        const uniqueUsers = Array.from(new Set(sorted.map(l => l.employee_id)))
            .map(id => {
                const userLeaves = sorted.filter(l => l.employee_id === id);
                const user = userLeaves[0]; // Get user info from first leave
                return {
                    id: id,
                    name: user.employee_name,
                    department: user.department,
                    informed_limit: user.informed_leave_limit || 6,
                    emergency_limit: user.emergency_leave_limit || 6,
                    informed_used: userLeaves.filter(l => l.type === 'Informed Leave' && l.status === 'Approved').reduce((acc, l) => acc + (Math.ceil((new Date(l.end_date) - new Date(l.start_date)) / (1000 * 60 * 60 * 24)) + 1), 0),
                    emergency_used: userLeaves.filter(l => l.type === 'Emergency Leave' && l.status === 'Approved').reduce((acc, l) => acc + (Math.ceil((new Date(l.end_date) - new Date(l.start_date)) / (1000 * 60 * 60 * 24)) + 1), 0)
                };
            });
        setUsers(uniqueUsers);
        setLoading(false);
    };

    const handleStatusUpdate = async (id, status, note = null) => {
        if (status === 'Rejected' && !note) {
            setSelectedLeaveId(id);
            setShowRejectModal(true);
            return;
        }

        setLoading(true);
        await updateLeaveStatus(id, status, note); // Ensure service supports note
        await fetchLeaves();
        setLoading(false);
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedLeaveId(null);
    };

    const submitRejection = () => {
        if (selectedLeaveId) {
            handleStatusUpdate(selectedLeaveId, 'Rejected', rejectReason);
        }
    };

    const filteredLeaves = filter === 'All'
        ? leaves
        : leaves.filter(l => l.status === filter);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 text-green-700';
            case 'Rejected': return 'bg-red-100 text-red-700';
            default: return 'bg-yellow-100 text-yellow-700';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
                    <p className="text-gray-500">Review requests and monitor employee leave balances.</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('approvals')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'approvals' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Approvals
                    </button>
                    <button
                        onClick={() => setActiveTab('balances')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'balances' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Balances
                    </button>
                </div>
            </div>

            {activeTab === 'approvals' ? (
                <>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                            {['All', 'Pending', 'Approved', 'Rejected'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === f
                                        ? 'bg-indigo-50 text-indigo-700'
                                        : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 font-medium text-gray-500">Employee</th>
                                        <th className="p-4 font-medium text-gray-500">Leave Type</th>
                                        <th className="p-4 font-medium text-gray-500">Duration</th>
                                        <th className="p-4 font-medium text-gray-500">Reason</th>
                                        <th className="p-4 font-medium text-gray-500">Status</th>
                                        <th className="p-4 font-medium text-gray-500 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredLeaves.map((leave) => (
                                        <tr key={leave.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                        {(leave.employee_name || '?').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{leave.employee_name || 'Unknown'}</p>
                                                        <p className="text-xs text-gray-500">ID: {leave.employee_id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm text-gray-900">{leave.type}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Calendar size={14} />
                                                    <span>{leave.start_date} to {leave.end_date}</span>
                                                    <span className="text-gray-400">
                                                        ({Math.ceil((new Date(leave.end_date) - new Date(leave.start_date)) / (1000 * 60 * 60 * 24)) + 1} days)
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="max-w-xs">
                                                    <p className="text-sm text-gray-600 truncate" title={leave.reason}>
                                                        {leave.reason}
                                                    </p>
                                                    {leave.admin_note && (
                                                        <p className="text-xs text-red-500 mt-1">Note: {leave.admin_note}</p>
                                                    )}
                                                    {leave.employee_note && (
                                                        <p className="text-xs text-orange-500 mt-1">Challenge: {leave.employee_note}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                                                    {leave.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                {leave.status === 'Pending' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleStatusUpdate(leave.id, 'Approved')}
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(leave.id, 'Rejected')}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Reject"
                                                        >
                                                            <XCircle size={20} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredLeaves.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-gray-500">
                                                No leave requests found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 font-medium text-gray-500">Employee</th>
                                    <th className="p-4 font-medium text-gray-500">Department</th>
                                    <th className="p-4 font-medium text-gray-500">Informed Leave</th>
                                    <th className="p-4 font-medium text-gray-500">Emergency Leave</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                    {(user.name || '?').charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{user.name || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-500">ID: {user.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">{user.department || '-'}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-[100px]">
                                                    <div
                                                        className="bg-emerald-500 h-2.5 rounded-full"
                                                        style={{ width: `${Math.min((user.informed_used / user.informed_limit) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm text-gray-600">{user.informed_used} / {user.informed_limit}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-[100px]">
                                                    <div
                                                        className="bg-amber-500 h-2.5 rounded-full"
                                                        style={{ width: `${Math.min((user.emergency_used / user.emergency_limit) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm text-gray-600">{user.emergency_used} / {user.emergency_limit}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-gray-500">
                                            No employee data available.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Reject Leave Request</h3>
                        <p className="text-sm text-gray-500 mb-4">Please provide a reason for rejecting this leave request.</p>
                        <textarea
                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none mb-4 h-32 resize-none"
                            placeholder="Reason for rejection..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitRejection}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                disabled={!rejectReason.trim()}
                            >
                                Reject Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLeaves;
