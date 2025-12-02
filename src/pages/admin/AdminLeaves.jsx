import React, { useState, useEffect } from 'react';
import { getLeaves, updateLeaveStatus } from '../../services/leaveService';
import { CheckCircle, XCircle, Clock, Calendar, Search, Filter } from 'lucide-react';

const AdminLeaves = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        const data = await getLeaves();
        // Sort by pending first, then date
        const sorted = (data || []).sort((a, b) => {
            if (a.status === 'Pending' && b.status !== 'Pending') return -1;
            if (a.status !== 'Pending' && b.status === 'Pending') return 1;
            return new Date(b.startDate) - new Date(a.startDate);
        });
        setLeaves(sorted);
        setLoading(false);
    };

    const handleStatusUpdate = async (id, status) => {
        setLoading(true);
        await updateLeaveStatus(id, status);
        await fetchLeaves();
        setLoading(false);
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
                    <h1 className="text-2xl font-bold text-gray-900">Leave Approvals</h1>
                    <p className="text-gray-500">Review and manage employee leave requests.</p>
                </div>

                <div className="flex items-center gap-3">
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
                                            <span>{leave.startDate} to {leave.endDate}</span>
                                            <span className="text-gray-400">({leave.days} days)</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm text-gray-600 max-w-xs truncate" title={leave.reason}>
                                            {leave.reason}
                                        </p>
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
        </div>
    );
};

export default AdminLeaves;
