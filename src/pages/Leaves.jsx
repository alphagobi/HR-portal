import React, { useState, useEffect } from 'react';
import { getLeaves, submitLeaveRequest } from '../services/leaveService';
import { Calendar, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';

const Leaves = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [limits, setLimits] = useState({ 'Informed Leave': 6, 'Emergency Leave': 6 });
    const [usage, setUsage] = useState({ 'Informed Leave': 0, 'Emergency Leave': 0 });
    const [newRequest, setNewRequest] = useState({ type: 'Informed Leave', startDate: '', endDate: '', reason: '' });

    useEffect(() => {
        const fetchLeaves = async () => {
            try {
                const data = await getLeaves();
                // Handle both old (array) and new (object) API responses for backward compatibility
                if (Array.isArray(data)) {
                    setLeaves(data);
                } else {
                    setLeaves(data.leaves || []);
                    setLimits(data.limits || { 'Informed Leave': 6, 'Emergency Leave': 6 });
                    setUsage(data.usage || { 'Informed Leave': 0, 'Emergency Leave': 0 });
                }
            } catch (error) {
                console.error("Failed to fetch leaves", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaves();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const user = JSON.parse(localStorage.getItem('hr_current_user'));
        if (!user) {
            alert("Please log in to submit a leave request.");
            return;
        }

        // Guard Rail: Check for Emergency Leave
        const start = new Date(newRequest.startDate);
        const today = new Date();
        const diffTime = start - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let finalType = newRequest.type;
        let isEmergency = false;

        if (diffDays < 7) {
            finalType = 'Emergency Leave';
            isEmergency = true;
        }

        // Prepare payload for API (snake_case)
        const apiPayload = {
            employee_id: user.id,
            type: finalType,
            start_date: newRequest.startDate,
            end_date: newRequest.endDate,
            reason: newRequest.reason
        };

        // Optimistic UI update (camelCase for frontend)
        const uiRequest = {
            ...newRequest,
            type: finalType,
            id: Date.now(), // Temporary ID
            status: 'Pending',
            days: 1, // Mock calculation
            startDate: newRequest.startDate,
            endDate: newRequest.endDate
        };

        setLeaves([uiRequest, ...leaves]);

        try {
            await submitLeaveRequest(apiPayload);
            if (isEmergency) {
                alert("Notice: Since this leave is within 7 days, it has been classified as 'Emergency Leave'.");
            }
            setNewRequest({ type: 'Informed Leave', startDate: '', endDate: '', reason: '' });
        } catch (error) {
            console.error("Failed to submit leave", error);
            alert("Failed to submit leave request.");
            // Revert optimistic update if needed, or just let the user know
        }
    };

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'approved': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            case 'rejected': return 'text-red-600 bg-red-50 border-red-100';
            default: return 'text-amber-600 bg-amber-50 border-amber-100';
        }
    };

    const getStatusIcon = (status) => {
        switch (status.toLowerCase()) {
            case 'approved': return <CheckCircle size={16} />;
            case 'rejected': return <XCircle size={16} />;
            default: return <Clock size={16} />;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Leave Management</h1>
                <p className="text-gray-500">Request time off and check your leave balance.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Request Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Plus className="text-indigo-600" size={20} />
                            New Request
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                                <select
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newRequest.type}
                                    onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })}
                                >
                                    <option>Informed Leave</option>
                                    <option>Emergency Leave</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newRequest.startDate}
                                        onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newRequest.endDate}
                                        onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                <textarea
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                                    placeholder="Why are you taking leave?"
                                    value={newRequest.reason}
                                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                            >
                                Submit Request
                            </button>
                        </form>
                    </div>
                </div>

                {/* Leave History & Balance */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Balance Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-xl text-white shadow-sm">
                            <p className="text-emerald-100 text-sm font-medium mb-1">Informed Leave</p>
                            <h3 className="text-2xl font-bold">
                                {limits['Informed Leave'] - usage['Informed Leave']}
                                <span className="text-sm font-normal text-emerald-100"> / {limits['Informed Leave']}</span>
                            </h3>
                        </div>
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-xl text-white shadow-sm">
                            <p className="text-amber-100 text-sm font-medium mb-1">Emergency Leave</p>
                            <h3 className="text-2xl font-bold">
                                {limits['Emergency Leave'] - usage['Emergency Leave']}
                                <span className="text-sm font-normal text-amber-100"> / {limits['Emergency Leave']}</span>
                            </h3>
                        </div>
                    </div>

                    {/* History List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Leave History</h2>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {loading ? (
                                <div className="p-6 text-center text-gray-500">Loading history...</div>
                            ) : (
                                leaves.map((leave) => (
                                    <div key={leave.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-gray-100 rounded-lg text-gray-500">
                                                <Calendar size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{leave.type}</h3>
                                                <p className="text-sm text-gray-500">{leave.startDate} to {leave.endDate} • {leave.days} days</p>
                                                <p className="text-sm text-gray-600 mt-1">{leave.reason}</p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(leave.status)}`}>
                                            {getStatusIcon(leave.status)}
                                            {leave.status}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Leaves;
