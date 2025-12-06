import React, { useEffect, useState } from 'react';
import { getAnnouncements } from '../services/announcementService';
import { getLeaves } from '../services/leaveService';
import { getTasks, updateTask } from '../services/taskService';
import { getTimesheets, saveTimesheet } from '../services/timesheetService';
import { getCurrentUser } from '../services/authService';
import { Bell, Calendar, CheckCircle, Clock, Plus, CheckSquare, Square, AlertCircle } from 'lucide-react';

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
        if (!logForm.duration || !logForm.remarks) return;

        setIsSubmitting(true);
        try {
            // Prepare entry
            const newEntry = {
                id: Date.now(), // Temp ID
                duration: parseFloat(logForm.duration),
                description: logForm.remarks,
                taskId: logForm.taskId || null,
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

            // If linked to a task, mark it as completed
            if (logForm.taskId) {
                await updateTask(logForm.taskId, { is_completed: 1 });
            }

            setLogForm({ taskId: '', duration: '', remarks: '' });
            await fetchDashboardData(); // Refresh all
        } catch (error) {
            console.error("Failed to log work", error);
            alert("Failed to log work. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalLoggedHours = loggedEntries.reduce((acc, curr) => acc + parseFloat(curr.duration || 0), 0);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0] || 'Employee'}!</h1>
                <p className="text-gray-500">Here's what's happening today.</p>
            </div>

            {/* Tasks & Timesheet Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Daily Tasks List */}
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <CheckSquare className="text-indigo-600" size={20} />
                        Planned for Today
                    </h2>

                    <div className="space-y-3">
                        {todayTasks.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg">
                                No tasks planned for today.
                            </div>
                        ) : (
                            todayTasks.map(task => (
                                <div key={task.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-3">
                                    <div className={`mt-1 ${task.is_completed == 1 ? 'text-green-500' : 'text-gray-400'}`}>
                                        {task.is_completed == 1 ? <CheckSquare size={18} /> : <Square size={18} />}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm text-gray-800 ${task.is_completed == 1 ? 'line-through text-gray-400' : ''}`}>
                                            {task.task_content}
                                        </p>
                                        {task.is_completed != 1 && (
                                            <button
                                                onClick={() => setLogForm(prev => ({ ...prev, taskId: task.id, remarks: task.task_content }))}
                                                className="text-xs text-indigo-600 font-medium mt-2 hover:underline"
                                            >
                                                Log this
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Log Work Form */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Task (Optional)</label>
                                <select
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    value={logForm.taskId}
                                    onChange={(e) => {
                                        const task = todayTasks.find(t => t.id == e.target.value);
                                        setLogForm(prev => ({
                                            ...prev,
                                            taskId: e.target.value,
                                            remarks: task ? task.task_content : prev.remarks
                                        }));
                                    }}
                                >
                                    <option value="">-- Select a Planned Task --</option>
                                    {todayTasks.filter(t => t.is_completed != 1).map(task => (
                                        <option key={task.id} value={task.id}>
                                            {task.task_content.substring(0, 50)}{task.task_content.length > 50 ? '...' : ''}
                                        </option>
                                    ))}
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

            {/* Core Values Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                            <CheckCircle size={24} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold">Integrity</h3>
                    </div>
                    <p className="text-indigo-100">Doing the right thing, even when no one is watching. Upholding the highest standards of honesty.</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Clock size={24} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold">Effort</h3>
                    </div>
                    <p className="text-blue-100">Going above and beyond. Consistently delivering your best work and striving for excellence.</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Bell size={24} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold">Intelligence</h3>
                    </div>
                    <p className="text-emerald-100">Solving problems smartly. Continuous learning and applying knowledge to create value.</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
