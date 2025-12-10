import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getTasks, updateTask, createTask } from '../services/taskService';
import { saveTimesheet, getTimesheets } from '../services/timesheetService';
import { getCurrentUser } from '../services/authService';
import { Clock, CheckCircle, ChevronDown, ChevronUp, Calendar, Plus } from 'lucide-react';

const Dashboard = () => {
    const location = useLocation();
    const [loading, setLoading] = useState(true);

    // Tasks State
    const [tasks, setTasks] = useState([]);
    const [loggedEntries, setLoggedEntries] = useState([]);

    // Logging State (Dropdown/Inline)
    const [expandedTaskId, setExpandedTaskId] = useState(null);
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
            // 1. Fetch All Tasks
            const allTasks = await getTasks(user.id);
            const pendingTasks = allTasks.filter(t => t.is_completed != 1);

            // Sort by planned_date
            pendingTasks.sort((a, b) => new Date(a.planned_date) - new Date(b.planned_date));
            setTasks(pendingTasks);

            // 2. Fetch Today's Logged Entries (for the new widget)
            const timesheetsData = await getTimesheets(user.id);
            const todaySheet = timesheetsData.find(t => t.date === today);
            setLoggedEntries(todaySheet ? todaySheet.entries.filter(e => e.is_deleted != 1) : []);

        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    const getTaskTextColor = (plannedDate) => {
        const taskDate = new Date(plannedDate);
        const todayDate = new Date(today);
        taskDate.setHours(0, 0, 0, 0);
        todayDate.setHours(0, 0, 0, 0);

        if (taskDate.getTime() < todayDate.getTime()) return 'text-red-600 font-bold'; // Overdue - Bright Red
        if (taskDate.getTime() === todayDate.getTime()) return 'text-yellow-600 font-semibold'; // Due Today
        return 'text-green-600 font-semibold'; // Future
    };

    const getStatusDotColor = (plannedDate) => {
        const taskDate = new Date(plannedDate);
        const todayDate = new Date(today);
        taskDate.setHours(0, 0, 0, 0);
        todayDate.setHours(0, 0, 0, 0);

        if (taskDate.getTime() < todayDate.getTime()) return 'bg-red-600';
        if (taskDate.getTime() === todayDate.getTime()) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const toggleTaskExpand = (task) => {
        if (expandedTaskId === task.id) {
            setExpandedTaskId(null);
            setLogForm({ duration: '', remarks: '' });
        } else {
            setExpandedTaskId(task.id);
            setLogForm({
                duration: task.eta || '',
                remarks: ''
            });
        }
    };

    const handleLogWork = async (e, task) => {
        e.preventDefault();
        if (!task || !logForm.duration) return;

        setIsSubmitting(true);
        try {
            const timesheetsData = await getTimesheets(user.id);
            const todaySheet = timesheetsData.find(t => t.date === today);
            const currentEntries = todaySheet ? todaySheet.entries.filter(e => e.is_deleted != 1) : [];

            const durationInHours = (parseFloat(logForm.duration) / 60).toFixed(2);

            const newEntry = {
                id: Date.now(),
                duration: durationInHours,
                description: logForm.remarks || task.task_content,
                taskId: task.id,
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

            await updateTask(task.id, { is_completed: 1 });

            setExpandedTaskId(null);
            setLogForm({ duration: '', remarks: '' });
            fetchDashboardData();

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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column (4/12 width) - Framework & Logged Tasks */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Widget 1: Framework Percentage */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[250px]">
                        <div className="relative w-40 h-40">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                <circle className="text-gray-100 stroke-current" strokeWidth="10" cx="50" cy="50" r="40" fill="transparent"></circle>
                                <circle className="text-indigo-600 stroke-current" strokeWidth="10" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray="251.2" strokeDashoffset="62.8" transform="rotate(-90 50 50)"></circle>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-gray-900">75%</span>
                                <span className="text-xs text-gray-500 uppercase tracking-wider mt-1">Framework</span>
                            </div>
                        </div>
                    </div>

                    {/* Widget 2: Logged Today */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[250px] overflow-hidden">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock size={20} className="text-green-600" />
                            Logged Today
                        </h2>
                        <div className="space-y-4">
                            {loggedEntries.length === 0 ? (
                                <p className="text-sm text-gray-400 italic text-center py-4">No work logged yet today.</p>
                            ) : (
                                loggedEntries.map((entry, index) => (
                                    <div key={index} className="flex items-start gap-3 text-sm">
                                        <div className="mt-1.5 w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                        <div>
                                            <p className="font-medium text-gray-900">{entry.description || "Work Logged"}</p>
                                            <p className="text-xs text-gray-500">{entry.duration} hrs</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column (8/12 width) - Tasks List */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-900">Your Tasks</h2>
                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                {tasks.length} Pending
                            </span>
                        </div>

                        {/* Task List Header */}
                        <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100 grid grid-cols-12 gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <div className="col-span-6">Task</div>
                            <div className="col-span-3 text-right">ETA</div>
                            <div className="col-span-3 text-right">Due Date</div>
                        </div>

                        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                            {tasks.length === 0 ? (
                                <p className="text-center text-gray-400 py-10">All caught up!</p>
                            ) : (
                                tasks.map(task => (
                                    <div key={task.id} className="group border-b border-dashed border-gray-100 pb-4 last:border-0 last:pb-0">
                                        {/* Task Row */}
                                        <div
                                            className="grid grid-cols-12 gap-4 items-center cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                                            onClick={() => toggleTaskExpand(task)}
                                        >
                                            <div className="col-span-6 flex items-center gap-3 overflow-hidden">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDotColor(task.planned_date)}`}></div>
                                                <span className={`truncate text-sm ${getTaskTextColor(task.planned_date)}`}>
                                                    {task.task_content}
                                                </span>
                                            </div>
                                            <div className="col-span-3 text-right text-sm text-gray-500">
                                                {task.eta ? `${task.eta}m` : '-'}
                                            </div>
                                            <div className="col-span-3 text-right text-sm text-gray-500">
                                                {new Date(task.planned_date).toLocaleDateString()}
                                            </div>
                                        </div>

                                        {/* Dropdown Content */}
                                        {expandedTaskId === task.id && (
                                            <div className="mt-2 pl-4 border-l-2 border-indigo-100 ml-2">
                                                <form onSubmit={(e) => handleLogWork(e, task)} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-xs font-semibold text-gray-500 uppercase">Log Completion</h4>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Time Spent (Mins)</label>
                                                            <input
                                                                type="number"
                                                                required
                                                                placeholder="e.g. 60"
                                                                className="w-full text-sm p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 bg-white"
                                                                value={logForm.duration}
                                                                onChange={(e) => setLogForm(prev => ({ ...prev, duration: e.target.value }))}
                                                            />
                                                        </div>
                                                        <div className="flex items-end">
                                                            <button
                                                                type="submit"
                                                                disabled={isSubmitting}
                                                                className="w-full text-sm bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                                                            >
                                                                {isSubmitting ? 'Saving...' : 'Log & Complete'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <textarea
                                                            placeholder="Remarks (Optional)"
                                                            className="w-full text-sm p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 bg-white h-16 resize-none"
                                                            value={logForm.remarks}
                                                            onChange={(e) => setLogForm(prev => ({ ...prev, remarks: e.target.value }))}
                                                        />
                                                    </div>
                                                </form>
                                            </div>
                                        )}
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

export default Dashboard;
