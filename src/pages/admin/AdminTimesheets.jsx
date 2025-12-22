import React, { useState, useEffect } from 'react';
import { getTimesheets, saveTimesheet } from '../../services/timesheetService';
import { getTasks } from '../../services/taskService';
import { getAllFrameworkAllocations } from '../../services/frameworkService';
import { ChevronDown, ChevronUp, Search, Calendar, ChevronRight, ChevronLeft, Save, User, LayoutTemplate } from 'lucide-react';
import clsx from 'clsx';

const AdminTimesheets = () => {
    const [timesheets, setTimesheets] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [events, setEvents] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const [viewMode, setViewMode] = useState('timesheets'); // 'timesheets' | 'frameworks'
    const [frameworks, setFrameworks] = useState([]);

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

    // Fetch Frameworks when mode switches
    useEffect(() => {
        if (viewMode === 'frameworks') {
            const loadFrameworks = async () => {
                try {
                    const data = await getAllFrameworkAllocations();
                    setFrameworks(data);
                } catch (error) {
                    console.error("Failed to fetch frameworks", error);
                }
            };
            loadFrameworks();
        }
    }, [viewMode]);


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

    const handleSaveRemark = async (item, newRemark) => {
        if (item.timesheet) {
            await saveTimesheet({
                ...item.timesheet,
                adminRemarks: newRemark
            });
            // Refresh local state purely for UI responsiveness or re-fetch
            const newTimesheets = timesheets.map(t =>
                (t.id === item.timesheet.id) ? { ...t, adminRemarks: newRemark } : t
            );
            setTimesheets(newTimesheets);
        } else {
            // Create new timesheet entry for remarks
            try {
                const payload = {
                    employeeId: selectedEmployee.id, // Ensure this matches backend expectation (camelCase or snake_case depending on service wrapper)
                    employee_id: selectedEmployee.id, // Send both to be safe or check service
                    date: item.date,
                    adminRemarks: newRemark,
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

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('timesheets')}
                        className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors", viewMode === 'timesheets' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                    >
                        <Calendar size={16} /> Timesheets
                    </button>
                    <button
                        onClick={() => setViewMode('frameworks')}
                        className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors", viewMode === 'frameworks' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                    >
                        <LayoutTemplate size={16} /> Frameworks
                    </button>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                    {/* View Controls */}
                    {viewMode === 'timesheets' && (
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
                    )}
                </div>
            </div>

            {viewMode === 'timesheets' ? (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {/* ... Existing Timesheet Table ... */}
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
                                                        {day.timesheet.entries.map(entry => (
                                                            <div key={entry.id} className={clsx("text-sm", entry.is_deleted == 1 ? "line-through text-gray-400" : "text-gray-700")}>
                                                                <span className="font-medium text-gray-900 mr-2">
                                                                    {entry.startTime} - {entry.endTime} ({entry.duration}h):
                                                                </span>
                                                                {entry.description}
                                                            </div>
                                                        ))}
                                                        <div className="pt-1 mt-1 border-t border-gray-100 flex justify-between items-center">
                                                            <span className="text-xs font-bold text-indigo-600">
                                                                Total: {day.timesheet.entries.reduce((sum, e) => sum + (e.is_deleted == 1 ? 0 : parseFloat(e.duration || 0)), 0)} hrs
                                                            </span>
                                                            <span className={clsx(
                                                                "text-xs px-2 py-0.5 rounded-full",
                                                                day.timesheet.status === 'submitted' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                                            )}>
                                                                {day.timesheet.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">No logs</span>
                                                )}
                                            </td>

                                            {/* Comments Column */}
                                            <td className="py-3 px-4 align-top">
                                                <input
                                                    type="text"
                                                    className="w-full text-sm border-b border-transparent focus:border-indigo-500 focus:ring-0 bg-transparent outline-none transition-colors placeholder-gray-300"
                                                    placeholder="Add comment..."
                                                    defaultValue={day.timesheet?.adminRemarks || ''}
                                                    onBlur={(e) => handleSaveRemark(day, e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Employee Framework Allocation</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.values(frameworks.reduce((acc, item) => {
                            if (!acc[item.user_id]) {
                                acc[item.user_id] = {
                                    id: item.user_id,
                                    name: item.employee_name,
                                    department: item.department,
                                    allocations: [],
                                    total: 0
                                };
                            }
                            acc[item.user_id].allocations.push(item);
                            acc[item.user_id].total += parseInt(item.percentage);
                            return acc;
                        }, {})).map(emp => (
                            <div key={emp.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{emp.name}</h3>
                                        {emp.department && <p className="text-sm text-gray-500">{emp.department}</p>}
                                    </div>
                                    <div className={clsx("text-xs font-bold px-2 py-1 rounded-full",
                                        emp.total > 100 ? "bg-red-100 text-red-700" :
                                            emp.total === 100 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                    )}>
                                        {emp.total}% Allocated
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {emp.allocations.map((alloc, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${['bg-indigo-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'][i % 4]}`}></div>
                                                <span className="text-gray-700 font-medium">{alloc.category_name}</span>
                                            </div>
                                            <span className="font-bold text-gray-900">{alloc.percentage}%</span>
                                        </div>
                                    ))}
                                    {emp.total < 100 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                                <span className="text-gray-400 font-medium">Unplanned</span>
                                            </div>
                                            <span className="font-bold text-gray-400">{100 - emp.total}%</span>
                                        </div>
                                    )}
                                </div>
                                {/* Stacked Bar Visual */}
                                <div className="mt-4 flex h-2 rounded-full overflow-hidden bg-gray-100 w-full">
                                    {emp.allocations.map((alloc, i) => (
                                        <div
                                            key={i}
                                            style={{ width: `${alloc.percentage}%` }}
                                            className={['bg-indigo-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'][i % 4]}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTimesheets;
