import React, { useState, useEffect } from 'react';
import { getTimesheets } from '../services/timesheetService';
import { getLeaves } from '../services/leaveService';
import { getTasks } from '../services/taskService';
import TaskTooltip from '../components/TaskTooltip';
import { getTaskStatusColor } from '../utils/taskUtils';
import { getCurrentUser } from '../services/authService';
import { Calendar, ChevronLeft, ChevronRight, Clock, Filter } from 'lucide-react';
import clsx from 'clsx';
import ExpandableText from '../components/ExpandableText';

const Timesheet = () => {
    const [viewMode, setViewMode] = useState('monthly'); // 'daily', 'weekly', 'monthly'
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [timesheets, setTimesheets] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [debugError, setDebugError] = useState(null);

    const fetchTimesheets = async () => {
        setLoading(true);
        setDebugError(null);
        const user = getCurrentUser();

        if (!user) {
            setLoading(false);
            setDebugError("No user logged in (getCurrentUser returned null)");
            return;
        }

        let tsData = [];
        let tasksData = [];

        // Fetch Timesheets (Independent)
        try {
            const result = await getTimesheets(user.id);
            tsData = Array.isArray(result) ? result : [];
            if (!Array.isArray(result)) {
                setDebugError((prev) => (prev ? prev + " | " : "") + "Timesheets API returned non-array");
            }
        } catch (error) {
            console.error("Failed to fetch timesheets", error);
            setDebugError((prev) => (prev ? prev + " | " : "") + "Timesheets API: " + error.message);
        }

        // Fetch Tasks (Independent)
        try {
            const result = await getTasks(user.id);
            tasksData = Array.isArray(result) ? result : [];
        } catch (error) {
            console.error("Failed to fetch tasks", error);
            // We don't block UI for tasks, but can log it
        }

        // Process & Merge Data
        try {
            // Fetch Leaves (Independent)
            let leavesData = [];
            try {
                const result = await getLeaves(user.id);
                leavesData = result.leaves || []; // getLeaves returns object with leaves, limits, usage
            } catch (error) {
                console.error("Failed to fetch leaves", error);
            }

            let fullHistory = Array.isArray(tsData) ? [...tsData] : [];
            const taskList = Array.isArray(tasksData) ? tasksData : [];

            // 0. Identify Approved Leave Days
            const leaveDays = new Set();
            const leaveMap = {}; // date -> leave details

            leavesData.forEach(leave => {
                if (leave.status === 'Approved') {
                    const start = new Date(leave.start_date);
                    const end = new Date(leave.end_date);

                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        const dateStr = d.toISOString().split('T')[0];
                        leaveDays.add(dateStr);
                        leaveMap[dateStr] = leave;
                    }
                }
            });

            // 1. Identify tasks already logged in real timesheets to avoid duplicates
            const loggedTaskIds = new Set();
            const loggedTaskDescriptions = new Set();
            fullHistory.forEach(sheet => {
                // Mark existing sheets as "On Leave" if applicable
                if (leaveDays.has(sheet.date)) {
                    sheet.isOnLeave = true;
                    sheet.leaveDetails = leaveMap[sheet.date];
                }

                if (sheet.entries) {
                    sheet.entries.forEach(entry => {
                        if (entry.taskId || entry.task_id) loggedTaskIds.add(String(entry.taskId || entry.task_id));
                        if (entry.description) loggedTaskDescriptions.add(entry.description.trim().toLowerCase());
                    });
                }
            });

            // 2. Find Completed Tasks NOT logged
            const orphanedTasks = taskList.filter(t =>
                (t.is_completed == 1 || t.is_completed === true) &&
                !loggedTaskIds.has(String(t.id)) &&
                !loggedTaskDescriptions.has((t.task_content || "").trim().toLowerCase())
            );

            // 3. Convert Orphans to Virtual Timesheets
            const virtualSheets = [];

            // 3.1 Create Virtual Sheets for Leaves (if no real sheet exists)
            leaveDays.forEach(date => {
                const hasSheet = fullHistory.some(s => s.date === date);
                if (!hasSheet) {
                    virtualSheets.push({
                        id: `leave-${date}`,
                        date: date,
                        employee_id: user.id,
                        employee_name: user.name,
                        entries: [],
                        isVirtual: true,
                        isOnLeave: true,
                        leaveDetails: leaveMap[date]
                    });
                }
            });

            orphanedTasks.forEach(task => {
                // Use planned_date for grouping (since we don't have exact completed_at if not logged)
                const date = task.planned_date || new Date().toISOString().split('T')[0];

                // Check if we already have a sheet for this date in virtualSheets
                let sheet = virtualSheets.find(s => s.date === date);
                if (!sheet) {
                    // Check if we have a REAL sheet for this date to append to
                    const realSheetIndex = fullHistory.findIndex(s => s.date === date);
                    if (realSheetIndex !== -1) {
                        sheet = fullHistory[realSheetIndex]; // Modify existing real sheet object (careful with mutation)
                    } else {
                        sheet = {
                            id: `virtual-${date}`, // unique ID
                            date: date,
                            employee_id: user.id,
                            employee_name: user.name,
                            entries: [],
                            isVirtual: true
                        };
                        virtualSheets.push(sheet);
                    }
                }

                // Create Virtual Entry
                const durationHours = (parseFloat(task.eta || 0) / 60).toFixed(2);

                const entry = {
                    id: `v-entry-${task.id}`,
                    timesheet_id: sheet.id,
                    startTime: "09:00", // Default
                    endTime: "10:00", // Default
                    duration: durationHours,
                    description: task.task_content,
                    project: "Task",
                    taskId: task.id,
                    type: 'planned',
                    is_edited: 0,
                    is_deleted: 0
                };

                // If it's a real sheet, we must modify a copy or push to its entries? 
                // Better to re-construct. 
                // Let's simplify: Add to 'sheet.entries'.
                if (!sheet.entries) sheet.entries = [];
                sheet.entries.push(entry);
            });

            // 4. Combine Real + Virtual New Sheets
            // Note: We modified real sheets in-place if they existed in `virtualSheets` loop? 
            // No, `sheet = fullHistory[...]` refers to the object in the array. 
            // So modifying `sheet.entries` updates `fullHistory`.
            // The `virtualSheets` array ONLY contains NEW sheets for dates that didn't exist.

            fullHistory = [...fullHistory, ...virtualSheets];

            // 5. Sort by Date DESC
            fullHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Unique Filter (in case logic added duplicate virtual sheets)
            const uniqueHistory = [];
            const dateMap = new Set();
            fullHistory.forEach(item => {
                if (!dateMap.has(item.date)) {
                    dateMap.add(item.date);
                    uniqueHistory.push(item);
                } else {
                    // Merge entries if duplicate date found (e.g. virtual leave sheet + virtual task sheet overlap?)
                    // The logic above separates them, but date-based lookup should prevent duplicates.
                    // However, `leaveDays.forEach` creates a sheet if `!hasSheet`. 
                    // `orphanedTasks.forEach` creates a sheet if `!sheet` (in virtual) and `!realSheetIndex`.
                    // If a date has BOTH a leave AND an orphaned task, but no real sheet:
                    // 1. `leaveDays` creates `virtualSheets` entry.
                    // 2. `orphanedTasks` finds it via `virtualSheets.find`.
                    // So it should be fine.  But let's be safe.
                }
            });

            setTimesheets(uniqueHistory); // Use filtered list
            setTasks(taskList);

        } catch (error) {
            console.error("Failed to process data", error);
            setDebugError((prev) => (prev ? prev + " | " : "") + "Processing: " + error.message);
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

    // Calculate stats - Filter out deleted entries!
    const totalHours = filteredTimesheets.reduce((acc, sheet) => {
        const sheetTotal = sheet.entries
            .filter(e => e.is_deleted != 1)
            .reduce((sAcc, entry) => sAcc + parseFloat(entry.duration || 0), 0);
        return acc + sheetTotal;
    }, 0);

    const plannedHours = filteredTimesheets.reduce((acc, sheet) => {
        const sheetTotal = sheet.entries
            .filter(e => e.is_deleted != 1 && e.type === 'planned')
            .reduce((sAcc, entry) => sAcc + parseFloat(entry.duration || 0), 0);
        return acc + sheetTotal;
    }, 0);

    const unplannedHours = totalHours - plannedHours;

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
                    <h3 className="text-2xl font-bold text-gray-900">{totalHours.toFixed(2)}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-green-600 font-medium">Planned Hours</p>
                    <h3 className="text-2xl font-bold text-green-700">{plannedHours.toFixed(2)}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-orange-600 font-medium">Unplanned Hours</p>
                    <h3 className="text-2xl font-bold text-orange-700">{unplannedHours.toFixed(2)}</h3>
                </div>
            </div>

            {/* Framework Analysis Section */}


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
                                        <Calendar size={18} className={sheet.isOnLeave ? "text-purple-600" : "text-indigo-600"} />
                                        {new Date(sheet.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                        {sheet.isOnLeave && (
                                            <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-2">
                                                {sheet.leaveDetails?.type} {sheet.leaveDetails?.reason && `- ${sheet.leaveDetails.reason}`}
                                            </span>
                                        )}
                                    </h3>
                                    <span className="text-sm font-medium text-gray-500">
                                        {sheet.entries
                                            .filter(e => e.is_deleted != 1)
                                            .reduce((acc, e) => acc + parseFloat(e.duration || 0), 0)
                                            .toFixed(2)} hrs
                                    </span>
                                </div>

                                <div className="space-y-2 pl-6 border-l-2 border-gray-100">
                                    {sheet.entries.filter(e => e.is_deleted != 1).map(entry => {
                                        const task = tasks.find(t => t.id == (entry.taskId || entry.task_id)) || tasks.find(t => t.task_content === entry.description);
                                        const color = getTaskStatusColor(task?.planned_date, task?.is_completed, sheet.date);

                                        return (
                                            <div key={entry.id} className="flex flex-col gap-1 text-sm mb-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full ${color.dot}`}></div>
                                                        <TaskTooltip task={task || { task_content: entry.description, is_completed: true, planned_date: sheet.date, created_at: sheet.date }}>
                                                            <span className={clsx(`font-medium block truncate ${color.text}`)}>
                                                                {task?.task_content || entry.description}
                                                            </span>
                                                        </TaskTooltip>
                                                    </div>
                                                    {entry.duration && (
                                                        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${entry.type === 'planned' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                                                                {entry.type === 'planned' ? 'Planned' : 'Unplanned'}
                                                            </span>
                                                            <span className="font-medium text-gray-900">{entry.duration} hrs</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Show remarks if they exist and are different from Title */}
                                                {entry.description && task && entry.description !== task.task_content && (
                                                    <div className="pl-5 ml-0.5 mt-1">
                                                        <ExpandableText
                                                            text={entry.description}
                                                            limit={120}
                                                            className="text-xs text-gray-600"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                </div>

                                {/* Admin Remarks Section */}
                                {(sheet.admin_remarks || sheet.adminRemarks) && (
                                    <div className="mt-4 pt-3 border-t border-gray-100 bg-yellow-50 rounded-lg p-3">
                                        <p className="text-xs font-bold text-yellow-800 uppercase tracking-wide mb-1">
                                            Admin Comments
                                        </p>
                                        <p className="text-xs text-gray-800 whitespace-pre-wrap">
                                            {sheet.admin_remarks || sheet.adminRemarks}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
};

export default Timesheet;
