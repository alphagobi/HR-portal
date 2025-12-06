import React, { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from '../services/taskService';
import { getCurrentUser } from '../services/authService';
import { Calendar, Plus, Trash2, CheckSquare, Square, Clock, Filter } from 'lucide-react';
import clsx from 'clsx';

const Tasks = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    // Removed filter state as we are showing all tasks grouped by date

    const [newTask, setNewTask] = useState({
        content: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: ''
    });

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const user = getCurrentUser();
            if (user) {
                // Fetch tasks for a range or all upcoming. 
                // Since API is currently date-based, we might need to iterate or update API.
                // For now, let's fetch for the selected date in the form to at least show something relevant,
                // OR better, let's fetch for today and next 7 days if API allows, or just today for now 
                // and rely on the user changing the date in the form to see other days?
                // WAIT, user said "list and viewable for multiple days at once".
                // The current API `getTasks(userId, date)` filters by date.
                // I should probably update the API to allow fetching all tasks if date is null?
                // Let's check `tasks.php`. It requires date.
                // I will modify `tasks.php` to make date optional for GET.

                // Assuming I will update API to support no date for all tasks:
                const data = await getTasks(user.id, null);
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

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTask.content.trim() || !newTask.date) return;

        const user = getCurrentUser();
        if (!user) return;

        try {
            await createTask({
                user_id: user.id,
                task_content: newTask.content,
                planned_date: newTask.date,
                start_time: newTask.startTime,
                end_time: newTask.endTime
            });
            setNewTask(prev => ({ ...prev, content: '', startTime: '', endTime: '' }));
            fetchTasks();
        } catch (error) {
            console.error("Failed to create task", error);
        }
    };

    const handleToggleTask = async (task) => {
        try {
            await updateTask(task.id, { is_completed: task.is_completed == 1 ? 0 : 1 });
            fetchTasks();
        } catch (error) {
            console.error("Failed to update task", error);
        }
    };

    const handleDeleteTask = async (id) => {
        if (!window.confirm("Delete this task?")) return;
        try {
            await deleteTask(id);
            fetchTasks();
        } catch (error) {
            console.error("Failed to delete task", error);
        }
    };

    // Group tasks by date
    const groupedTasks = tasks.reduce((acc, task) => {
        const date = task.planned_date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(task);
        return acc;
    }, {});

    const sortedDates = Object.keys(groupedTasks).sort();

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Task Planner</h1>
                    <p className="text-gray-500">Plan your work ahead of time.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Task Creation Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-6">
                        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Plus className="text-indigo-600" size={20} />
                            New Task
                        </h2>
                        <form onSubmit={handleAddTask} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    required
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newTask.date}
                                    onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Task Description <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                                    placeholder="What do you need to do?"
                                    value={newTask.content}
                                    onChange={(e) => setNewTask({ ...newTask, content: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                    <input
                                        type="time"
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newTask.startTime}
                                        onChange={(e) => setNewTask({ ...newTask, startTime: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                    <input
                                        type="time"
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newTask.endTime}
                                        onChange={(e) => setNewTask({ ...newTask, endTime: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                            >
                                Add Task
                            </button>
                        </form>
                    </div>
                </div>

                {/* Task List */}
                <div className="lg:col-span-2 space-y-8">
                    {loading ? (
                        <div className="text-center py-12 text-gray-400">Loading tasks...</div>
                    ) : sortedDates.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-100 border-dashed">
                            <p className="text-gray-500 font-medium">No tasks found.</p>
                            <p className="text-sm text-gray-400 mt-1">Use the form to add one!</p>
                        </div>
                    ) : (
                        sortedDates.map(date => (
                            <div key={date} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                                    <Calendar size={18} className="text-indigo-600" />
                                    <span className="font-semibold text-gray-900">
                                        {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {groupedTasks[date].map(task => (
                                        <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors group">
                                            <div className="flex items-start gap-4">
                                                <button
                                                    onClick={() => handleToggleTask(task)}
                                                    className={clsx("mt-1", task.is_completed == 1 ? "text-green-600" : "text-gray-300 hover:text-gray-500")}
                                                >
                                                    {task.is_completed == 1 ? <CheckSquare size={24} /> : <Square size={24} />}
                                                </button>

                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <p className={clsx("text-gray-900 font-medium", task.is_completed == 1 && "line-through text-gray-400")}>
                                                            {task.task_content}
                                                        </p>
                                                    </div>

                                                    {(task.start_time || task.end_time) && (
                                                        <div className="flex items-center gap-1 text-xs text-indigo-600 mt-2 font-medium bg-indigo-50 w-fit px-2 py-1 rounded">
                                                            <Clock size={12} />
                                                            {task.start_time || '...'} - {task.end_time || '...'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Tasks;
