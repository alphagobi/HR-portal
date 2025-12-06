import React, { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from '../services/taskService';
import { getCurrentUser } from '../services/authService';
import { Plus, Trash2, CheckCircle, Circle, Calendar, Clock, Search, X } from 'lucide-react';
import clsx from 'clsx';

const Tasks = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('monthly'); // 'daily', 'weekly', 'monthly'
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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

    const handleToggleComplete = async (task) => {
        try {
            await updateTask(task.id, { is_completed: !task.is_completed });
            fetchTasks();
        } catch (error) {
            console.error("Failed to update task", error);
        }
    };

    const handleDeleteTask = async (id) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            try {
                await deleteTask(id);
                fetchTasks();
            } catch (error) {
                console.error("Failed to delete task", error);
            }
        }
    };

    const addEta = (minutes) => {
        setNewTask(prev => {
            const currentEta = parseInt(prev.eta || 0);
            return { ...prev, eta: (currentEta + minutes).toString() };
        });
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
                                    <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-4 flex-1">
                                            <button
                                                onClick={() => handleToggleComplete(task)}
                                                className={clsx(
                                                    "flex-shrink-0 transition-colors",
                                                    task.is_completed ? "text-green-500" : "text-gray-300 hover:text-indigo-500"
                                                )}
                                            >
                                                {task.is_completed ? <CheckCircle size={24} /> : <Circle size={24} />}
                                            </button>
                                            <div className="flex-1">
                                                <p className={clsx(
                                                    "text-gray-900 font-medium transition-all",
                                                    task.is_completed && "text-gray-400 line-through"
                                                )}>
                                                    {task.task_content}
                                                </p>
                                                {task.eta && (
                                                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                                        <Clock size={12} />
                                                        <span>{task.eta} mins</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                                            title="Delete Task"
                                        >
                                            <Trash2 size={18} />
                                        </button>
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
