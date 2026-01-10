import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { getTimesheets, saveTimesheet } from '../../services/timesheetService';
import { getLeaves } from '../../services/leaveService';
import { getTasks } from '../../services/taskService';
import { getAllUsers } from '../../services/authService';
import TaskTooltip from '../../components/TaskTooltip';
import { getTaskStatusColor } from '../../utils/taskUtils';
import { ChevronDown, ChevronUp, Search, Calendar, ChevronRight, ChevronLeft, Save, User, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import ExpandableText from '../../components/ExpandableText';

const AdminTimesheets = () => {
    const [timesheets, setTimesheets] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [events, setEvents] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // Date Range State for Infinite Scroll
    // Initial: Today - 14 days to Today + 7 days
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 14);
        return d;
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7); // Show a week ahead for planning
        return d;
    });

    const scrollContainerRef = useRef(null);
    const topSentinelRef = useRef(null);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    // Scroll Preservation Refs
    const previousScrollHeightRef = useRef(0);
    const previousScrollTopRef = useRef(0);

    // Derived state for the spreadsheet
    const [spreadsheetData, setSpreadsheetData] = useState([]);

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        if (selectedEmployee) {
            generateSpreadsheetData();
        }
    }, [selectedEmployee, startDate, endDate, timesheets, tasks, events, leaves]);

    // Snapshot scroll position before startDate updates
    const getSnapshotBeforeUpdate = () => {
        if (scrollContainerRef.current) {
            previousScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
            previousScrollTopRef.current = scrollContainerRef.current.scrollTop;
        }
    };

    // Restore scroll position after startDate updates (and DOM updates)
    useLayoutEffect(() => {
        if (scrollContainerRef.current && previousScrollHeightRef.current > 0) {
            const newScrollHeight = scrollContainerRef.current.scrollHeight;
            const heightDifference = newScrollHeight - previousScrollHeightRef.current;

            // Adjust scroll position to maintain relative view
            if (heightDifference > 0) {
                scrollContainerRef.current.scrollTop = previousScrollTopRef.current + heightDifference;
            }
        }
    }, [startDate]); // Run this immediately after DOM update when startDate changes

    // Scroll Observer to load more days when reaching top
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isFetchingMore) {
                    loadMorePastDates();
                }
            },
            { root: null, rootMargin: '100px 0px 0px 0px', threshold: 0.1 }
        );

        if (topSentinelRef.current) {
            observer.observe(topSentinelRef.current);
        }

        return () => {
            if (topSentinelRef.current) {
                observer.unobserve(topSentinelRef.current);
            }
        };
    }, [isFetchingMore, startDate]); // Re-attach when startDate changes

    const loadMorePastDates = () => {
        // Capture current scroll state strictly BEFORE state update triggers
        setIsFetchingMore(true);
        getSnapshotBeforeUpdate();

        // Prepend 14 more days
        setStartDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() - 14);
            return newDate;
        });

        // Use timeout to allow render and prevent immediate re-trigger
        setTimeout(() => setIsFetchingMore(false), 500);
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [timesheetData, calendarData, allUsers] = await Promise.all([
                getTimesheets(),
                fetch('/api/calendar.php').then(res => res.json()),
                getAllUsers()
            ]);

            setTimesheets(timesheetData);
            setEvents(calendarData);

            // Format users for dropdown (exclude Admin User)
            const emps = allUsers
                .filter(u => u.name !== 'Admin User')
                .map(u => ({ id: u.id, name: u.name }));

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
            const employeeTasks = await getTasks(employeeId);
            setTasks(employeeTasks || []);
        } catch (error) {
            console.error("Failed to fetch tasks", error);
            setTasks([]);
        }
    };

    // When employee changes, fetch their specific tasks and leaves
    useEffect(() => {
        if (selectedEmployee) {
            fetchEmployeeTasks(selectedEmployee.id);
            fetchEmployeeLeaves(selectedEmployee.id);
        }
    }, [selectedEmployee]);

    const fetchEmployeeLeaves = async (employeeId) => {
        try {
            const result = await getLeaves(employeeId);
            setLeaves(result.leaves || []);
        } catch (error) {
            console.error("Failed to fetch leaves", error);
            setLeaves([]);
        }
    };

    const handlePrevEmployee = () => {
        if (employees.length === 0) return;
        const currentIndex = employees.findIndex(e => e.id === selectedEmployee?.id);
        const prevIndex = (currentIndex - 1 + employees.length) % employees.length;
        setSelectedEmployee(employees[prevIndex]);
    };

    const handleNextEmployee = () => {
        if (employees.length === 0) return;
        const currentIndex = employees.findIndex(e => e.id === selectedEmployee?.id);
        const nextIndex = (currentIndex + 1) % employees.length;
        setSelectedEmployee(employees[nextIndex]);
    };

    const generateSpreadsheetData = () => {
        const data = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Loop from startDate to endDate
        const currentPtr = new Date(startDate);
        const endPtr = new Date(endDate); // inclusive

        while (currentPtr <= endPtr) {
            const dateStr = `${currentPtr.getFullYear()}-${String(currentPtr.getMonth() + 1).padStart(2, '0')}-${String(currentPtr.getDate()).padStart(2, '0')}`;
            const dayOfWeek = currentPtr.getDay(); // 0 = Sunday

            // Check for Holiday
            const holiday = events.find(e => e.date === dateStr && e.is_holiday == 1);
            const isSunday = dayOfWeek === 0;

            // Check for Leave
            const leave = leaves.find(l => {
                if (l.status !== 'Approved') return false;
                const start = new Date(l.start_date);
                const end = new Date(l.end_date);
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                return currentPtr >= start && currentPtr <= end;
            });

            const isLeave = !!leave;

            // Get Plan (Tasks)
            const daysTasks = tasks.filter(t => t.planned_date === dateStr);

            // Get Actual (Timesheets)
            const daysTimesheet = timesheets.find(t =>
                t.employee_id === selectedEmployee?.id &&
                t.date === dateStr
            );

            const isToday = today.getDate() === currentPtr.getDate() && today.getMonth() === currentPtr.getMonth() && today.getFullYear() === currentPtr.getFullYear();

            data.push({
                date: dateStr,
                displayDate: currentPtr.toLocaleDateString(),
                isHoliday: !!holiday,
                isSunday: isSunday,
                holidayName: holiday?.title || 'SUNDAY',
                tasks: daysTasks,
                timesheet: daysTimesheet || null,
                isLeave: isLeave,
                leaveDetails: leave,
                isToday: isToday
            });

            // Increment day
            currentPtr.setDate(currentPtr.getDate() + 1);
        }

        setSpreadsheetData(data);
    };

    const handleSaveRemark = async (item, newRemark, isDelete = false) => {
        const currentRemark = item.timesheet?.admin_remarks || item.timesheet?.adminRemarks || "";
        const trimmedNew = newRemark ? newRemark.trim() : "";

        if (!isDelete && trimmedNew === "") {
            if (!currentRemark) return;
        }

        if (trimmedNew === currentRemark && !isDelete) {
            return;
        }

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
                employeeId: item.timesheet.employee_id,
                adminRemarks: finalRemark
            });
            const newTimesheets = timesheets.map(t =>
                (t.id === item.timesheet.id) ? { ...t, adminRemarks: finalRemark, admin_remarks: finalRemark } : t
            );
            setTimesheets(newTimesheets);
        } else {
            try {
                const payload = {
                    employeeId: selectedEmployee.id,
                    employee_id: selectedEmployee.id,
                    date: item.date,
                    adminRemarks: finalRemark,
                    entries: []
                };
                await saveTimesheet(payload);
                fetchAllData();
            } catch (error) {
                console.error("Failed to save remark for new timesheet", error);
                alert("Failed to save remark");
            }
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading data...</div>;

    return (
        <div className="p-6 max-w-full mx-auto h-[calc(100vh-80px)] overflow-hidden flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Timesheet Management</h1>
                    <p className="text-gray-500">Review planned vs actual work.</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex items-center gap-2">
                        {/* Employee Switcher */}
                        <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                            <button
                                onClick={handlePrevEmployee}
                                className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
                                title="Previous Employee"
                            >
                                <ChevronLeft size={20} />
                            </button>

                            <div className="relative group">
                                <button className="flex items-center gap-2 px-4 py-1.5 min-w-[200px] justify-between hover:bg-gray-50 rounded-md transition-colors">
                                    <span className="flex items-center gap-2">
                                        <User size={16} className="text-indigo-600" />
                                        <span className="font-medium text-gray-700">{selectedEmployee?.name || 'Select Employee'}</span>
                                    </span>
                                    <ChevronDown size={16} className="text-gray-400" />
                                </button>

                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 bg-white border border-gray-100 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
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

                            <button
                                onClick={handleNextEmployee}
                                className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
                                title="Next Employee"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1 overflow-y-auto" ref={scrollContainerRef}>
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm border-b border-gray-200">
                            <tr className="text-left">
                                <th className="py-3 px-4 font-semibold text-gray-700 text-sm w-32 border-r border-gray-200">Date</th>
                                <th className="py-3 px-4 font-semibold text-gray-700 text-sm w-1/3 border-r border-gray-200">Plan (Target Deliverables)</th>
                                <th className="py-3 px-4 font-semibold text-gray-700 text-sm w-1/3 border-r border-gray-200">Actual (Work Log)</th>
                                <th className="py-3 px-4 font-semibold text-gray-700 text-sm">Comments</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Sentinel for Infinite Scroll Up */}
                            <tr>
                                <td colSpan="4" className="p-0">
                                    <div ref={topSentinelRef} className="h-4 w-full" />
                                    {isFetchingMore && (
                                        <div className="text-center py-2 text-xs text-gray-400 bg-gray-50">
                                            Loading previous dates...
                                        </div>
                                    )}
                                </td>
                            </tr>

                            {spreadsheetData.map((day) => {
                                // Holiday / Weekend / Leave Styling
                                const isSpecial = day.isHoliday || day.isSunday || day.isLeave;
                                const rowClass = day.isLeave ? "bg-red-50" : (day.isHoliday || day.isSunday ? "bg-yellow-100" : (day.isToday ? "bg-indigo-50/30" : "hover:bg-gray-50"));
                                const borderClass = day.isLeave ? "border-red-100" : (day.isHoliday || day.isSunday ? "border-yellow-200" : "border-gray-100");

                                return (
                                    <tr
                                        key={day.date}
                                        id={day.isToday ? 'today-row' : undefined}
                                        className={clsx(
                                            "border-b transition-colors scroll-mt-[60px]",
                                            rowClass,
                                            borderClass
                                        )}
                                    >
                                        <td className={`py-3 px-4 font-medium text-sm border-r ${borderClass} align-top`}>
                                            <div className="whitespace-nowrap">{day.date}</div>
                                            {day.isToday && <span className="text-xs text-indigo-600 font-bold block mt-1">TODAY</span>}
                                            {(day.isHoliday || day.isSunday) && <div className="text-xs font-bold text-gray-500 mt-1 uppercase">{day.holidayName}</div>}
                                            {day.isLeave && <div className="text-xs font-bold text-red-600 mt-1 uppercase">{day.leaveDetails?.type}</div>}
                                        </td>

                                        {/* Plan Column */}
                                        <td className={`py-3 px-4 border-r ${borderClass} align-top`}>
                                            {day.tasks && day.tasks.length > 0 ? (
                                                <>
                                                    <ul className="list-disc list-inside space-y-1">
                                                        {day.tasks.map(t => (
                                                            <li key={t.id} className="text-sm text-gray-600">
                                                                {t.task_content}
                                                                <span className={clsx("ml-2 text-xs px-1.5 py-0.5 rounded",
                                                                    t.is_completed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                                                )}>
                                                                    {t.is_completed ? 'Done' : 'Pending'}
                                                                </span>
                                                                {!t.is_completed && t.eta && (
                                                                    <span className="text-xs text-gray-400 ml-2">
                                                                        ETA: {t.eta}m
                                                                    </span>
                                                                )}
                                                                {/* Differences Calculation (Date & Time) */}
                                                                {(() => {
                                                                    if (!t.is_completed) return null;

                                                                    // Find relevant timesheet entries
                                                                    let taskEntries = [];
                                                                    if (Array.isArray(timesheets)) {
                                                                        timesheets.forEach(tsDay => {
                                                                            if (tsDay.entries) {
                                                                                const matching = tsDay.entries.filter(e => (e.taskId || e.task_id) == t.id && e.is_deleted != 1);
                                                                                if (matching.length > 0) {
                                                                                    matching.forEach(m => taskEntries.push({ ...m, date: tsDay.date }));
                                                                                }
                                                                            }
                                                                        });
                                                                    }

                                                                    if (taskEntries.length === 0) return null;

                                                                    const lastEntry = taskEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                                                    const totalDuration = taskEntries.reduce((sum, e) => sum + parseFloat(e.duration || 0), 0);

                                                                    let diffDaysElement = null;
                                                                    let diffMinsElement = null;

                                                                    // Date Diff
                                                                    if (t.planned_date) {
                                                                        const plannedDate = new Date(t.planned_date);
                                                                        plannedDate.setHours(0, 0, 0, 0);
                                                                        const actualDate = new Date(lastEntry.date);
                                                                        actualDate.setHours(0, 0, 0, 0);
                                                                        const diffDays = Math.ceil((actualDate - plannedDate) / (1000 * 60 * 60 * 24));

                                                                        if (diffDays > 0) diffDaysElement = <span className="text-xs font-bold text-red-600 ml-1">(+{diffDays}d)</span>;
                                                                        else if (diffDays < 0) diffDaysElement = <span className="text-xs font-bold text-green-600 ml-1">({diffDays}d)</span>;
                                                                    }

                                                                    // Time Diff
                                                                    if (t.eta) {
                                                                        const actualMins = totalDuration * 60;
                                                                        const diff = Math.round(actualMins - parseInt(t.eta));
                                                                        if (diff < 0) diffMinsElement = <span className="text-xs font-bold text-green-600 ml-1">({diff}m)</span>;
                                                                        else if (diff > 0) diffMinsElement = <span className="text-xs font-bold text-red-600 ml-1">(+{diff}m)</span>;
                                                                    }

                                                                    return <>{diffDaysElement}{diffMinsElement}</>;
                                                                })()}
                                                            </li>
                                                        ))}
                                                    </ul>

                                                    {/* Total Planned */}
                                                    {(() => {
                                                        const totalPlannedMins = day.tasks.reduce((sum, t) => sum + (parseInt(t.eta) || 0), 0);
                                                        if (totalPlannedMins > 0) {
                                                            return (
                                                                <div className="pt-2 mt-2 border-t border-gray-100">
                                                                    <span className="text-xs font-bold text-indigo-600">
                                                                        Total: {(totalPlannedMins / 60).toFixed(2).replace(/[.,]00$/, "")} hrs
                                                                    </span>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">No plan set</span>
                                            )}
                                        </td>

                                        {/* Actual Column */}
                                        <td className={`py-3 px-4 border-r ${borderClass} align-top`}>
                                            {day.timesheet && day.timesheet.entries && day.timesheet.entries.length > 0 ? (
                                                <div className="space-y-2">
                                                    {day.timesheet.entries.filter(e => e.is_deleted != 1).map(entry => {
                                                        const task = tasks.find(t => t.id == (entry.taskId || entry.task_id));
                                                        const color = getTaskStatusColor(task?.planned_date, task?.is_completed, day.date);

                                                        // Diff Calculations for individual entry
                                                        let timeDiffElement = null;
                                                        if (task && task.eta) {
                                                            const actualMins = parseFloat(entry.duration) * 60;
                                                            const diff = Math.round(actualMins - parseInt(task.eta));
                                                            if (diff < 0) timeDiffElement = <span className="text-xs font-bold text-green-600 ml-1">({diff}m)</span>;
                                                            else if (diff > 0) timeDiffElement = <span className="text-xs font-bold text-red-600 ml-1">(+{diff}m)</span>;
                                                        }

                                                        return (
                                                            <div key={entry.id} className="text-sm mb-3">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex items-start gap-2">
                                                                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${color.dot}`}></div>
                                                                        <div className="flex flex-col">
                                                                            <TaskTooltip task={task || { task_content: entry.description, is_completed: true, planned_date: day.date, created_at: day.date }}>
                                                                                <span className={`font-medium cursor-pointer transition-colors ${color.text}`}>
                                                                                    {task?.task_content || entry.description}
                                                                                </span>
                                                                            </TaskTooltip>
                                                                            {entry.description && task && entry.description !== task.task_content && (
                                                                                <div className="mt-1">
                                                                                    <ExpandableText text={entry.description} limit={100} className="text-xs text-gray-600" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-xs text-gray-400 whitespace-nowrap ml-2 flex flex-col items-end">
                                                                        <span>{entry.startTime} - {entry.endTime}</span>
                                                                        <span className="font-medium text-gray-700 flex items-center">
                                                                            {timeDiffElement}
                                                                            <span className="ml-1">({entry.duration}h)</span>
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Total Actual */}
                                                    <div className="pt-1 mt-1 border-t border-gray-100 flex justify-between items-center">
                                                        <span className="text-xs font-bold text-indigo-600">
                                                            Total: {day.timesheet.entries.reduce((sum, e) => sum + (e.is_deleted == 1 ? 0 : parseFloat(e.duration || 0)), 0)} hrs
                                                        </span>
                                                        <span className={clsx("text-xs px-2 py-0.5 rounded-full", (() => {
                                                            const today = new Date();
                                                            today.setHours(0, 0, 0, 0);
                                                            const sheetDate = new Date(day.date);
                                                            sheetDate.setHours(0, 0, 0, 0);
                                                            const isPast = sheetDate < today;
                                                            const displayStatus = (isPast && day.timesheet.status === 'draft') ? 'submitted' : day.timesheet.status;
                                                            return displayStatus === 'submitted' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700";
                                                        })())}>
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
                                                    key={day.timesheet?.id + '-' + (day.timesheet?.admin_remarks || day.timesheet?.adminRemarks || '')}
                                                    type="text"
                                                    className="w-full text-xs border-b border-transparent focus:border-indigo-500 focus:ring-0 bg-transparent outline-none transition-colors placeholder-gray-300"
                                                    placeholder="Add comment..."
                                                    defaultValue={day.timesheet?.admin_remarks || day.timesheet?.adminRemarks || ''}
                                                    onBlur={(e) => handleSaveRemark(day, e.target.value)}
                                                />
                                                {(day.timesheet?.admin_remarks || day.timesheet?.adminRemarks) && (
                                                    <button
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
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
