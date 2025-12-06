import React, { useState, useEffect } from 'react';
import { getLeaves, submitLeaveRequest, getLeaveMessages, sendLeaveMessage, markLeaveMessagesRead } from '../services/leaveService';
import { Calendar, CheckCircle, XCircle, Clock, Plus, Send, MessageSquare } from 'lucide-react';

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

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newRequest.startDate}
                                        onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value, endDate: e.target.value })}
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
                                                <p className="text-sm text-gray-500">{leave.start_date || leave.startDate} • 1 day</p>
                                                <p className="text-sm text-gray-600 mt-1">{leave.reason}</p>
                                                {leave.admin_note && (
                                                    <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                                                        <strong>Rejection Reason:</strong> {leave.admin_note}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(leave.status)}`}>
                                                {getStatusIcon(leave.status)}
                                                {leave.status}
                                            </div>
                                            {leave.status === 'Rejected' && !leave.employee_note && (
                                                <button
                                                    onClick={() => handleChallenge(leave.id)}
                                                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium underline relative"
                                                >
                                                    <MessageSquare size={12} />
                                                    Chat with Admin
                                                    {leave.unread_count > 0 && (
                                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
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
