import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getTasks, updateTask, createTask, deleteTask } from '../services/taskService';
import { saveTimesheet, getTimesheets } from '../services/timesheetService';
import { getFrameworkAllocations } from '../services/frameworkService';
import { getCurrentUser } from '../services/authService';
import { Clock, CheckCircle, ChevronDown, ChevronUp, Calendar, Plus, Pencil, X, Save, GripVertical, Trash2, AlertTriangle } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { saveFrameworkAllocations } from '../services/frameworkService';
import { getTaskStatusColor } from '../utils/taskUtils';

import { startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO, isSameDay, isToday } from 'date-fns';
import { getUserSetting, saveUserSetting } from '../services/userSettingsService';
import { getLeaves } from '../services/leaveService';
import ExpandableText from '../components/ExpandableText';
import TaskTooltip from '../components/TaskTooltip';

// Moved SortableItem outside to prevent re-mounting on every render (Focus Loss Fix)
const SortableItem = ({ id, item, index, onRemove, onUpdate }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 mb-2 bg-gray-50 p-2 rounded-md border border-gray-100 group">
            <GripVertical size={16} />

            <input
                type="text"
                value={item.category_name}
                onChange={(e) => onUpdate(index, 'category_name', e.target.value)}
                className="flex-1 text-sm bg-transparent border-b border-transparent focus:border-indigo-300 focus:ring-0 p-1 font-medium text-gray-700 placeholder-gray-400 transition-colors"
                placeholder="Category Name"
            />
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 w-16 shadow-sm">
                <input
                    type="text"
                    value={item.percentage}
                    onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        onUpdate(index, 'percentage', val === '' ? 0 : parseInt(val));
                    }}
                    className="w-full text-sm bg-transparent border-none focus:ring-0 p-0 text-center font-bold text-indigo-600 outline-none"
                    placeholder="0"
                />
                <span className="text-xs text-gray-400 font-medium select-none">%</span>
            </div>
            <button onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 size={16} />
            </button>
        </div >
    );
};

