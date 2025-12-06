import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTasks, createTask, updateTask, deleteTask } from '../services/taskService';
import { getTimesheets, saveTimesheet } from '../services/timesheetService';
import { getCurrentUser } from '../services/authService';
import { Plus, Calendar, Clock, Search, X, Play, ChevronDown, ChevronUp, Save } from 'lucide-react';
import clsx from 'clsx';

const Tasks = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('monthly'); // 'daily', 'weekly', 'monthly'
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Inline Logging State
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [logData, setLogData] = useState({
        date: new Date().toISOString().split('T')[0],
        duration: '',
        remarks: ''
    });

    const [newTask, setNewTask] = useState({
        content: '',
        date: new Date().toISOString().split('T')[0],
        eta: ''
    });

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const user = getCurrentUser();
            if (user) {
                const data = await getTasks(user.id);
                setTasks(data);
            }
        } catch (error) {
            console.error("Failed to fetch tasks", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!newTask.content) return;

        const user = getCurrentUser();
        if (!user) return;

        try {
            await createTask({
                user_id: user.id,
                task_content: newTask.content,
                planned_date: newTask.date,
                eta: newTask.eta || null
            });
            setNewTask({ content: '', date: new Date().toISOString().split('T')[0], eta: '' });
            setShowAddModal(false);
            fetchTasks();
        } catch (error) {
            console.error("Failed to create task", error);
        }
    };

    // Removed handleDeleteTask as per request

    const toggleLogForm = (task) => {
        if (expandedTaskId === task.id) {
            setExpandedTaskId(null);
        } else {
            setExpandedTaskId(task.id);
            setLogData({
                date: new Date().toISOString().split('T')[0],
                duration: task.eta || '', // Pre-fill with ETA if available
                remarks: task.task_content
            });
        }
    };

    const handleSaveLog = async (task) => {
        if (!logData.duration || !logData.date) {
            alert("Please fill in date and duration.");
            return;
        }

        const user = getCurrentUser();
        if (!user) return;

        try {
            // 1. Fetch existing timesheet for the selected date
            const timesheets = await getTimesheets(user.id);
            const existingSheet = timesheets.find(t => t.date === logData.date);

            let entries = existingSheet ? [...existingSheet.entries] : [];

            // 2. Add new entry
            const durationInHours = (parseFloat(logData.duration) / 60).toFixed(2);
            const newEntry = {
                id: Date.now(), // Temp ID
                duration: durationInHours,
                description: logData.remarks || task.task_content,
                taskId: task.id,
                project: 'General',
                startTime: '09:00', // Defaults
                endTime: '10:00',
                type: 'planned'
            };
            entries.push(newEntry);

            // 3. Save Timesheet
            await saveTimesheet({
                employeeId: user.id,
                date: logData.date,
                entries: entries,
                status: existingSheet ? existingSheet.status : 'draft'
            });

            // 4. Update Task as Completed
            await updateTask(task.id, {
                is_completed: true,
                // We rely on the backend to link the task to the entry if needed, 
                // but for now we just mark it complete. 
                // Ideally updateTask should also accept related_entry_id but we don't have the real DB ID of the entry yet.
                // The backend sync logic (if any) or a second call would be needed for perfect linking.
                // For now, let's assume the backend `saveTimesheet` or `updateTask` handles it or we just mark it complete.
            });

            setExpandedTaskId(null);
            fetchTasks(); // Refresh to get updated status and colors
        } catch (error) {
            console.error("Failed to log work", error);
            alert("Failed to log work. Please try again.");
        }
    };

    const addEta = (minutes) => {
        setNewTask(prev => {
            const currentEta = parseInt(prev.eta || 0);
            return { ...prev, eta: (currentEta + minutes).toString() };
        });
    };

    const getTaskColor = (task) => {
        if (!task.is_completed) return "bg-white border-gray-200";

        if (!task.completed_date) return "bg-gray-50 border-gray-200"; // Completed but no date?

        const planned = new Date(task.planned_date);
        const completed = new Date(task.completed_date);

        // Reset times to compare only dates
        planned.setHours(0, 0, 0, 0);
        completed.setHours(0, 0, 0, 0);

        if (completed.getTime() < planned.getTime()) {
            return "bg-green-50 border-green-200"; // Early
        } else if (completed.getTime() === planned.getTime()) {
            return "bg-yellow-50 border-yellow-200"; // On Time
        } else {
            return "bg-red-50 border-red-200"; // Late
        }
    };

    // Filter Logic
    const getFilteredTasks = () => {
        let filtered = tasks;

        // Date Filtering
        if (viewMode === 'monthly') {
            const selectedMonth = selectedDate.slice(0, 7);
            filtered = tasks.filter(t => t.planned_date.startsWith(selectedMonth));
        } else if (viewMode === 'daily') {
            filtered = tasks.filter(t => t.planned_date === selectedDate);
        } else if (viewMode === 'weekly') {
            const date = new Date(selectedDate);
            const day = date.getDay(); // 0 (Sun) to 6 (Sat)
            const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
            const monday = new Date(date.setDate(diff));
            const sunday = new Date(date.setDate(monday.getDate() + 6));

            const startStr = monday.toISOString().split('T')[0];
            const endStr = sunday.toISOString().split('T')[0];

            filtered = tasks.filter(t => t.planned_date >= startStr && t.planned_date <= endStr);
        }

        // Search Filtering
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            // If search query exists, we want to show ALL tasks for days that have a match
            // First, find dates that have matching tasks
            const matchingDates = new Set(
                filtered.filter(t => t.task_content.toLowerCase().includes(lowerQuery))
                    .map(t => t.planned_date)
            );
            // Then filter to include all tasks for those dates
            filtered = filtered.filter(t => matchingDates.has(t.planned_date));
        }

        return filtered;
    };

    const filteredTasks = getFilteredTasks();

    // Calculate Stats
    const totalTasks = filteredTasks.length;
    const plannedMinutes = filteredTasks.reduce((acc, task) => acc + parseInt(task.eta || 0), 0);
    const plannedHours = plannedMinutes / 60;

    // Calculate Capacity (8 hours per day)
    let capacityHours = 0;
    if (viewMode === 'daily') {
        capacityHours = 8;
    } else if (viewMode === 'weekly') {
        capacityHours = 7 * 8; // 7 days
    } else if (viewMode === 'monthly') {
        const year = parseInt(selectedDate.split('-')[0]);
        const month = parseInt(selectedDate.split('-')[1]);
        const daysInMonth = new Date(year, month, 0).getDate();
        capacityHours = daysInMonth * 8;
    }

    const unplannedHours = Math.max(0, capacityHours - plannedHours);

    // Group tasks by date for display
    const groupedTasks = filteredTasks.reduce((acc, task) => {
        const date = task.planned_date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(task);
        return acc;
    }, {});

    const sortedDates = Object.keys(groupedTasks).sort((a, b) => new Date(b) - new Date(a));

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Task Planner</h1>
                    <p className="text-gray-500">Plan your work ahead of time.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* View Controls */}
                    <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-md">
                            <button
                                onClick={() => setViewMode('daily')}
                                className={clsx("px-3 py-1 text-sm font-medium rounded-md transition-colors", viewMode === 'daily' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
                            >
                                Daily
                            </button>
                            <button
                                onClick={() => setViewMode('weekly')}
                                className={clsx("px-3 py-1 text-sm font-medium rounded-md transition-colors", viewMode === 'weekly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
                            >
                                Weekly
                            </button>
                            <button
                                onClick={() => setViewMode('monthly')}
                                className={clsx("px-3 py-1 text-sm font-medium rounded-md transition-colors", viewMode === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
                            >
                                Monthly
                            </button>
                        </div>

                        <div className="h-6 w-px bg-gray-200 mx-2"></div>

                        {viewMode === 'monthly' ? (
                            <input
                                type="month"
                                value={selectedDate.slice(0, 7)}
                                onChange={(e) => setSelectedDate(e.target.value + '-01')}
                                className="p-1 border-none bg-transparent focus:ring-0 text-sm font-medium text-gray-700 outline-none"
                            />
                        ) : (
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="p-1 border-none bg-transparent focus:ring-0 text-sm font-medium text-gray-700 outline-none"
                            />
                        )}
                    </div>

                    <div className="relative w-64 hidden md:block">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus size={20} /> Add Task
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium">Total Tasks</p>
                    <h3 className="text-2xl font-bold text-gray-900">{totalTasks}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-green-600 font-medium">Planned Hours</p>
                    <h3 className="text-2xl font-bold text-green-700">{plannedHours.toFixed(1)}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-orange-600 font-medium">Unplanned Hours</p>
                    <h3 className="text-2xl font-bold text-orange-700">{unplannedHours.toFixed(1)}</h3>
                </div>
            </div>

            <div className="space-y-6">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading tasks...</div>
                ) : sortedDates.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No tasks found for this period.</div>
                ) : (
                    sortedDates.map(date => (
                        <div key={date} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center gap-2">
                                <Calendar size={18} className="text-indigo-600" />
                                <h3 className="font-semibold text-gray-900">
                                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {groupedTasks[date].map(task => (
                                    <div key={task.id} className={`transition-colors border-b border-gray-100 last:border-0 ${getTaskColor(task)}`}>
                                        <div className="p-4 flex items-center justify-between group">
                                            <div className="flex items-center gap-4 flex-1">
                                                <button
                                                    onClick={() => toggleLogForm(task)}
                                                    className={clsx(
                                                        "flex-shrink-0 transition-colors p-2 rounded-full hover:bg-black/5",
                                                        task.is_completed ? "text-gray-400" : "text-indigo-600"
                                                    )}
                                                    title={task.is_completed ? "Completed" : "Log Work"}
                                                    disabled={task.is_completed}
                                                >
                                                    {task.is_completed ? <div className="w-5 h-5 rounded-full bg-gray-400" /> : <Play size={20} fill="currentColor" />}
                                                </button>
                                                <div className="flex-1">
                                                    <p className={clsx(
                                                        "text-gray-900 font-medium transition-all",
                                                        task.is_completed && "text-gray-500 line-through"
                                                    )}>
                                                        {task.task_content}
                                                    </p>
                                                    {task.eta && (
                                                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                            <Clock size={12} />
                                                            <span>{task.eta} mins</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Inline Log Form */}
                                        {expandedTaskId === task.id && (
                                            <div className="p-4 bg-gray-50 border-t border-gray-100 ml-12 mr-4 mb-4 rounded-lg shadow-inner">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                                                        <input
                                                            type="date"
                                                            className="w-full p-2 text-sm border border-gray-200 rounded-md"
                                                            value={logData.date}
                                                            onChange={(e) => setLogData({ ...logData, date: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Duration (mins)</label>
                                                        <input
                                                            type="number"
                                                            className="w-full p-2 text-sm border border-gray-200 rounded-md"
                                                            placeholder="e.g. 60"
                                                            value={logData.duration}
                                                            onChange={(e) => setLogData({ ...logData, duration: e.target.value })}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleSaveLog(task)}
                                                        className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center justify-center gap-2"
                                                    >
                                                        <Save size={16} /> Save Log
                                                    </button>
                                                </div>
                                                <div className="mt-3">
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Remarks</label>
                                                    <input
                                                        type="text"
                                                        className="w-full p-2 text-sm border border-gray-200 rounded-md"
                                                        placeholder="Optional remarks..."
                                                        value={logData.remarks}
                                                        onChange={(e) => setLogData({ ...logData, remarks: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Task Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 m-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Add New Task</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTask}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    required
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newTask.date}
                                    onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Task Description <span className="text-red-500">*</span></label>
                                <textarea
                                    autoFocus
                                    required
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                                    placeholder="What do you need to do?"
                                    value={newTask.content}
                                    onChange={(e) => setNewTask({ ...newTask, content: e.target.value })}
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">ETA (Minutes)</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="number"
                                        placeholder="e.g. 30"
                                        className="flex-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newTask.eta}
                                        onChange={(e) => setNewTask({ ...newTask, eta: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => addEta(15)} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 font-medium transition-colors">+15m</button>
                                    <button type="button" onClick={() => addEta(30)} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 font-medium transition-colors">+30m</button>
                                    <button type="button" onClick={() => addEta(60)} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 font-medium transition-colors">+60m</button>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                                >
                                    Add Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tasks;
