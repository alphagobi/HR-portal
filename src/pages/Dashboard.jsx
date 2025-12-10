import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getAnnouncements } from '../services/announcementService';
import { getTasks, updateTask, createTask } from '../services/taskService';
import { saveTimesheet, getTimesheets } from '../services/timesheetService';
import { getCurrentUser } from '../services/authService';
import { Bell, Clock, CheckCircle, Plus, AlertCircle, X, ChevronRight, Calendar } from 'lucide-react';

const Dashboard = () => {
    const location = useLocation();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    // Tasks State
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);

    // Logging Modal State
    const [showLogModal, setShowLogModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [logForm, setLogForm] = useState({
        duration: '',
        remarks: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const user = getCurrentUser();
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        if (!user?.id) return;

        try {
            // 1. Fetch Announcements
            const announcementsData = await getAnnouncements(user.id);
            setAnnouncements(announcementsData);

            // 2. Fetch All Tasks
            // Passing only userId to get all tasks
            const allTasks = await getTasks(user.id);
            // Filter: Pending and Not Logged (assuming is_completed check is enough)
            // The API returns all tasks. We should filter out completed ones if that's the requirement.
            // "tasks whihch are pending and not logged yet"
            const pendingTasks = allTasks.filter(t => t.is_completed != 1);

            // Sort by date (ascending)
            pendingTasks.sort((a, b) => new Date(a.planned_date) - new Date(b.planned_date));

            setTasks(pendingTasks);

        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    const getTaskColor = (plannedDate) => {
        const taskDate = new Date(plannedDate);
        const todayDate = new Date(today);

        // Reset times for accurate date comparison
        taskDate.setHours(0, 0, 0, 0);
        todayDate.setHours(0, 0, 0, 0);

        if (taskDate.getTime() < todayDate.getTime()) {
            return 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'; // Overdue
        } else if (taskDate.getTime() === todayDate.getTime()) {
            return 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100'; // Due Today
        } else {
            return 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'; // Future
        }
    };

    const getStatusDotColor = (plannedDate) => {
        const taskDate = new Date(plannedDate);
        const todayDate = new Date(today);
        taskDate.setHours(0, 0, 0, 0);
        todayDate.setHours(0, 0, 0, 0);

        if (taskDate.getTime() < todayDate.getTime()) return 'bg-red-500';
        if (taskDate.getTime() === todayDate.getTime()) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const formatDueDate = (dateString) => {
        if (!dateString) return 'No Date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const handleTaskClick = (task) => {
        setSelectedTask(task);
        setLogForm({
            duration: task.eta || '', // Auto-populate with ETA
            remarks: ''
        });
        setShowLogModal(true);
    };

    const handleLogWork = async (e) => {
        e.preventDefault();
        if (!selectedTask || !logForm.duration) return;

        setIsSubmitting(true);
        try {
            // Fetch existing entries for the day to append to them (basic timesheet logic)
            // Note: In a real app we might just append a row to DB, but existing service mimics saving the whole day
            const timesheetsData = await getTimesheets(user.id);
            const todaySheet = timesheetsData.find(t => t.date === today);
            const currentEntries = todaySheet ? todaySheet.entries.filter(e => e.is_deleted != 1) : [];

            // Convert minutes to hours if input is deemed as minutes? 
            // "Duration and remakrs, the duration will be auto polulated from ETA"
            // Assuming ETA is in hours usually, or minutes? 
            // The previous code divided by 60. Let's assume input is minutes for consistency with previous UI ("Duration (Minutes)").

            const durationInHours = (parseFloat(logForm.duration) / 60).toFixed(2);

            const newEntry = {
                id: Date.now(),
                duration: durationInHours,
                description: logForm.remarks || selectedTask.task_content,
                taskId: selectedTask.id,
                project: 'General',
                startTime: null,
                endTime: null
            };

            await saveTimesheet({
                date: today,
                entries: [...currentEntries, newEntry],
                employeeId: user.id,
                status: 'draft'
            });

            // Mark task as completed
            await updateTask(selectedTask.id, { is_completed: 1 });

            setShowLogModal(false);
            fetchDashboardData(); // Refresh list

        } catch (error) {
            console.error("Failed to log work", error);
            alert("Failed to log work.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0]}!</h1>
                <p className="text-gray-500">Your dashboard overview.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Widget 1: Framework Percentage */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[300px]">
                    <div className="relative w-48 h-48">
                        {/* Placeholder for Circular Progress */}
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle
                                className="text-gray-200 stroke-current"
                                strokeWidth="10"
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                            ></circle>
                            <circle
                                className="text-indigo-600 progress-ring__circle stroke-current"
                                strokeWidth="10"
                                strokeLinecap="round"
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                strokeDasharray="251.2"
                                strokeDashoffset="62.8" // 75% roughly
                                transform="rotate(-90 50 50)"
                            ></circle>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold text-gray-900">75%</span>
                            <span className="text-sm text-gray-500 uppercase tracking-wider mt-1">Framework</span>
                        </div>
                    </div>
                </div>

                {/* Widget 2: Tasks List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <CheckCircle className="text-indigo-600" size={20} />
                            Your Tasks
                        </h2>
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                            {tasks.length} Pending
                        </span>
                    </div>

                    <div className="overflow-y-auto flex-1 p-4 space-y-3">
                        {tasks.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <CheckCircle size={48} className="mb-4 opacity-20" />
                                <p>No pending tasks!</p>
                            </div>
                        ) : (
                            tasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => handleTaskClick(task)}
                                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${getTaskColor(task.planned_date)} group`}
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${getStatusDotColor(task.planned_date)}`}></div>
                                            <div>
                                                <p className="font-medium text-gray-900 group-hover:text-indigo-900 transition-colors">
                                                    {task.task_content}
                                                </p>
                                                <div className="flex items-center gap-4 mt-2 text-xs opacity-75">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={12} />
                                                        Due: {formatDueDate(task.planned_date)}
                                                    </span>
                                                    {task.eta && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            ETA: {task.eta}m
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-400 group-hover:text-indigo-600 mt-1" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Announcements Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Bell className="text-indigo-600" size={20} />
                        Announcements
                    </h2>
                </div>
                <div className="divide-y divide-gray-100">
                    {announcements.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No new announcements.</div>
                    ) : (
                        announcements.map((announcement) => (
                            <div key={announcement.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-900">{announcement.title}</h3>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                        {new Date(announcement.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-gray-600 text-sm">{announcement.content}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Log Task Modal */}
            {showLogModal && selectedTask && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">Log Task Completion</h3>
                            <button onClick={() => setShowLogModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleLogWork} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Task</label>
                                <p className="text-gray-900 font-medium bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                                    {selectedTask.task_content}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Minutes)</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    value={logForm.duration}
                                    onChange={(e) => setLogForm(prev => ({ ...prev, duration: e.target.value }))}
                                />
                                <p className="text-xs text-gray-400 mt-1">Pre-filled from ETA if available.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                                <textarea
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none transition-all"
                                    placeholder="Any notes about the work done..."
                                    value={logForm.remarks}
                                    onChange={(e) => setLogForm(prev => ({ ...prev, remarks: e.target.value }))}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowLogModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm shadow-sm"
                                >
                                    {isSubmitting ? 'Logging...' : 'Complete & Log'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
