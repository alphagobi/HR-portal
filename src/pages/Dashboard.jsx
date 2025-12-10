import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getTasks, updateTask, createTask } from '../services/taskService';
import { saveTimesheet, getTimesheets } from '../services/timesheetService';
import { getFrameworkAllocations } from '../services/frameworkService';
import { getCurrentUser } from '../services/authService';
import { Clock, CheckCircle, ChevronDown, ChevronUp, Calendar, Plus } from 'lucide-react';

const Dashboard = () => {
    const location = useLocation();
    const [loading, setLoading] = useState(true);

    // Tasks State
    const [tasks, setTasks] = useState([]);
    const [loggedEntries, setLoggedEntries] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [frameworkTotal, setFrameworkTotal] = useState(0);

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

            // 2. Fetch Today's Logged Entries
            const timesheetsData = await getTimesheets(user.id);
            const todaySheet = timesheetsData.find(t => t.date === today);
            setLoggedEntries(todaySheet ? todaySheet.entries.filter(e => e.is_deleted != 1) : []);

            // 3. Fetch Framework Allocations
            const frameworkData = await getFrameworkAllocations(user.id);
            setAllocations(frameworkData || []);

            const total = (frameworkData || []).reduce((sum, item) => sum + parseInt(item.percentage), 0);
            setFrameworkTotal(total);

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

    const getTaskCounts = () => {
        let overdue = 0;
        let dueToday = 0;
        let future = 0;

        const todayDate = new Date(today);
        todayDate.setHours(0, 0, 0, 0);

        tasks.forEach(t => {
            const taskDate = new Date(t.planned_date);
            taskDate.setHours(0, 0, 0, 0);

            if (taskDate.getTime() < todayDate.getTime()) overdue++;
            else if (taskDate.getTime() === todayDate.getTime()) dueToday++;
            else future++;
        });

        return { overdue, dueToday, future };
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

    // --- Framework Chart Logic ---
    const renderDoughnutSegments = () => {
        let cumulativePercent = 0;
        const radius = 40;
        const circumference = 2 * Math.PI * radius; // ~251.2

        // Prepare data: existing allocations + unplanned if < 100
        const data = [...allocations];
        if (frameworkTotal < 100) {
            data.push({ category_name: 'Unplanned', percentage: 100 - frameworkTotal, color: 'text-gray-200' });
        }

        // Color palette for dynamic segments
        const colors = ['text-indigo-600', 'text-purple-500', 'text-blue-400', 'text-teal-400', 'text-orange-400'];

        return data.map((item, index) => {
            const percent = parseInt(item.percentage);
            const offset = circumference - (percent / 100) * circumference;
            const rotation = (cumulativePercent / 100) * 360 - 90; // Start from top (-90deg)
            const colorClass = item.category_name === 'Unplanned' ? item.color : colors[index % colors.length];

            const segment = (
                <circle
                    key={index}
                    className={`${colorClass} stroke-current transition-all duration-500 ease-out`}
                    strokeWidth="10"
                    strokeLinecap="round" // Optional: makes ends round, might look weird for contiguous
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
                    transform={`rotate(${rotation} 50 50)`}
                />
            );

            cumulativePercent += percent;
            return segment;
        });
    };

    const counts = getTaskCounts();

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0]}!</h1>
                <p className="text-gray-500">Your dashboard overview.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column (4/12 width) - Framework & Logged Tasks */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Widget 1: Framework Percentage */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center h-[280px] relative">
                        <div className="relative w-48 h-48">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                {/* Background Circle */}
                                <circle className="text-gray-100 stroke-current" strokeWidth="10" cx="50" cy="50" r="40" fill="transparent"></circle>
                                {/* Dynamic Segments */}
                                {renderDoughnutSegments()}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-gray-900">{frameworkTotal}%</span>
                                <span className="text-xs text-gray-500 uppercase tracking-wider mt-1">Planned</span>
                            </div>
                        </div>
                        {/* Legend */}
                        <div className="flex flex-wrap justify-center gap-3 mt-4">
                            {allocations.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-xs">
                                    <div className={`w-2 h-2 rounded-full ${['bg-indigo-600', 'bg-purple-500', 'bg-blue-400', 'bg-teal-400', 'bg-orange-400'][idx % 5]}`}></div>
                                    <span className="text-gray-600 font-medium">{item.category_name} ({item.percentage}%)</span>
                                </div>
                            ))}
                            {frameworkTotal < 100 && (
                                <div className="flex items-center gap-1.5 text-xs">
                                    <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                    <span className="text-gray-400 font-medium">Unplanned ({100 - frameworkTotal}%)</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Widget 2: Logged Today */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[296px] flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-2 flex-shrink-0">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Clock size={18} className="text-indigo-600" />
                                Logged Today
                            </h2>
                            <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                                {loggedEntries.reduce((acc, curr) => acc + parseFloat(curr.duration || 0), 0).toFixed(2)} hrs
                            </span>
                        </div>
                        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                            {loggedEntries.length === 0 ? (
                                <div className="text-center py-6">
                                    <Clock size={32} className="mx-auto text-gray-200 mb-2" />
                                    <p className="text-sm text-gray-400 italic">No work logged yet.</p>
                                </div>
                            ) : (
                                loggedEntries.map((entry, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm group hover:bg-gray-50 p-2 rounded-lg -mx-2 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0 group-hover:bg-indigo-600 transition-colors"></div>
                                            <span className="font-medium text-gray-700 truncate group-hover:text-gray-900 transition-colors">
                                                {entry.description || "Work Logged"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 pl-3">
                                            <span className="font-bold text-gray-900">{entry.duration}</span>
                                            <span className="text-xs text-gray-500 font-medium">hrs</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column (8/12 width) - Tasks List */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
                        {/* Fixed height to match approx height of left column items (280 + 296 + 24 gap = 600) */}
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-900">Your Tasks</h2>
                            <div className="flex gap-2">
                                {/* Red - Overdue */}
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${counts.overdue > 0 ? 'text-red-700 bg-red-100' : 'text-gray-400 bg-gray-50'}`}>
                                    {counts.overdue} Red
                                </span>
                                {/* Yellow - Due Today */}
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${counts.dueToday > 0 ? 'text-yellow-700 bg-yellow-100' : 'text-gray-400 bg-gray-50'}`}>
                                    {counts.dueToday} Yellow
                                </span>
                                {/* Green - Future */}
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${counts.future > 0 ? 'text-green-700 bg-green-100' : 'text-gray-400 bg-gray-50'}`}>
                                    {counts.future} Green
                                </span>
                            </div>
                        </div>

                        {/* Task List Header */}
                        <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100 grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <div className="col-span-6">Task</div>
                            <div className="col-span-3 text-right">ETA</div>
                            <div className="col-span-3 text-right">Due Date</div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {tasks.length === 0 ? (
                                <p className="text-center text-gray-400 py-10">All caught up!</p>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {tasks.map(task => (
                                        <div key={task.id} className="group hover:bg-gray-50 transition-colors">
                                            {/* Task Row */}
                                            <div
                                                className="grid grid-cols-12 gap-4 items-center cursor-pointer px-6 py-3"
                                                onClick={() => toggleTaskExpand(task)}
                                            >
                                                <div className="col-span-6 flex items-center gap-3 overflow-hidden">
                                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDotColor(task.planned_date)}`}></div>
                                                    <span className={`truncate text-sm font-bold ${getTaskTextColor(task.planned_date)}`}>
                                                        {task.task_content}
                                                    </span>
                                                </div>
                                                <div className="col-span-3 text-right text-xs font-medium text-gray-500">
                                                    {task.eta ? `${task.eta}m` : '-'}
                                                </div>
                                                <div className="col-span-3 text-right text-xs font-medium text-gray-500">
                                                    {new Date(task.planned_date).toLocaleDateString()}
                                                </div>
                                            </div>

                                            {/* Dropdown Content */}
                                            {expandedTaskId === task.id && (
                                                <div className="px-6 pb-4 bg-gray-50/50 border-t border-gray-100">
                                                    <form onSubmit={(e) => handleLogWork(e, task)} className="mt-4 space-y-3 max-w-lg">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-xs font-bold text-gray-500 uppercase">Log Task Completion</h4>
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
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
