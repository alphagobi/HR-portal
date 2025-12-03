import React, { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from '../services/taskService';
import { getCurrentUser } from '../services/authService';
import { Calendar, Plus, Trash2, CheckSquare, Square, Clock, Filter } from 'lucide-react';
import clsx from 'clsx';

const Tasks = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('upcoming'); // 'upcoming', 'all', or specific date
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const [newTask, setNewTask] = useState({
        content: '',
        date: new Date().toISOString().split('T')[0],
        time: ''
    });

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const user = getCurrentUser();
            if (user) {
                // Currently API filters by date. For "upcoming", we might need to fetch multiple days or update API.
                // For now, let's stick to date-based filtering as per API limitation, or fetch for selectedDate.
                // To support "Upcoming", we'd ideally need an API change to fetch range.
                // Let's assume for this iteration we focus on the selected date planning as requested "set date (mandatory)".
                const data = await getTasks(user.id, selectedDate);
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
    }, [selectedDate]);

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
                planned_time: newTask.time
            });
            setNewTask(prev => ({ ...prev, content: '', time: '' }));
            if (newTask.date === selectedDate) {
                fetchTasks();
            } else {
                setSelectedDate(newTask.date); // Switch to the date we just added to
            }
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

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Task Planner</h1>
                    <p className="text-gray-500">Plan your work ahead of time.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Task Creation Form */}
                <div className="md:col-span-1">
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Time (Optional)</label>
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="e.g. 2h or 30m"
                                        className="flex-1 p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newTask.time}
                                        onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
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
                <div className="md:col-span-2 space-y-6">
                    {/* Date Filter */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-medium text-gray-700">
                            <Calendar size={20} className="text-indigo-600" />
                            <span>Viewing tasks for:</span>
                        </div>
                        <input
                            type="date"
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>

                    {/* Tasks */}
                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center py-12 text-gray-400">Loading tasks...</div>
                        ) : tasks.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-gray-100 border-dashed">
                                <p className="text-gray-500 font-medium">No tasks found for this date.</p>
                                <p className="text-sm text-gray-400 mt-1">Use the form to add one!</p>
                            </div>
                        ) : (
                            tasks.map(task => (
                                <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-indigo-200 transition-all group">
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
                                                <button
                                                    onClick={() => handleDeleteTask(task.id)}
                                                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>

                                            {task.planned_time && (
                                                <div className="flex items-center gap-1 text-xs text-indigo-600 mt-2 font-medium bg-indigo-50 w-fit px-2 py-1 rounded">
                                                    <Clock size={12} />
                                                    {task.planned_time}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Tasks;
