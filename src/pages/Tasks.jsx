import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTasks, createTask, deleteTask } from '../services/taskService';
import { getCurrentUser } from '../services/authService';
import { Plus, Calendar, Search, X } from 'lucide-react';
import clsx from 'clsx';
import { getTaskStatusColor } from '../utils/taskUtils';
import { getFrameworkAllocations } from '../services/frameworkService';

const Tasks = () => {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('monthly'); // 'daily', 'weekly', 'monthly'
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Recurring Task State
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceSettings, setRecurrenceSettings] = useState({
        frequency: 'daily',
        interval: 1,
        endType: 'date',
        endDate: '',
        endCount: 10,
        weekDays: []
    });

    const [newTask, setNewTask] = useState({
        content: '',
        date: new Date().toISOString().split('T')[0],
        eta: '',
        frameworkId: ''
    });

    const [frameworks, setFrameworks] = useState([]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const user = getCurrentUser();
            if (user) {
                const [tasksData, frameworksData] = await Promise.all([
                    getTasks(user.id),
                    getFrameworkAllocations(user.id)
                ]);
                setTasks(tasksData);
                setFrameworks(frameworksData);
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
        if (!newTask.eta || parseInt(newTask.eta) <= 0) {
            alert("ETA is mandatory and must be greater than 0 minutes.");
            return;
        }

        const user = getCurrentUser();
        if (!user) return;

        try {
            await createTask({
                user_id: user.id,
                task_content: newTask.content,
                planned_date: newTask.date,
                eta: newTask.eta || null,
                framework_id: newTask.frameworkId || null,
                recurrence: isRecurring ? { ...recurrenceSettings, isRecurring: true } : null
            });
            setNewTask({ content: '', date: new Date().toISOString().split('T')[0], eta: '', frameworkId: '' });
            setIsRecurring(false); // Reset recurrence
            setShowAddModal(false);
            fetchTasks();
        } catch (error) {
            console.error("Failed to create task", error);
        }
    };

    // Removed handleDeleteTask as per request

    // handleSaveLog REMOVED
    // toggleLogForm REMOVED

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

            {/* Task List - Redesigned to match Timesheet.jsx */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading tasks...</div>
                ) : sortedDates.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No tasks found for this period.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {sortedDates.map(date => {
                            const daysTasks = groupedTasks[date];
                            const daysPlannedMinutes = daysTasks.reduce((acc, t) => acc + parseInt(t.eta || 0), 0);
                            const daysPlannedHours = (daysPlannedMinutes / 60).toFixed(1);

                            return (
                                <div key={date} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            <Calendar size={18} className="text-indigo-600" />
                                            {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                        </h3>
                                        <span className="text-sm font-medium text-gray-500">
                                            {daysPlannedHours} hrs
                                        </span>
                                    </div>

                                    <div className="space-y-2 pl-6 border-l-2 border-gray-100">
                                        {daysTasks.map(task => {
                                            const status = getTaskStatusColor(task.planned_date, task.is_completed);

                                            return (
                                                <div key={task.id} className="flex items-center justify-between text-sm group">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full ${status.dot}`}></div>
                                                        <span className={clsx(`font-medium ${status.text}`, task.is_completed && "line-through text-gray-400")}>
                                                            {task.task_content}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {task.is_completed && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                                                                Completed
                                                            </span>
                                                        )}
                                                        {task.eta && (
                                                            <span className="font-medium text-gray-900">{task.eta} mins</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Link Framework (Strategy)</label>
                                <select
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    value={newTask.frameworkId}
                                    onChange={(e) => setNewTask({ ...newTask, frameworkId: e.target.value })}
                                >
                                    <option value="">-- No Framework --</option>
                                    {frameworks.map(fw => (
                                        <option key={fw.id} value={fw.id}>{fw.category_name} ({fw.percentage}%)</option>
                                    ))}
                                </select>
                            </div>

                            {/* Recurrence Toggle */}
                            <div className="mb-4">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={isRecurring}
                                        onChange={(e) => setIsRecurring(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Recurring Task?</span>
                                </label>

                                {/* Recurrence Settings */}
                                {isRecurring && (
                                    <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-4">
                                        {/* Frequency & Interval */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Frequency</label>
                                                <select
                                                    value={recurrenceSettings.frequency}
                                                    onChange={(e) => setRecurrenceSettings({ ...recurrenceSettings, frequency: e.target.value })}
                                                    className="w-full p-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                                                >
                                                    <option value="daily">Daily</option>
                                                    <option value="weekly">Weekly</option>
                                                    <option value="monthly">Monthly</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Interval (Every X)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={recurrenceSettings.interval}
                                                    onChange={(e) => setRecurrenceSettings({ ...recurrenceSettings, interval: e.target.value })}
                                                    className="w-full p-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Weekdays (Only if Weekly) */}
                                        {recurrenceSettings.frequency === 'weekly' && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">On Days</label>
                                                <div className="flex gap-2">
                                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onClick={() => {
                                                                const days = recurrenceSettings.weekDays.includes(i)
                                                                    ? recurrenceSettings.weekDays.filter(day => day !== i)
                                                                    : [...recurrenceSettings.weekDays, i];
                                                                setRecurrenceSettings({ ...recurrenceSettings, weekDays: days });
                                                            }}
                                                            className={clsx(
                                                                "w-8 h-8 rounded-full text-xs font-bold transition-colors flex items-center justify-center",
                                                                recurrenceSettings.weekDays.includes(i)
                                                                    ? "bg-indigo-600 text-white"
                                                                    : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                                                            )}
                                                        >
                                                            {d}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* End Condition */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Ends</label>
                                            <div className="flex flex-col gap-2 bg-white p-2 rounded border border-gray-100">
                                                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        value="date"
                                                        checked={recurrenceSettings.endType === 'date'}
                                                        onChange={() => setRecurrenceSettings({ ...recurrenceSettings, endType: 'date' })}
                                                        name="endType"
                                                    />
                                                    <span>On Date</span>
                                                    <input
                                                        type="date"
                                                        disabled={recurrenceSettings.endType !== 'date'}
                                                        value={recurrenceSettings.endDate}
                                                        onChange={(e) => setRecurrenceSettings({ ...recurrenceSettings, endDate: e.target.value })}
                                                        className="ml-auto p-1 border border-gray-200 rounded text-xs w-32 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                                                    />
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        value="count"
                                                        checked={recurrenceSettings.endType === 'count'}
                                                        onChange={() => setRecurrenceSettings({ ...recurrenceSettings, endType: 'count' })}
                                                        name="endType"
                                                    />
                                                    <span>After</span>
                                                    <input
                                                        type="number"
                                                        disabled={recurrenceSettings.endType !== 'count'}
                                                        value={recurrenceSettings.endCount}
                                                        onChange={(e) => setRecurrenceSettings({ ...recurrenceSettings, endCount: e.target.value })}
                                                        className="w-16 p-1 border border-gray-200 rounded text-xs mx-1 outline-none disabled:bg-gray-50 disabled:text-gray-400 text-center"
                                                    />
                                                    <span>occurrences</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">ETA (Minutes) <span className="text-red-500">*</span></label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="number"
                                        placeholder="e.g. 30"
                                        className="flex-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newTask.eta}
                                        onChange={(e) => setNewTask({ ...newTask, eta: e.target.value })}
                                        required
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
                    </div >
                </div >
            )}
        </div >
    );
};

export default Tasks;