const Dashboard = () => {
    const location = useLocation();
    const [loading, setLoading] = useState(true);



    // Tasks State
    const [tasks, setTasks] = useState([]);
    const [allTasksList, setAllTasksList] = useState([]); // Store all tasks for lookup
    const [loggedEntries, setLoggedEntries] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [frameworkTotal, setFrameworkTotal] = useState(0);
    const [isEditingFramework, setIsEditingFramework] = useState(false);
    const [tempAllocations, setTempAllocations] = useState([]);
    const [upcomingLeaves, setUpcomingLeaves] = useState([]);

    // Logging State (Dropdown/Inline)
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [logForm, setLogForm] = useState({
        duration: '',
        remarks: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Editing Logged Entry State
    const [editingEntryId, setEditingEntryId] = useState(null);
    // Reuse logForm for editing to keep it consistent (duration in mins, remarks)
    // We can use a separate state if we want to avoid conflicts, but reusing logic is fine if we are careful.
    // Let's use a separate state to be safe and clear.
    const [editForm, setEditForm] = useState({ duration: '', remarks: '' });

    // Task Editing State (24h Restriction)
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    const [editingTaskData, setEditingTaskData] = useState({
        id: null,
        content: '',
        date: '',
        eta: '',
        frameworkId: ''
    });

    // Quick Add State
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [quickTask, setQuickTask] = useState({
        content: '',
        date: new Date().toISOString().split('T')[0],
        eta: '',
        frameworkId: '',
        recurrence: { isRecurring: false, frequency: 'daily', interval: 1, endDate: '' }
    });

    const handleQuickAddTask = async (e) => {
        e.preventDefault();
        const user = getCurrentUser();
        if (!quickTask.content) return;
        if (!quickTask.eta || parseInt(quickTask.eta) <= 0) {
            alert("ETA is mandatory and must be greater than 0 minutes.");
            return;
        }

        try {
            await createTask({
                user_id: user.id,
                task_content: quickTask.content,
                planned_date: quickTask.date,
                eta: quickTask.eta,
                framework_id: quickTask.frameworkId || null,
                framework_id: quickTask.frameworkId || null,
                recurrence: quickTask.recurrence,
                start_time: null,
                end_time: null
            });

            setIsAddingTask(false);
            setQuickTask({
                content: '',
                date: new Date().toISOString().split('T')[0],
                eta: '',
                frameworkId: '',
                recurrence: { isRecurring: false, frequency: 'daily', interval: 1, endDate: '' }
            });
            fetchDashboardData();
        } catch (error) {
            console.error("Failed to save task", error);
            alert(`Failed to save task: ${error.message}`);
        }
    };

    const isEditable = (task) => {
        if (!task.created_at) return false;
        const created = new Date(task.created_at).getTime();
        const now = Date.now();
        // 24 hours in milliseconds = 24 * 60 * 60 * 1000 = 86400000
        return (now - created) < 86400000;
    };

    const handleEditTaskClick = (task, e) => {
        e.stopPropagation(); // Prevent toggling expand
        setEditingTaskData({
            id: task.id,
            content: task.task_content,
            date: task.planned_date,
            eta: task.eta || '',
            frameworkId: task.framework_id || ''
        });
        setShowEditTaskModal(true);
    };



    const handleDeleteTaskClick = async (taskId, e) => {
        e.stopPropagation(); // Prevent toggling expand
        if (window.confirm("Are you sure you want to delete this task?")) {
            try {
                await deleteTask(taskId);
                fetchDashboardData();
            } catch (error) {
                console.error("Failed to delete task", error);
            }
        }
    };

    const handleUpdateTaskSubmit = async (e) => {
        e.preventDefault();
        if (!editingTaskData.content) return;
        if (!editingTaskData.eta || parseInt(editingTaskData.eta) <= 0) {
            alert("ETA is mandatory and must be greater than 0 minutes.");
            return;
        }

        try {
            if (editingTaskData.id) {
                // Update
                await updateTask(editingTaskData.id, {
                    task_content: editingTaskData.content,
                    planned_date: editingTaskData.date,
                    eta: editingTaskData.eta,
                    framework_id: editingTaskData.frameworkId || null
                });
            } else {
                // Create
                await createTask({
                    user_id: user.id,
                    task_content: editingTaskData.content,
                    planned_date: editingTaskData.date,
                    eta: editingTaskData.eta,
                    framework_id: editingTaskData.frameworkId || null,
                    start_time: null,
                    end_time: null
                });
            }

            setShowEditTaskModal(false);
            setEditingTaskData({ id: null, content: '', date: '', eta: '', frameworkId: '' });
            fetchDashboardData();
        } catch (error) {
            console.error("Failed to save task", error);
            alert(`Failed to save task: ${error.message}`);
        }
    };

    // Draggable Sensor Setup
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const user = getCurrentUser();
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const [coreHours, setCoreHours] = useState({ working_days: [], working_slots: [] });
    const [coreHoursPending, setCoreHoursPending] = useState(null);
    const [coreHoursRejection, setCoreHoursRejection] = useState(null);
    const [isEditingCoreHours, setIsEditingCoreHours] = useState(false);
    const [tempCoreHours, setTempCoreHours] = useState({ working_days: [], working_slots: [] });

    useEffect(() => {
        if (user?.id) {
            fetchDashboardData();
            fetchCoreHours();
        }
    }, [user?.id]);

    const fetchCoreHours = async () => {
        if (!user?.id) return;
        const settings = await getUserSetting(user.id, 'core_working_hours');
        if (settings) {
            setCoreHours(settings);
            setTempCoreHours(settings);
        } else {
            // Default presets
            const defaultSettings = {
                working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                working_slots: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }]
            };
            setCoreHours(defaultSettings);
            setTempCoreHours(defaultSettings);
        }

        // Fetch Pending Core Hours Request
        const pendingRequest = await getUserSetting(user.id, 'core_hours_request');
        setCoreHoursPending(pendingRequest);

        // Fetch Rejection Notice
        const rejection = await getUserSetting(user.id, 'core_hours_rejection');
        setCoreHoursRejection(rejection);
    };

    const handleSaveCoreHours = async () => {
        // Save to pending request instead of direct update
        await saveUserSetting(user.id, 'core_hours_request', tempCoreHours);
        // Clear any previous rejection
        await saveUserSetting(user.id, 'core_hours_rejection', null);
        setCoreHoursRejection(null);

        setCoreHoursPending(tempCoreHours); // Update local pending state
        setIsEditingCoreHours(false);
    };

    const handleDismissRejection = async () => {
        await saveUserSetting(user.id, 'core_hours_rejection', null);
        setCoreHoursRejection(null);
    };

    const toggleDay = (day) => {
        setTempCoreHours(prev => {
            const days = prev.working_days.includes(day)
                ? prev.working_days.filter(d => d !== day)
                : [...prev.working_days, day];
            return { ...prev, working_days: days };
        });
    };

    const updateSlot = (index, field, value) => {
        setTempCoreHours(prev => {
            const slots = [...prev.working_slots];
            slots[index] = { ...slots[index], [field]: value };
            return { ...prev, working_slots: slots };
        });
    };

    const addSlot = () => {
        setTempCoreHours(prev => ({
            ...prev,
            working_slots: [...prev.working_slots, { start: '09:00', end: '17:00' }]
        }));
    };

    const removeSlot = (index) => {
        setTempCoreHours(prev => ({
            ...prev,
            working_slots: prev.working_slots.filter((_, i) => i !== index)
        }));
    };

    const fetchDashboardData = async () => {
        if (!user?.id) return;

        try {
            // 1. Fetch All Tasks
            const allTasks = await getTasks(user.id);
            setAllTasksList(allTasks); // Save all tasks
            const pendingTasks = allTasks.filter(t => t.is_completed != 1);

            // Sort by planned_date
            pendingTasks.sort((a, b) => new Date(a.planned_date) - new Date(b.planned_date));
            setTasks(pendingTasks);

            // 2. Fetch Today's Logged Entries
            const timesheetsData = await getTimesheets(user.id);
            const todaySheet = timesheetsData.find(t => t.date === today);
            setLoggedEntries(todaySheet ? todaySheet.entries.filter(e => e.is_deleted != 1) : []);

            // 3. Fetch Framework Allocations
            const frameworkData = await getFrameworkAllocations(user.id);
            // Sort by position if available
            const sortedData = (frameworkData || []).sort((a, b) => (a.position - b.position));
            setAllocations(sortedData);
            setTempAllocations(sortedData); // Initialize temp state for editing

            const total = sortedData.reduce((sum, item) => sum + parseInt(item.percentage), 0);
            setFrameworkTotal(total);

            // 4. Fetch Leaves for "Upcoming Leaves" widget
            const leavesResult = await getLeaves(user.id);
            const leavesData = leavesResult.leaves || [];
            // Filter: Approved and End Date >= Today
            const futureLeaves = leavesData.filter(l =>
                l.status === 'Approved' && new Date(l.end_date) >= new Date(new Date().setHours(0, 0, 0, 0))
            ).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
            setUpcomingLeaves(futureLeaves);

            // 5. Fetch Calendar Events for Holidays
            const eventsRes = await fetch('/api/calendar.php');
            if (eventsRes.ok) {
                const events = await eventsRes.json();
                setCalendarEvents(events.filter(e => e.is_holiday == 1));
            }

        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    const [calendarEvents, setCalendarEvents] = useState([]);

    const getWeekDays = () => {
        const start = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(start);
            date.setDate(date.getDate() + i);
            return date;
        });
    };

    const getDayStatus = (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayName = format(date, 'EEE'); // Mon, Tue...

        // 1. Check for Leave (Highest Priority for Red)
        // 1. Check for Leave (Highest Priority for Red)
        const isLeave = upcomingLeaves.some(leave => {
            // Robust String Comparison (YYYY-MM-DD)
            return dateStr >= leave.start_date && dateStr <= leave.end_date;
        });
        if (isLeave) return 'red';

        // 2. Check for Company Holiday (Yellow)
        const isHoliday = calendarEvents.some(e => e.date === dateStr);
        if (isHoliday) return 'yellow';

        // 3. Check for Sunday (Yellow)
        if (date.getDay() === 0) return 'yellow';

        // 4. Check for Core Day (Green if active, Red if inactive)
        const isCore = coreHours.working_days.includes(dayName);
        return isCore ? 'green' : 'red';
    };

    const weekDays = getWeekDays();


    const getTaskCounts = () => {
        let overdue = 0;
        let dueToday = 0;
        let future = 0;

        const todayDate = new Date(today);
        todayDate.setHours(0, 0, 0, 0);

        tasks.forEach(t => {
            const taskDate = new Date(t.planned_date);
            taskDate.setHours(0, 0, 0, 0);

            if (taskDate.getTime() < todayDate.getTime()) overdue++;
            else if (taskDate.getTime() === todayDate.getTime()) dueToday++;
            else future++;
        });

        return { overdue, dueToday, future };
    };

    const toggleTaskExpand = (task) => {
        if (expandedTaskId === task.id) {
            setExpandedTaskId(null);
            setLogForm({ duration: '', remarks: '' });
        } else {
            setExpandedTaskId(task.id);
            setLogForm({
                duration: task.eta || '',
                remarks: ''
            });
        }
    };

    const handleLogWork = async (e, task) => {
        e.preventDefault();
        if (!task || !logForm.duration) return;

        setIsSubmitting(true);
        try {
            const timesheetsData = await getTimesheets(user.id);
            const todaySheet = timesheetsData.find(t => t.date === today);
            // Fix: Normalize existing entries to ensure taskId is set (backend expects taskId, fetches return task_id)
            const currentEntries = todaySheet ? todaySheet.entries.filter(e => e.is_deleted != 1).map(e => ({
                ...e,
                taskId: e.taskId || e.task_id
            })) : [];

            const durationInHours = (parseFloat(logForm.duration) / 60).toFixed(2);

            const newEntry = {
                id: Date.now(),
                duration: durationInHours,
                description: logForm.remarks || task.task_content,
                taskId: task.id,
                project: 'General',
                startTime: null,
                endTime: null
            };

            await saveTimesheet({
                date: today,
                entries: [...currentEntries, newEntry],
                employeeId: user.id,
                status: 'draft'
            });

            await updateTask(task.id, { is_completed: 1 });

            setExpandedTaskId(null);
            setLogForm({ duration: '', remarks: '' });
            fetchDashboardData();

        } catch (error) {
            console.error("Failed to log work", error);
            alert("Failed to log work.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEntry = async (entryIndex, task) => {
        try {
            const timesheetsData = await getTimesheets(user.id);
            const todaySheet = timesheetsData.find(t => t.date === today);
            if (!todaySheet) return;

            // Finding the actual entry in the main list to mark deleted
            const entryToDelete = loggedEntries[entryIndex];

            // Robust Filtering: Prioritize ID, then TaskID, then Content
            const updatedEntries = todaySheet.entries.filter(e => {
                // 1. Strict ID Match (If both have IDs)
                if (e.id && entryToDelete.id) {
                    return e.id !== entryToDelete.id;
                }
                // 2. Strict Task ID Match (If both have Task IDs - Unique for recurring)
                if (e.taskId && entryToDelete.taskId) {
                    return e.taskId !== entryToDelete.taskId;
                }
                // 3. Last Resort: Content Match (Only if IDs/TaskIDs missing)
                // This prevents deleting duplicates if they have unique TaskIDs but we fell through
                // But if we are here, means IDs matched (or both undefined).
                return !(e.description === entryToDelete.description && e.duration === entryToDelete.duration);
            }).map(e => ({
                ...e,
                taskId: e.taskId || e.task_id // Normalize for backend
            }));

            await saveTimesheet({
                date: today,
                entries: updatedEntries,
                employeeId: user.id,
                status: todaySheet.status
            });

            // Reopen the task so it moves back to "Your Tasks"
            // Use the passed task object to be sure we have the ID
            const targetTaskId = task?.id || entryToDelete.taskId;
            if (targetTaskId) {
                await updateTask(targetTaskId, { is_completed: 0 });
            }

            fetchDashboardData();
        } catch (error) {
            console.error("Failed to delete entry", error);
            alert("Failed to delete entry.");
        }
    };

    const startEditingEntry = (entry, task) => {
        if (editingEntryId === entry.id) {
            setEditingEntryId(null);
            setEditForm({ duration: '', remarks: '' });
        } else {
            setEditingEntryId(entry.id);
            // Convert hours to minutes for the form
            const mins = Math.round(parseFloat(entry.duration || 0) * 60);

            // Determine Remarks:
            // If description exactly matches task content, show empty remarks (it was just the default title)
            // Otherwise, show the description as remarks
            let remarks = entry.description || '';
            if (task && remarks === task.task_content) {
                remarks = '';
            }

            setEditForm({
                duration: mins.toString(),
                remarks: remarks
            });
        }
    };

    const handleUpdateEntry = async (entry, task) => {
        try {
            const timesheetsData = await getTimesheets(user.id);
            const todaySheet = timesheetsData.find(t => t.date === today);
            if (!todaySheet) return;

            const durationInHours = (parseFloat(editForm.duration) / 60).toFixed(2);

            // Construct Description:
            // If remarks present, use remarks.
            // If empty, revert to task content (Title).
            // NOTE: User wants "exact like remarks". If I set description to remarks, it might lose the "Title".
            // Ideally description = remarks || task_content. 
            // BUT if the user wants the "Title" to stay fixed and remarks to be secondary, we might need to store them separately?
            // The request says "Give exact like remarks whihc like yours tasks". In "Your Tasks", you log "Time" and "Remarks".
            // The entry description usually stores the Task Content (or remarks). 
            // If I change description to "Late work", the display shows "Late work".
            // The User wants the Title ("Task Content") to remain visible and Remarks to be editable.
            // So we should save description as: `editForm.remarks`? 
            // If we do that, we lose the task title in the entry description.
            // However, since we link by `taskId`, we can display `task.task_content` in the UI always.
            // So `entry.description` essentially becomes the "Remarks".
            const newDescription = editForm.remarks || task?.task_content || "Work Logged";

            const updatedEntries = todaySheet.entries.map(e => {
                const updated = e.id === entry.id ? { ...e, duration: durationInHours, description: newDescription } : e;
                return {
                    ...updated,
                    taskId: updated.taskId || updated.task_id // Normalize for backend
                };
            });

            await saveTimesheet({
                date: today,
                entries: updatedEntries,
                employeeId: user.id,
                status: todaySheet.status
            });

            setEditingEntryId(null);
            setEditForm({ duration: '', remarks: '' });
            fetchDashboardData();
        } catch (error) {
            console.error("Failed to update entry", error);
            alert("Failed to update entry.");
        }
    };

    // --- Framework Editing Logic ---
    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setTempAllocations((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id || item.tempId === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id || item.tempId === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleAddAllocation = () => {
        setTempAllocations([...tempAllocations, {
            tempId: Date.now(), // Temporary ID for new items
            category_name: 'New Allocation',
            percentage: 0,
            isNew: true
        }]);
    };

    const handleRemoveAllocation = (index) => {
        const newAllocations = [...tempAllocations];
        newAllocations.splice(index, 1);
        setTempAllocations(newAllocations);
    };

    const handleUpdateAllocation = (index, field, value) => {
        setTempAllocations(prev => prev.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ));
    };

    const handleSaveFramework = async () => {
        try {
            await saveFrameworkAllocations(user.id, tempAllocations);
            setAllocations(tempAllocations);
            const total = tempAllocations.reduce((sum, item) => sum + (parseInt(item.percentage) || 0), 0);
            setFrameworkTotal(total);
            setIsEditingFramework(false);
            console.log("Saved successfully");
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || "Failed to submit.";
            const debug = error.response?.data?.error || "";
            const status = error.response?.status || "Unknown Status";
            const errMsg = error.message || "Unknown Error";
            alert(`Error: ${msg}\nServer Details: ${debug}\nStatus: ${status}\nTechnical: ${errMsg}`);
        }
    };

    // --- Framework Chart Visuals Removed as per request ---

    const counts = getTaskCounts();

    // Check if today is a leave day
    const isTodayLeave = upcomingLeaves.some(l => {
        const todayD = new Date();
        todayD.setHours(0, 0, 0, 0);
        const start = new Date(l.start_date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(l.end_date);
        end.setHours(0, 0, 0, 0);
        return todayD >= start && todayD <= end;
    });

    const currentLeave = isTodayLeave ? upcomingLeaves.find(l => {
        const todayD = new Date();
        todayD.setHours(0, 0, 0, 0);
        const start = new Date(l.start_date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(l.end_date);
        end.setHours(0, 0, 0, 0);
        return todayD >= start && todayD <= end;
    }) : null;

    return (
        <div className="p-6 max-w-full mx-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                {/* Left Column (5/12 width) - Vertical Stack */}
                <div className="lg:col-span-5 flex flex-col space-y-5">

                    {/* 1. Core Working Hours */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        {/* Header Actions Row - Changed from absolute to flex to prevent overlap */}
                        <div className="flex justify-end gap-2 items-center mb-1 h-6">
                            {coreHoursPending && (
                                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wide border border-orange-100">
                                    <Clock size={10} /> Pending Approval
                                </span>
                            )}
                            {coreHoursRejection && (
                                <span
                                    onClick={handleDismissRejection}
                                    className="cursor-pointer text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wide border border-red-100 hover:bg-red-100 transition-colors"
                                    title="Click to dismiss"
                                >
                                    <AlertTriangle size={10} /> Request Rejected
                                </span>
                            )}
                            <button
                                onClick={() => isEditingCoreHours ? handleSaveCoreHours() : setIsEditingCoreHours(true)}
                                className="text-gray-400 hover:text-indigo-600 transition-colors ml-1"
                                disabled={!!coreHoursPending && !isEditingCoreHours}
                                title={coreHoursPending ? "Waiting for approval" : "Edit Schedule"}
                            >
                                {isEditingCoreHours ? <Save size={14} /> : <Pencil size={14} />}
                            </button>
                        </div>

                        {!isEditingCoreHours ? (
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Core Working Days</h3>
                                    <div className="space-y-2">
                                        {/* Row 1: M T W T */}
                                        <div className="flex gap-2">
                                            {weekDays.slice(0, 4).map((date, i) => {
                                                const dayLetter = format(date, 'EEE').slice(0, 2); // Mo, Tu, We...

                                                // Normal State
                                                const status = getDayStatus(date);
                                                let bgClass = 'bg-gray-100 text-gray-400';

                                                if (status === 'green') bgClass = 'bg-green-100 text-green-700';
                                                else if (status === 'yellow') bgClass = 'bg-yellow-100 text-yellow-700';
                                                else if (status === 'red') bgClass = 'bg-red-100 text-red-700';

                                                return (
                                                    <span key={i} className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${bgClass}`}>
                                                        {dayLetter}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        {/* Row 2: F S S */}
                                        <div className="flex gap-2">
                                            {weekDays.slice(4, 7).map((date, i) => {
                                                const dayLetter = format(date, 'EEE').slice(0, 2);

                                                const status = getDayStatus(date);
                                                let bgClass = 'bg-gray-100 text-gray-400';

                                                if (status === 'green') bgClass = 'bg-green-100 text-green-700';
                                                else if (status === 'yellow') bgClass = 'bg-yellow-100 text-yellow-700';
                                                else if (status === 'red') bgClass = 'bg-red-100 text-red-700';

                                                return (
                                                    <span key={i} className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${bgClass}`}>
                                                        {dayLetter}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Core Working Hours</h3>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        {/* Display logic for Pending vs Active */}
                                        {coreHours.working_slots.length > 0 ? (
                                            coreHours.working_slots.map((slot, i) => (
                                                <div key={i} className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                                    {slot.start} - {slot.end}
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-sm text-gray-400 italic">No slots set</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Active Days</label>
                                    <div className="flex gap-1 flex-wrap justify-between">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                            <button
                                                key={day}
                                                onClick={() => toggleDay(day)}
                                                className={`w-8 h-8 rounded text-[10px] font-bold transition-colors border flex items-center justify-center ${tempCoreHours.working_days.includes(day) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                                            >
                                                {day.slice(0, 2)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Schedule</label>
                                    <div className="space-y-1.5 overflow-y-auto max-h-[100px] pr-1 no-scrollbar">
                                        {tempCoreHours.working_slots.map((slot, i) => (
                                            <div key={i} className="flex items-center gap-1">
                                                <input
                                                    type="time"
                                                    value={slot.start}
                                                    onChange={(e) => updateSlot(i, 'start', e.target.value)}
                                                    className="text-[9px] p-0.5 border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none w-14 text-center"
                                                />
                                                <span className="text-gray-300 text-[9px]">-</span>
                                                <input
                                                    type="time"
                                                    value={slot.end}
                                                    onChange={(e) => updateSlot(i, 'end', e.target.value)}
                                                    className="text-[9px] p-0.5 border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none w-14 text-center"
                                                />
                                                <button onClick={() => removeSlot(i)} className="text-gray-300 hover:text-red-500 transition-colors p-0.5"><Trash2 size={10} /></button>
                                            </div>
                                        ))}
                                        <button onClick={addSlot} className="text-[9px] text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-1 mt-1">
                                            <Plus size={9} /> Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. Framework (Moved Up) */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[280px]">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-2">
                            <h2 className="text-base font-bold text-gray-900">Framework</h2>
                            {!isEditingFramework && (
                                <button onClick={() => setIsEditingFramework(true)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                                    <Pencil size={14} />
                                </button>
                            )}
                        </div>

                        {!isEditingFramework ? (
                            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
                                {allocations.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${['bg-indigo-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'][idx % 4]}`}></div>
                                            <span className="text-sm font-bold text-gray-700">{item.category_name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-gray-900">{item.percentage}%</span>
                                        </div>
                                    </div>
                                ))}
                                {frameworkTotal < 100 && (
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-300"></div>
                                            <span className="text-sm font-bold text-gray-400">Unplanned</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-gray-400">{100 - frameworkTotal}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col min-h-0 bg-white z-10">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Editing...</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleSaveFramework()} className="text-green-600 hover:text-green-700" title="Save">
                                            <Save size={16} />
                                        </button>
                                        <button onClick={() => { setIsEditingFramework(false); setTempAllocations(allocations); }} className="text-red-400 hover:text-red-500" title="Cancel">
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>

                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={tempAllocations.map(i => i.id || i.tempId)} strategy={verticalListSortingStrategy}>
                                        <div className="flex-1 overflow-y-auto pr-1">
                                            {tempAllocations.map((item, index) => (
                                                <SortableItem
                                                    key={item.id || item.tempId}
                                                    id={item.id || item.tempId}
                                                    item={item}
                                                    index={index}
                                                    onRemove={handleRemoveAllocation}
                                                    onUpdate={handleUpdateAllocation}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>

                                <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between items-center">
                                    <button onClick={handleAddAllocation} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                                        <Plus size={14} /> Add Item
                                    </button>
                                    <span className={`text-xs font-bold ${tempAllocations.reduce((sum, i) => sum + (parseInt(i.percentage) || 0), 0) > 100 ? "text-red-500" : "text-gray-400"}`}>
                                        Total: {tempAllocations.reduce((sum, i) => sum + (parseInt(i.percentage) || 0), 0)}%
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Logged Today */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-440px)] min-h-[250px]">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-2 flex-shrink-0">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Clock size={18} className="text-indigo-600" />
                                Logged Today
                            </h2>
                            <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                                {loggedEntries.reduce((acc, curr) => acc + parseFloat(curr.duration || 0), 0).toFixed(2)} hrs
                            </span>
                        </div>
                        <div className="space-y-3 flex-1 overflow-y-auto overflow-x-hidden pr-1 no-scrollbar">
                            {loggedEntries.length === 0 ? (
                                <div className="text-center py-6">
                                    <Clock size={32} className="mx-auto text-gray-200 mb-2" />
                                    <p className="text-sm text-gray-400 italic">No work logged yet.</p>
                                </div>
                            ) : (
                                loggedEntries.map((entry, index) => {
                                    const task = allTasksList.find(t => t.id == (entry.taskId || entry.task_id)) || allTasksList.find(t => t.task_content === entry.description);
                                    // Use actual completion status so Green shows for completed tasks
                                    // "today" is the completion date for entries in this widget
                                    const color = getTaskStatusColor(task?.planned_date, task?.is_completed, today);

                                    // ETA vs Actual Calculation
                                    let timeDiffElement = null;
                                    if (task && task.eta) {
                                        const etaMins = parseInt(task.eta);
                                        const actualMins = parseFloat(entry.duration) * 60;
                                        const diff = Math.round(actualMins - etaMins);

                                        if (diff < 0) {
                                            // Saved time (Green)
                                            timeDiffElement = (
                                                <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded ml-2" title="Time Saved">
                                                    {diff}m
                                                </span>
                                            );
                                        } else if (diff > 0) {
                                            // Over time (Red)
                                            timeDiffElement = (
                                                <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded ml-2" title="Time Overrun">
                                                    +{diff}m
                                                </span>
                                            );
                                        }
                                    }

                                    return (
                                        <div key={entry.id || index} className="group hover:bg-gray-50 rounded-lg -mx-2 transition-colors">
                                            {/* Entry Row */}
                                            <div className="flex justify-between items-start text-sm p-2">
                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors mt-1.5 ${color.dot}`}></div>
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <TaskTooltip task={task || { task_content: entry.description, is_completed: true, created_at: today, planned_date: today }}>
                                                            <span className={`font-medium transition-colors ${color.text}`}>
                                                                {task?.task_content || entry.description}
                                                            </span>
                                                        </TaskTooltip>
                                                        {/* Show remarks if they exist and are different from Title */}
                                                        {entry.description && task && entry.description !== task.task_content && (
                                                            <div className="mt-0.5">
                                                                <ExpandableText text={entry.description} limit={60} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 pl-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-gray-900">{entry.duration}</span>
                                                        <span className="text-xs text-gray-500 font-medium">hrs</span>
                                                        {timeDiffElement}
                                                    </div>
                                                    {/* Move buttons here */}
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => startEditingEntry(entry, task)}
                                                            className="p-1 text-gray-300 hover:text-indigo-600 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteEntry(index, task)}
                                                            className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Edit Dropdown Form */}
                                            {editingEntryId === entry.id && (
                                                <div className="px-4 pb-4 pt-2 bg-gray-50/50 border-t border-gray-100 mx-2 mb-2 rounded-b-md">
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-700 mb-1">Time Spent (Mins)</label>
                                                                <input
                                                                    type="number"
                                                                    required
                                                                    placeholder="e.g. 60"
                                                                    className="w-full text-sm p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 bg-white"
                                                                    value={editForm.duration}
                                                                    onChange={(e) => setEditForm(prev => ({ ...prev, duration: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div className="flex items-end">
                                                                <button
                                                                    onClick={() => handleUpdateEntry(entry, task)}
                                                                    className="w-full text-sm bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors font-medium shadow-sm flex justify-center items-center gap-2"
                                                                >
                                                                    <Save size={14} /> Update Log
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <textarea
                                                                placeholder="Remarks"
                                                                className="w-full text-sm p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 bg-white h-32"
                                                                value={editForm.remarks}
                                                                onChange={(e) => setEditForm(prev => ({ ...prev, remarks: e.target.value }))}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column (7/12 width) - Tasks List */}
                <div className="lg:col-span-7 h-full">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full min-h-[450px]">
                        {/* Fixed height to match approx height of left column items (280 + 296 + 24 gap = 600) */}
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center relative">
                            {isTodayLeave && (
                                <div className="absolute inset-0 bg-white/90 z-20 flex items-center justify-center backdrop-blur-[1px] rounded-t-xl">
                                    <div className="flex items-center gap-2 text-purple-600 font-bold bg-purple-50 px-4 py-2 rounded-lg border border-purple-100 shadow-sm">
                                        <Calendar size={18} />
                                        <span>You are on leave today ({currentLeave?.type}). Log work blocked.</span>
                                    </div>
                                </div>
                            )}
                            <h2 className="text-lg font-bold text-gray-900">Your Tasks</h2>
                            <div className="flex gap-2 items-center">


                                {/* Red - Overdue */}
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${counts.overdue > 0 ? 'text-red-700 bg-red-100' : 'text-gray-400 bg-gray-50'}`}>
                                    {counts.overdue} Red
                                </span>
                                {/* Yellow - Due Today */}
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${counts.dueToday > 0 ? 'text-yellow-800 bg-yellow-100 border border-yellow-200' : 'text-gray-400 bg-gray-50'}`}>
                                    {counts.dueToday} Yellow
                                </span>
                                {/* Green - Future */}
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${counts.future > 0 ? 'text-green-700 bg-green-100' : 'text-gray-400 bg-gray-50'}`}>
                                    {counts.future} Green
                                </span>
                            </div>
                        </div>

                        {/* Task List Header */}
                        <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100 grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <div className="col-span-5">Task</div>
                            <div className="col-span-2 text-right">ETA</div>
                            <div className="col-span-3 text-right">Due Date</div>
                            <div className="col-span-2 text-center">Actions</div>
                        </div>

                        {/* Inline Add Task Form */}
                        <div className="px-6 py-2 border-b border-gray-50">
                            {!isAddingTask ? (
                                <button
                                    onClick={() => setIsAddingTask(true)}
                                    className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-2 py-2 w-full transition-colors"
                                >
                                    <Plus size={16} /> Add Task
                                </button>
                            ) : (
                                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                                    <form onSubmit={handleQuickAddTask}>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase">Add New Task</h4>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Task Name */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">What do you need to do?</label>
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    placeholder="Task description..."
                                                    className="w-full text-sm p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 bg-white outline-none"
                                                    value={quickTask.content}
                                                    onChange={(e) => setQuickTask({ ...quickTask, content: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                {/* Framework */}
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Framework</label>
                                                    <select
                                                        className="w-full text-sm p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 bg-white outline-none"
                                                        value={quickTask.frameworkId}
                                                        onChange={(e) => setQuickTask({ ...quickTask, frameworkId: e.target.value })}
                                                    >
                                                        <option value="">-- None --</option>
                                                        {allocations.map(fw => (
                                                            <option key={fw.id} value={fw.id}>{fw.category_name} ({fw.percentage}%)</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    {/* Date */}
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                                                        <input
                                                            type="date"
                                                            required
                                                            className="w-full text-sm p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 bg-white outline-none"
                                                            value={quickTask.date}
                                                            onChange={(e) => setQuickTask({ ...quickTask, date: e.target.value })}
                                                        />
                                                    </div>
                                                    {/* ETA */}
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">ETA (Min)</label>
                                                        <input
                                                            type="number"
                                                            required
                                                            placeholder="e.g. 30"
                                                            className="w-full text-sm p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 bg-white outline-none"
                                                            value={quickTask.eta}
                                                            onChange={(e) => setQuickTask({ ...quickTask, eta: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Recurrence Options */}
                                            <div className="pt-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <input
                                                        type="checkbox"
                                                        id="isRecurring"
                                                        checked={quickTask.recurrence.isRecurring}
                                                        onChange={(e) => setQuickTask({
                                                            ...quickTask,
                                                            recurrence: { ...quickTask.recurrence, isRecurring: e.target.checked }
                                                        })}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                    />
                                                    <label htmlFor="isRecurring" className="text-xs font-bold text-gray-700 select-none cursor-pointer">Recurring Task</label>
                                                </div>

                                                {quickTask.recurrence.isRecurring && (
                                                    <div className="grid grid-cols-3 gap-3 p-3 bg-gray-100 rounded-md border border-gray-200">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Frequency</label>
                                                            <select
                                                                className="w-full text-xs p-1.5 border border-gray-300 rounded bg-white outline-none"
                                                                value={quickTask.recurrence.frequency}
                                                                onChange={(e) => setQuickTask({
                                                                    ...quickTask,
                                                                    recurrence: { ...quickTask.recurrence, frequency: e.target.value }
                                                                })}
                                                            >
                                                                <option value="daily">Daily</option>
                                                                <option value="weekly">Weekly</option>
                                                                <option value="monthly">Monthly</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Repeat Every</label>
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    className="w-full text-xs p-1.5 border border-gray-300 rounded bg-white outline-none"
                                                                    value={quickTask.recurrence.interval}
                                                                    onChange={(e) => setQuickTask({
                                                                        ...quickTask,
                                                                        recurrence: { ...quickTask.recurrence, interval: e.target.value }
                                                                    })}
                                                                />
                                                                <span className="text-[10px] text-gray-500">
                                                                    {quickTask.recurrence.frequency === 'daily' ? 'days' :
                                                                        quickTask.recurrence.frequency === 'weekly' ? 'wks' : 'mths'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">End Date</label>
                                                            <input
                                                                type="date"
                                                                required={quickTask.recurrence.isRecurring}
                                                                className="w-full text-xs p-1.5 border border-gray-300 rounded bg-white outline-none"
                                                                value={quickTask.recurrence.endDate}
                                                                onChange={(e) => setQuickTask({
                                                                    ...quickTask,
                                                                    recurrence: { ...quickTask.recurrence, endDate: e.target.value }
                                                                })}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex justify-end gap-2 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAddingTask(false)}
                                                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                                                >
                                                    Save Task
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>


                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            {tasks.length === 0 ? (
                                <p className="text-center text-gray-400 py-10">All caught up!</p>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {tasks.map(task => (
                                        <div key={task.id} className="group hover:bg-gray-50 transition-colors">
                                            {/* Task Row */}
                                            <div
                                                className={`grid grid-cols-12 gap-4 items-center px-6 py-3 ${isTodayLeave ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                                onClick={() => !isTodayLeave && toggleTaskExpand(task)}
                                            >
                                                <div className="col-span-5 flex items-center gap-3 overflow-hidden">
                                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getTaskStatusColor(task.planned_date, task.is_completed, task.completed_date).dot}`}></div>
                                                    <TaskTooltip task={task}>
                                                        <span className={`truncate text-sm font-bold block ${getTaskStatusColor(task.planned_date, task.is_completed, task.completed_date).text}`}>
                                                            {task.task_content}
                                                        </span>
                                                    </TaskTooltip>
                                                </div>
                                                <div className="col-span-2 text-right text-xs font-medium text-gray-500">
                                                    {task.eta ? `${task.eta}m` : '-'}
                                                </div>
                                                <div className="col-span-3 text-right text-xs font-medium text-gray-500">
                                                    {new Date(task.planned_date).toLocaleDateString()}
                                                </div>
                                                <div className="col-span-2 flex justify-center">
                                                    {isEditable(task) && !isTodayLeave && (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={(e) => handleEditTaskClick(task, e)}
                                                                className="p-1 text-gray-300 hover:text-indigo-600 transition-colors"
                                                                title="Edit Task"
                                                            >
                                                                <Pencil size={13} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteTaskClick(task.id, e)}
                                                                className="p-1 text-gray-300 hover:text-red-600 transition-colors"
                                                                title="Delete Task"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Dropdown Content */}
                                            {expandedTaskId === task.id && (
                                                <div className="px-6 pb-4 bg-gray-50/50 border-t border-gray-100">
                                                    <form onSubmit={(e) => handleLogWork(e, task)} className="mt-4 space-y-3 max-w-lg">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-xs font-bold text-gray-500 uppercase">Log Task Completion</h4>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-700 mb-1">Time Spent (Mins)</label>
                                                                <input
                                                                    type="number"
                                                                    required
                                                                    placeholder="e.g. 60"
                                                                    className="w-full text-sm p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 bg-white"
                                                                    value={logForm.duration}
                                                                    onChange={(e) => setLogForm(prev => ({ ...prev, duration: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div className="flex items-end">
                                                                <button
                                                                    type="submit"
                                                                    disabled={isSubmitting}
                                                                    className="w-full text-sm bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                                                                >
                                                                    {isSubmitting ? 'Saving...' : 'Log & Complete'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <textarea
                                                                placeholder="Remarks (Optional)"
                                                                className="w-full text-sm p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500 bg-white h-32"
                                                                value={logForm.remarks}
                                                                onChange={(e) => setLogForm(prev => ({ ...prev, remarks: e.target.value }))}
                                                            />
                                                        </div>
                                                    </form>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div >
            </div >
            {/* Edit Task Modal */}
            {showEditTaskModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 m-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">{editingTaskData.id ? 'Edit Task' : 'Create Task'}</h3>
                            <button onClick={() => setShowEditTaskModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateTaskSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    required
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={editingTaskData.date}
                                    onChange={(e) => setEditingTaskData({ ...editingTaskData, date: e.target.value })}
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Link Framework (Strategy)</label>
                                <select
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    value={editingTaskData.frameworkId}
                                    onChange={(e) => setEditingTaskData({ ...editingTaskData, frameworkId: e.target.value })}
                                >
                                    <option value="">-- No Framework --</option>
                                    {allocations.map(fw => (
                                        <option key={fw.id} value={fw.id}>{fw.category_name} ({fw.percentage}%)</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Task Description <span className="text-red-500">*</span></label>
                                <textarea
                                    autoFocus
                                    required
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                                    value={editingTaskData.content}
                                    onChange={(e) => setEditingTaskData({ ...editingTaskData, content: e.target.value })}
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">ETA (Minutes) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={editingTaskData.eta}
                                    onChange={(e) => setEditingTaskData({ ...editingTaskData, eta: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEditTaskModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div >
    );
};


export default Dashboard;
