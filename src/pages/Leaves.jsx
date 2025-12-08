import React, { useState, useEffect } from 'react';
import { getLeaves, submitLeaveRequest, getLeaveMessages, sendLeaveMessage, markLeaveMessagesRead } from '../services/leaveService';
import { Calendar, CheckCircle, XCircle, Clock, Plus, Send, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

const Leaves = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [limits, setLimits] = useState({ 'Informed Leave': 6, 'Emergency Leave': 6 });
    const [usage, setUsage] = useState({ 'Informed Leave': 0, 'Emergency Leave': 0 });
    const [newRequest, setNewRequest] = useState({ type: 'Informed Leave', startDate: '', endDate: '', reason: '' });

    useEffect(() => {
        const fetchLeaves = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('hr_current_user'));
                const data = await getLeaves(user?.id);
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

    const [showChallengeModal, setShowChallengeModal] = useState(false);
    const [challengeNote, setChallengeNote] = useState(''); // Used as message input
    const [selectedLeaveId, setSelectedLeaveId] = useState(null);
    const [messages, setMessages] = useState([]);
    const messagesEndRef = React.useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleChallenge = async (id) => {
        setSelectedLeaveId(id);
        setShowChallengeModal(true);
        // Fetch messages
        const msgs = await getLeaveMessages(id);
        setMessages(msgs);

        // Mark as read
        const user = JSON.parse(localStorage.getItem('hr_current_user'));
        if (user) {
            await markLeaveMessagesRead(id, 'employee');
            // Update local state to remove badge immediately
            setLeaves(prev => prev.map(l => l.id === id ? { ...l, unread_count: 0 } : l));
        }
    };

    const submitChallenge = async () => {
        if (!selectedLeaveId || !challengeNote.trim()) return;

        try {
            const user = JSON.parse(localStorage.getItem('hr_current_user'));
            await sendLeaveMessage({
                leave_id: selectedLeaveId,
                sender_id: user.id,
                sender_type: 'employee',
                message: challengeNote
            });

            setChallengeNote('');
            // Refresh messages
            const msgs = await getLeaveMessages(selectedLeaveId);
            setMessages(msgs);
        } catch (error) {
            console.error("Failed to send message", error);
            alert("Failed to send message.");
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
                    <p className="text-gray-500">Apply for leaves and track your balance.</p>
                </div>
            </div>

            {/* 1. Leave Balance Cards (Top) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(limits).map(([type, limit]) => {
                    const used = usage[type] || 0;
                    const remaining = limit - used;
                    const percentage = (used / limit) * 100;

                    return (
                        <div key={type} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">{type}</p>
                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{remaining} <span className="text-sm font-normal text-gray-400"> / {limit} days</span></h3>
                                </div>
                                <div className={`p-2 rounded-lg ${type === 'Emergency Leave' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    <Calendar size={20} />
                                </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-500 ${type === 'Emergency Leave' ? 'bg-red-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2">{used} days used</p>
                        </div>
                    );
                })}
            </div>

            {/* 2. Apply for Leave Form (Middle) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Apply for Leave</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                            <select
                                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50"
                                value={newRequest.type}
                                onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })}
                            >
                                <option value="Informed Leave">Informed Leave</option>
                                <option value="Emergency Leave">Emergency Leave</option>
                                <option value="Sick Leave">Sick Leave</option>
                                <option value="Casual Leave">Casual Leave</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                required
                                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={newRequest.startDate}
                                onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value, endDate: e.target.value })}
                            />
                            <p className="text-xs text-gray-400 mt-1">Leaves are applied for single days.</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                        <textarea
                            required
                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none bg-gray-50"
                            placeholder="Please provide a reason for your leave..."
                            value={newRequest.reason}
                            onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center gap-2"
                        >
                            <Send size={18} /> Submit Request
                        </button>
                    </div>
                </form>
            </div>

            {/* 3. Leave History (Bottom) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Leave History</h3>
                <div className="space-y-4">
                    {leaves.length === 0 ? (
                        <p className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">No leave history found.</p>
                    ) : (
                        leaves.slice(0, 10).map((leave) => (
                            <div key={leave.id} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0 hover:bg-gray-50 p-4 rounded-lg transition-colors">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(leave.status)} flex items-center gap-1.5`}>
                                                {getStatusIcon(leave.status)} {leave.status}
                                            </span>
                                            <p className="font-medium text-gray-900 text-sm">{leave.type}</p>
                                        </div>

                                        <div className="flex items-center gap-6 mt-2">
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Calendar size={14} />
                                                <span className="font-medium">
                                                    {new Date(leave.start_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 truncate max-w-md" title={leave.reason}>{leave.reason}</p>
                                        </div>

                                        {leave.admin_remarks && (
                                            <div className="mt-2 text-xs bg-red-50 p-2 rounded text-red-700 border border-red-100 inline-block">
                                                <span className="font-semibold">Admin Note:</span> {leave.admin_remarks}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleChallenge(leave.id)}
                                            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors relative"
                                        >
                                            <MessageSquare size={14} />
                                            {leave.status === 'Rejected' ? 'Discuss Rejection' : 'Chat with Admin'}
                                            {leave.unread_count > 0 && (
                                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Modal */}
            {showChallengeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 h-[500px] flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Leave Discussion</h3>
                                <p className="text-xs text-gray-500">Chat with Admin about this request</p>
                            </div>
                            <button
                                onClick={() => { setShowChallengeModal(false); setChallengeNote(''); }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-2">
                            {/* Initial Rejection Note if exists */}
                            {leaves.find(l => l.id === selectedLeaveId)?.admin_note && (
                                <div className="flex justify-start">
                                    <div className="bg-red-50 text-red-800 p-3 rounded-lg rounded-tl-none max-w-[80%] text-sm">
                                        <p className="font-bold text-xs mb-1">Admin (Rejection Reason)</p>
                                        {leaves.find(l => l.id === selectedLeaveId)?.admin_note}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender_type === 'employee' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-3 rounded-lg max-w-[80%] text-sm ${msg.sender_type === 'employee'
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-gray-100 text-gray-800 rounded-tl-none'
                                        }`}>
                                        <p className="font-bold text-xs mb-1 opacity-75">
                                            {msg.sender_type === 'employee' ? 'You' : 'Admin'}
                                        </p>
                                        {msg.message}
                                        <p className="text-[10px] mt-1 opacity-50 text-right">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                            <input
                                type="text"
                                className="flex-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Type a message..."
                                value={challengeNote}
                                onChange={(e) => setChallengeNote(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && submitChallenge()}
                            />
                            <button
                                onClick={submitChallenge}
                                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                disabled={!challengeNote.trim()}
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leaves;
