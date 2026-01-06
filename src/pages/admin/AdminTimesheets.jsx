import React, { useState, useEffect } from 'react';
import { getTimesheets, saveTimesheet } from '../../services/timesheetService';
import { getTasks } from '../../services/taskService';
import { ChevronDown, ChevronUp, Search, Calendar, ChevronRight, ChevronLeft, Save, User, Trash2 } from 'lucide-react';
import clsx from 'clsx';

const AdminTimesheets = () => {
    const [timesheets, setTimesheets] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [events, setEvents] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());



    // Derived state for the spreadsheet
    const [spreadsheetData, setSpreadsheetData] = useState([]);

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        if (selectedEmployee && timesheets.length > 0) {
            generateSpreadsheetData();
        }
    }, [selectedEmployee, currentMonth, timesheets, tasks, events]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [timesheetData, calendarData] = await Promise.all([
                getTimesheets(),
                fetch('/api/calendar.php').then(res => res.json())
            ]);

            setTimesheets(timesheetData);
            setEvents(calendarData);

            // Extract unique employees
            const emps = [];
            const empMap = new Map();
            timesheetData.forEach(t => {
                // EXCLUDE ADMIN FROM EMPLOYEE LIST
                if (t.email === 'admin@company.com') return;

                if (!empMap.has(t.employee_id)) {
                    empMap.set(t.employee_id, true);
                    emps.push({ id: t.employee_id, name: t.employee_name });
                }
            });
            setEmployees(emps);

            // Auto-select first employee if available
            if (emps.length > 0 && !selectedEmployee) {
                setSelectedEmployee(emps[0]);
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployeeTasks = async (employeeId) => {
        try {
            // Fetch tasks for the employee. Note: getTasks logic needs to support fetching by user_id
            const employeeTasks = await getTasks(employeeId);
            setTasks(employeeTasks || []);
        } catch (error) {
            console.error("Failed to fetch tasks", error);
            setTasks([]);
        }
    };

    // When employee changes, fetch their specific tasks
    useEffect(() => {
        if (selectedEmployee) {
            fetchEmployeeTasks(selectedEmployee.id);
        }
    }, [selectedEmployee]);




    const generateSpreadsheetData = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const data = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayOfWeek = date.getDay(); // 0 = Sunday

            // Check for Holiday
            const holiday = events.find(e => e.date === dateStr && e.is_holiday == 1);
            const isSunday = dayOfWeek === 0;

            // Get Plan (Tasks)
            const daysTasks = tasks.filter(t => t.planned_date === dateStr);

            // Get Actual (Timesheets)
            const daysTimesheet = timesheets.find(t =>
                t.employee_id === selectedEmployee?.id &&
                t.date === dateStr
            );

            data.push({
                date: dateStr,
                displayDate: date.toLocaleDateString(),
                isHoliday: !!holiday,
                isSunday: isSunday,
                holidayName: holiday?.title || 'SUNDAY',
                tasks: daysTasks,
                timesheet: daysTimesheet || null
            });
        }
        setSpreadsheetData(data);
    };

    const handleSaveRemark = async (item, newRemark, isDelete = false) => {
        // Validation: Ignore empty or unchanged comments UNLESS deleting
        if (!isDelete && (!newRemark || newRemark.trim() === "")) {
            return;
        }
        const currentRemark = item.timesheet?.adminRemarks || "";
        // If the current remark already contains the new remark (e.g. just prefix difference), we might want to skip, 
        // but strictly checking overlap is safer.
        // Simple check: if unchanged from what was passed (which is usually the current DB value unless edited)
        if (newRemark === currentRemark) {
            return;
        }

        // Prepend Admin Name if not empty
        const currentUser = JSON.parse(localStorage.getItem('hr_current_user'));
        let finalRemark = newRemark;

        if (newRemark && newRemark.trim() !== "") {
            const prefix = `${currentUser?.name} :`;
            if (!newRemark.startsWith(prefix)) {
                finalRemark = `${prefix} ${newRemark}`;
            }
        }

        if (item.timesheet) {
            await saveTimesheet({
                ...item.timesheet,
                employeeId: item.timesheet.employee_id, // Explicitly pass ID to prevent service from using current user
                adminRemarks: finalRemark
            });
            // Refresh local state purely for UI responsiveness or re-fetch
            const newTimesheets = timesheets.map(t =>
                (t.id === item.timesheet.id) ? { ...t, adminRemarks: finalRemark, admin_remarks: finalRemark } : t
            );
            setTimesheets(newTimesheets);
        } else {
            // Create new timesheet entry for remarks
            try {
                const payload = {
                    employeeId: selectedEmployee.id, // Ensure this matches backend expectation (camelCase or snake_case depending on service wrapper)
                    employee_id: selectedEmployee.id, // Send both to be safe or check service
                    date: item.date,
                    adminRemarks: finalRemark,
                    entries: []
                };
                await saveTimesheet(payload);
                // We must re-fetch here because we don't have the new ID
                fetchAllData();
            } catch (error) {
                console.error("Failed to save remark for new timesheet", error);
                alert("Failed to save remark");
            }
        }
    };

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

    if (loading) return <div className="p-8 text-center text-gray-500">Loading data...</div>;

    return (
        <div className="p-6 max-w-full mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Timesheet Management</h1>
                    <p className="text-gray-500">Review planned vs actual work.</p>
                </div>



                <div className="flex flex-col md:flex-row items-center gap-4">
                    <>
                        {/* Employee Switcher */}
                        <div className="relative group">
                            <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm hover:border-indigo-500 transition-colors min-w-[200px] justify-between">
                                <span className="flex items-center gap-2">
                                    <User size={16} className="text-indigo-600" />
                                    <span className="font-medium text-gray-700">{selectedEmployee?.name || 'Select Employee'}</span>
                                </span>
                                <ChevronDown size={16} className="text-gray-400" />
                            </button>

                            <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-100 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                <div className="p-2 max-h-64 overflow-y-auto">
                                    {employees.map(emp => (
                                        <button
                                            key={emp.id}
                                            onClick={() => setSelectedEmployee(emp)}
                                            className={clsx(
                                                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                                                selectedEmployee?.id === emp.id ? "bg-indigo-50 text-indigo-700 font-medium" : "hover:bg-gray-50 text-gray-600"
                                            )}
                                        >
                                            {emp.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Month Navigator */}
                        <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-md text-gray-600">
                                <ChevronLeft size={20} />
                            </button>
                            <span className="px-4 font-medium text-gray-900 min-w-[140px] text-center">
                                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-md text-gray-600">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-left">
                                <th className="py-3 px-4 font-semibold text-gray-700 text-sm w-32 border-r border-gray-200">Date</th>
                                <th className="py-3 px-4 font-semibold text-gray-700 text-sm w-1/3 border-r border-gray-200">Plan (Target Deliverables)</th>
                                <th className="py-3 px-4 font-semibold text-gray-700 text-sm w-1/3 border-r border-gray-200">Actual (Work Log)</th>
                                <th className="py-3 px-4 font-semibold text-gray-700 text-sm">Comments</th>
                            </tr>
                        </thead>
                        <tbody>
                            {spreadsheetData.map((day) => {
                                // Holiday / Weekend Row
                                if (day.isHoliday || day.isSunday) {
                                    return (
                                        <tr key={day.date} className="bg-yellow-100 border-b border-gray-200">
                                            <td className="py-1 px-4 font-medium text-gray-800 border-r border-yellow-200 text-sm">{day.date}</td>
                                            <td colSpan="3" className="py-1 px-4 text-center font-bold text-gray-600 tracking-wider uppercase text-xs">
                                                {day.holidayName}
                                            </td>
                                        </tr>
                                    );
                                }

                                // Regular Row
                                return (
                                    <tr key={day.date} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4 text-sm font-medium text-gray-900 border-r border-gray-100 align-top">
                                            {day.date}
                                        </td>

                                        {/* Plan Column */}
                                        <td className="py-3 px-4 border-r border-gray-100 align-top">
                                            {day.tasks && day.tasks.length > 0 ? (
                                                <ul className="list-disc list-inside space-y-1">
                                                    {day.tasks.map(t => (
                                                        <li key={t.id} className="text-sm text-gray-600">
                                                            {t.task_content}
                                                            <span className={clsx("ml-2 text-xs px-1.5 py-0.5 rounded",
                                                                t.is_completed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                                            )}>
                                                                {t.is_completed ? 'Done' : 'Pending'}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">No plan set</span>
                                            )}
                                        </td>

                                        {/* Actual Column */}
                                        <td className="py-3 px-4 border-r border-gray-100 align-top">
                                            {day.timesheet && day.timesheet.entries && day.timesheet.entries.length > 0 ? (
                                                <div className="space-y-2">
                                                    {day.timesheet.entries.filter(e => e.is_deleted != 1).map(entry => {
                                                        const task = tasks.find(t => t.id == (entry.taskId || entry.task_id));
                                                        let timeDiffElement = null;
                                                        if (task && task.eta) {
                                                            const etaMins = parseInt(task.eta);
                                                            const actualMins = parseFloat(entry.duration) * 60;
                                                            const diff = Math.round(actualMins - etaMins);

                                                            if (diff < 0) {
                                                                timeDiffElement = <span className="text-xs font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded ml-1">{diff}m</span>;
                                                            } else if (diff > 0) {
                                                                timeDiffElement = <span className="text-xs font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded ml-1">+{diff}m</span>;
                                                            }
                                                        }

                                                        return (
                                                            <div key={entry.id} className="text-sm text-gray-700 whitespace-pre-wrap">
                                                                <span className="font-medium text-gray-900 mr-2">
                                                                    {entry.startTime} - {entry.endTime} ({entry.duration}h
                                                                    {timeDiffElement}):
                                                                </span>
                                                                {entry.description}
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="pt-1 mt-1 border-t border-gray-100 flex justify-between items-center">
                                                        <span className="text-xs font-bold text-indigo-600">
                                                            Total: {day.timesheet.entries.reduce((sum, e) => sum + (e.is_deleted == 1 ? 0 : parseFloat(e.duration || 0)), 0)} hrs
                                                        </span>
                                                        <span className={clsx(
                                                            "text-xs px-2 py-0.5 rounded-full",
                                                            (() => {
                                                                const today = new Date();
                                                                today.setHours(0, 0, 0, 0);
                                                                const sheetDate = new Date(day.date);
                                                                sheetDate.setHours(0, 0, 0, 0);
                                                                const isPast = sheetDate < today;
                                                                // Treat past 'draft' as 'submitted' for display
                                                                const displayStatus = (isPast && day.timesheet.status === 'draft') ? 'submitted' : day.timesheet.status;
                                                                return displayStatus === 'submitted' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700";
                                                            })()
                                                        )}>
                                                            {(() => {
                                                                const today = new Date();
                                                                today.setHours(0, 0, 0, 0);
                                                                const sheetDate = new Date(day.date);
                                                                sheetDate.setHours(0, 0, 0, 0);
                                                                const isPast = sheetDate < today;
                                                                return (isPast && day.timesheet.status === 'draft') ? 'submitted' : day.timesheet.status;
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">No logs</span>
                                            )}
                                        </td>

                                        {/* Comments Column */}
                                        <td className="py-3 px-4 align-top">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    className="w-full text-sm border-b border-transparent focus:border-indigo-500 focus:ring-0 bg-transparent outline-none transition-colors placeholder-gray-300"
                                                    placeholder="Add comment..."
                                                    defaultValue={day.timesheet?.admin_remarks || day.timesheet?.adminRemarks || ''}
                                                    onBlur={(e) => handleSaveRemark(day, e.target.value)}
                                                />
                                                {(day.timesheet?.admin_remarks || day.timesheet?.adminRemarks) && (
                                                    <button
                                                        onClick={() => {
                                                            const input = document.activeElement.parentElement.querySelector('input');
                                                            if (input) input.value = '';
                                                            handleSaveRemark(day, '', true);
                                                        }}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                        title="Delete comment"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminTimesheets;
