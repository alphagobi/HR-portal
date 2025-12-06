import React, { useEffect, useState } from 'react';
import { getAnnouncements } from '../services/announcementService';
import { getLeaves } from '../services/leaveService';
import { getTasks, updateTask, createTask } from '../services/taskService';
import { getTimesheets, saveTimesheet } from '../services/timesheetService';
import { getCurrentUser } from '../services/authService';
import { Bell, Calendar, CheckCircle, Clock, Plus, CheckSquare, Square, AlertCircle, X } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
            <Icon size={24} className="text-white" />
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
    </div>
);

const Dashboard = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [leaveBalance, setLeaveBalance] = useState('Loading...');
    const [loading, setLoading] = useState(true);

    // Task & Timesheet State
    const [todayTasks, setTodayTasks] = useState([]);
    const [loggedEntries, setLoggedEntries] = useState([]);
    const [logForm, setLogForm] = useState({
        taskId: '',
        duration: '',
        remarks: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New Task State
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskContent, setNewTaskContent] = useState('');
    const [isCreatingTask, setIsCreatingTask] = useState(false);

    const user = getCurrentUser();
    const today = new Date().toISOString().split('T')[0];

    const fetchDashboardData = async () => {
        if (!user?.id) return;

        try {
            // 1. Fetch Announcements
            const announcementsData = await getAnnouncements(user.id);
            setAnnouncements(announcementsData);

            // 2. Fetch Leave Balance
            const leaveData = await getLeaves(user.id);
            if (leaveData.limits && leaveData.usage) {
                const totalLimit = (leaveData.limits['Informed Leave'] || 0) + (leaveData.limits['Emergency Leave'] || 0);
                const totalUsage = (leaveData.usage['Informed Leave'] || 0) + (leaveData.usage['Emergency Leave'] || 0);
                setLeaveBalance(`${totalLimit - totalUsage} Days`);
            } else {
                setLeaveBalance('12 Days');
            }

            // 3. Fetch Today's Tasks
            const tasksData = await getTasks(user.id, today);
            setTodayTasks(tasksData);

            // 4. Fetch Today's Timesheet
            const timesheetsData = await getTimesheets(user.id);
            const todaySheet = timesheetsData.find(t => t.date === today);
            setLoggedEntries(todaySheet ? todaySheet.entries.filter(e => e.is_deleted != 1) : []);

        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleLogWork = async (e) => {
        e.preventDefault();
        if (!logForm.taskId || !logForm.duration || !logForm.remarks) {
            alert("Please fill in all fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Prepare entry
            const newEntry = {
                id: Date.now(), // Temp ID
                duration: parseFloat(logForm.duration),
                description: logForm.remarks,
                taskId: logForm.taskId,
                project: 'General',
                startTime: null,
                endTime: null
            };

            // Get existing entries to preserve them
            const currentEntries = [...loggedEntries, newEntry];

            await saveTimesheet({
                date: today,
                entries: currentEntries,
                employeeId: user.id,
                status: 'draft'
            });

            // Mark task as completed
            await updateTask(logForm.taskId, { is_completed: 1 });

            setLogForm({ taskId: '', duration: '', remarks: '' });
            await fetchDashboardData(); // Refresh all
        } catch (error) {
            console.error("Failed to log work", error);
            alert("Failed to log work. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!newTaskContent.trim()) return;

        setIsCreatingTask(true);
        try {
            const response = await createTask({
                user_id: user.id,
                task_content: newTaskContent,
                planned_date: today
            });

            // Refresh tasks
            const tasksData = await getTasks(user.id, today);
            setTodayTasks(tasksData);

            // Select the new task (assuming response returns id or we find it)
            // For safety, let's just find the task with the same content created just now.
            const newTask = tasksData.find(t => t.task_content === newTaskContent && !t.is_completed);

            if (newTask) {
                setLogForm(prev => ({ ...prev, taskId: newTask.id, remarks: newTask.task_content }));
            }

            setNewTaskContent('');
            setShowAddTask(false);
        } catch (error) {
            console.error("Failed to create task", error);
            alert("Failed to create task.");
        } finally {
            setIsCreatingTask(false);
        }
    };

    const totalLoggedHours = loggedEntries.reduce((acc, curr) => acc + parseFloat(curr.duration || 0), 0);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0].toLowerCase()}!</h1>
                <p className="text-gray-500">Here's what's happening today.</p>
            </div>

            {/* Core Values Grid - Moved to Top */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 backdrop-blur-sm">
                        <CheckCircle size={24} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Integrity</h3>
                    <p className="text-indigo-100 text-sm leading-relaxed">
                        Doing the right thing, even when no one is watching. Upholding the highest standards of honesty.
                    </p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 backdrop-blur-sm">
                        <Clock size={24} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Effort</h3>
                    <p className="text-blue-100 text-sm leading-relaxed">
                        Going above and beyond. Consistently delivering your best work and striving for excellence.
                    </p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 backdrop-blur-sm">
                        <Bell size={24} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Intelligence</h3>
                    <p className="text-emerald-100 text-sm leading-relaxed">
                        Solving problems smartly. Continuous learning and applying knowledge to create value.
                    </p>
                </div>
            </div>

            {/* Tasks & Timesheet Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Log Work Form - Now Full Width or Centered if needed, but let's keep 2/3 cols or make it full width since left col is gone */}
                <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="text-indigo-600" size={20} />
                            Log Work
                        </h2>
                        <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
                            Total Today: {totalLoggedHours} hrs
                        </div>
                    </div>

                    <form onSubmit={handleLogWork} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Task <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    value={logForm.taskId}
                                    onChange={(e) => {
                                        if (e.target.value === 'NEW_TASK') {
                                            setShowAddTask(true);
                                            setLogForm(prev => ({ ...prev, taskId: '' }));
                                        } else {
                                            const task = todayTasks.find(t => t.id == e.target.value);
                                            setLogForm(prev => ({
                                                ...prev,
                                                taskId: e.target.value,
                                                remarks: task ? task.task_content : prev.remarks
                                            }));
                                        }
                                    }}
                                    required
                                >
                                    <option value="">-- Select a Task --</option>
                                    {todayTasks.filter(t => t.is_completed != 1).map(task => (
                                        <option key={task.id} value={task.id}>
                                            {task.task_content.substring(0, 50)}{task.task_content.length > 50 ? '...' : ''}
                                        </option>
                                    ))}
                                    <option value="NEW_TASK" className="font-bold text-indigo-600">+ Add New Task</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Hours) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0.5"
                                    max="24"
                                    required
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. 2.5"
                                    value={logForm.duration}
                                    onChange={(e) => setLogForm(prev => ({ ...prev, duration: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks <span className="text-red-500">*</span></label>
                            <textarea
                                required
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                                placeholder="What did you work on?"
                                value={logForm.remarks}
                                onChange={(e) => setLogForm(prev => ({ ...prev, remarks: e.target.value }))}
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isSubmitting ? 'Saving...' : <><Plus size={18} /> Log Work</>}
                            </button>
                        </div>
                    </form>

                    {/* Today's Logged Entries */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Logged Today</h3>
                        <div className="space-y-2">
                            {loggedEntries.length === 0 ? (
                                <p className="text-gray-400 text-sm italic">No work logged yet.</p>
                            ) : (
                                loggedEntries.map(entry => (
                                    <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${entry.type === 'planned' ? 'bg-green-500' : 'bg-orange-500'}`} title={entry.type === 'planned' ? 'Planned Task' : 'Unplanned Task'}></div>
                                            <span className="font-medium text-gray-900">{entry.duration} hrs</span>
                                            <span className="text-gray-600 truncate max-w-xs" title={entry.description}>{entry.description}</span>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${entry.type === 'planned' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {entry.type === 'planned' ? 'Planned' : 'Unplanned'}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Task Modal */}
            {showAddTask && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 m-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Add New Task</h3>
                            <button onClick={() => setShowAddTask(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTask}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Task Description</label>
                                <textarea
                                    autoFocus
                                    required
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                                    placeholder="What needs to be done?"
                                    value={newTaskContent}
                                    onChange={(e) => setNewTaskContent(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddTask(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreatingTask}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    {isCreatingTask ? 'Adding...' : 'Add Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Announcements & Stats - Moved below */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Leave Balance"
                    value={leaveBalance}
                    icon={Calendar}
                    color="bg-emerald-500"
                />
                {/* Add more stats if needed */}
            </div>

            {/* Announcements Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Bell className="text-indigo-600" size={20} />
                        Announcements
                    </h2>
                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                        {announcements.length} New
                    </span>
                </div>
                <div className="divide-y divide-gray-100">
                    {announcements.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            No new announcements.
                        </div>
                    ) : (
                        announcements.map((announcement) => (
                            <div key={announcement.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-900">{announcement.title}</h3>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                        {new Date(announcement.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    {announcement.content}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
