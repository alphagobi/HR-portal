import React, { useState, useEffect } from 'react';
import { getFrameworkAllocations } from '../services/frameworkService';
import { Calendar, ChevronLeft, ChevronRight, Clock, Filter, BarChart3 } from 'lucide-react';
import clsx from 'clsx';

const Timesheet = () => {
    const [viewMode, setViewMode] = useState('monthly'); // 'daily', 'weekly', 'monthly'
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [timesheets, setTimesheets] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [frameworks, setFrameworks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTimesheets = async () => {
        setLoading(true);
        try {
            const user = getCurrentUser();
            if (user) {
                const [tsData, tasksData, fwData] = await Promise.all([
                    getTimesheets(user.id),
                    getTasks(user.id),
                    getFrameworkAllocations(user.id)
                ]);
                setTimesheets(tsData);
                setTasks(tasksData);
                setFrameworks(fwData);
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTimesheets();
    }, []);

    // Filter logic
    const getFilteredTimesheets = () => {
        if (viewMode === 'monthly') {
            const selectedMonth = selectedDate.slice(0, 7);
            return timesheets.filter(t => t.date.startsWith(selectedMonth));
        } else if (viewMode === 'daily') {
            return timesheets.filter(t => t.date === selectedDate);
        } else if (viewMode === 'weekly') {
            const date = new Date(selectedDate);
            const day = date.getDay(); // 0 (Sun) to 6 (Sat)
            const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
            const monday = new Date(date.setDate(diff));
            const sunday = new Date(date.setDate(monday.getDate() + 6));

            const startStr = monday.toISOString().split('T')[0];
            const endStr = sunday.toISOString().split('T')[0];

            return timesheets.filter(t => t.date >= startStr && t.date <= endStr);
        }
        return [];
    };

    const filteredTimesheets = getFilteredTimesheets();

    // Calculate stats
    const totalHours = filteredTimesheets.reduce((acc, sheet) => {
        const sheetTotal = sheet.entries.reduce((sAcc, entry) => sAcc + parseFloat(entry.duration || 0), 0);
        return acc + sheetTotal;
    }, 0);

    const plannedHours = filteredTimesheets.reduce((acc, sheet) => {
        const sheetTotal = sheet.entries.filter(e => e.type === 'planned').reduce((sAcc, entry) => sAcc + parseFloat(entry.duration || 0), 0);
        return acc + sheetTotal;
    }, 0);

    const unplannedHours = totalHours - plannedHours;

    // Calculate Framework Stats
    const frameworkStats = frameworks.map(fw => {
        let duration = 0;
        filteredTimesheets.forEach(sheet => {
            sheet.entries.forEach(entry => {
                // Find task to get framework_id
                const task = tasks.find(t => t.id == entry.taskId) || tasks.find(t => t.task_content === entry.description);
                // Note: task.framework_id might be string or int
                if (task && task.framework_id == fw.id) {
                    duration += parseFloat(entry.duration || 0);
                }
            });
        });

        const percentage = totalHours > 0 ? ((duration / totalHours) * 100).toFixed(1) : 0;
        return {
            ...fw,
            actualDuration: duration,
            actualPercentage: parseFloat(percentage)
        };
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Timesheet History</h1>
                    <p className="text-gray-500">View your logged work history.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-md">
                        <button
                            onClick={() => setViewMode('daily')}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'daily' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Daily
                        </button>
                        <button
                            onClick={() => setViewMode('weekly')}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'weekly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Weekly
                        </button>
                        <button
                            onClick={() => setViewMode('monthly')}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
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
                            className="p-1 border-none bg-transparent focus:ring-0 text-sm font-medium text-gray-700"
                        />
                    ) : (
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="p-1 border-none bg-transparent focus:ring-0 text-sm font-medium text-gray-700"
                        />
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium">Total Hours ({viewMode})</p>
                    <h3 className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</h3>
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

            {/* Framework Analysis Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="text-indigo-600" size={20} />
                    <h2 className="text-lg font-bold text-gray-900">Framework Alignment</h2>
                </div>

                <div className="space-y-4">
                    {frameworkStats.map(fw => (
                        <div key={fw.id} className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-gray-700">{fw.category_name}</span>
                                <div className="flex gap-4 text-gray-500">
                                    <span>Target: <span className="font-bold text-gray-900">{fw.percentage}%</span></span>
                                    <span>Actual: <span className={clsx("font-bold", fw.actualPercentage >= fw.percentage ? "text-green-600" : "text-amber-600")}>{fw.actualPercentage}%</span> ({fw.actualDuration.toFixed(1)}h)</span>
                                </div>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                                {/* Actual Bar */}
                                <div
                                    className={clsx("h-full rounded-full transition-all duration-500", fw.actualPercentage >= fw.percentage ? "bg-green-500" : "bg-indigo-500")}
                                    style={{ width: `${Math.min(fw.actualPercentage, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                    {/* Unallocated */}
                    {(() => {
                        const trackedDuration = frameworkStats.reduce((acc, fw) => acc + fw.actualDuration, 0);
                        const unallocated = totalHours - trackedDuration;
                        const unallocatedPct = totalHours > 0 ? ((unallocated / totalHours) * 100).toFixed(1) : 0;
                        if (unallocated > 0.01) return (
                            <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-gray-500 italic">Unallocated / General</span>
                                    <span className="text-gray-500">Actual: <span className="font-bold text-gray-600">{unallocatedPct}%</span> ({unallocated.toFixed(1)}h)</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gray-400 rounded-full"
                                        style={{ width: `${Math.min(unallocatedPct, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* History List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading history...</div>
                ) : filteredTimesheets.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No entries found for this {viewMode}.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredTimesheets.sort((a, b) => new Date(b.date) - new Date(a.date)).map(sheet => (
                            <div key={sheet.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <Calendar size={18} className="text-indigo-600" />
                                        {new Date(sheet.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </h3>
                                    <span className="text-sm font-medium text-gray-500">
                                        {sheet.entries.reduce((acc, e) => acc + parseFloat(e.duration || 0), 0)} hrs
                                    </span>
                                </div>

                                <div className="space-y-2 pl-6 border-l-2 border-gray-100">
                                    {sheet.entries.filter(e => e.is_deleted != 1).map(entry => {
                                        const task = tasks.find(t => t.id == entry.taskId) || tasks.find(t => t.task_content === entry.description);
                                        const color = getTaskStatusColor(task?.planned_date, task?.is_completed);

                                        return (
                                            <div key={entry.id} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${color.dot}`}></div>
                                                    <span className={`font-medium ${color.text}`}>{entry.description}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${entry.type === 'planned' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                                                        {entry.type === 'planned' ? 'Planned' : 'Unplanned'}
                                                    </span>
                                                    <span className="font-medium text-gray-900">{entry.duration} hrs</span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
};

export default Timesheet;
