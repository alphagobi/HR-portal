import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getTasks, updateTask, createTask } from '../services/taskService';
import { saveTimesheet, getTimesheets } from '../services/timesheetService';
import { getFrameworkAllocations } from '../services/frameworkService';
import { getCurrentUser } from '../services/authService';
import { Clock, CheckCircle, ChevronDown, ChevronUp, Calendar, Plus, Pencil, X, Save, GripVertical, Trash2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { saveFrameworkAllocations } from '../services/frameworkService';
import { getTaskStatusColor } from '../utils/taskUtils';

// Moved SortableItem outside to prevent re-mounting on every render (Focus Loss Fix)
const SortableItem = ({ id, item, index, onRemove, onUpdate }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3 mb-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm group">
            <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-indigo-500 p-1">
                <GripVertical size={18} />
            </div>
            <input
                type="text"
                value={item.category_name}
                onChange={(e) => onUpdate(index, 'category_name', e.target.value)}
                className="flex-1 text-sm bg-transparent border-b border-transparent focus:border-indigo-300 focus:ring-0 p-1 font-medium text-gray-700 placeholder-gray-400 transition-colors"
                placeholder="Category Name"
            />
            <div className="flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200 min-w-[4.5rem] shadow-inner">
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
            <button onClick={() => onRemove(index)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                <Trash2 size={18} />
            </button>
        </div>
    );
};

const Dashboard = () => {
    const location = useLocation();
    const [loading, setLoading] = useState(true);

    // Tasks State
    const [tasks, setTasks] = useState([]);
    const [loggedEntries, setLoggedEntries] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [frameworkTotal, setFrameworkTotal] = useState(0);
    const [isEditingFramework, setIsEditingFramework] = useState(false);
    const [tempAllocations, setTempAllocations] = useState([]);

    // Logging State (Dropdown/Inline)
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [logForm, setLogForm] = useState({
        duration: '',
        remarks: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const fetchDashboardData = async () => {
        if (!user?.id) return;

        try {
            // 1. Fetch All Tasks
            const allTasks = await getTasks(user.id);
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

        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };



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
            const currentEntries = todaySheet ? todaySheet.entries.filter(e => e.is_deleted != 1) : [];

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
            const total = tempAllocations.reduce((sum, item) => sum + parseInt(item.percentage || 0), 0);
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

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 lg:space-y-8 font-sans">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-2">
                {/* Left Column (5/12 width) - Framework & Logged Tasks */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Widget 1: Framework Allocations */}
                    <div className="bg-white p-5 lg:p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col min-h-[250px] lg:h-[280px]">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-2">
                            <h2 className="text-lg font-bold text-gray-800">Framework</h2>
                            {!isEditingFramework && (
                                <button onClick={() => setIsEditingFramework(true)} className="p-2 -mr-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all">
                                    <Pencil size={16} />
                                </button>
                            )}
                        </div>

                        {!isEditingFramework ? (
                            <div className="flex-1 overflow-y-auto space-y-3 lg:space-y-4 no-scrollbar">
                                {allocations.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm ${['bg-indigo-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'][idx % 4]}`}></div>
                                            <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">{item.category_name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">{item.percentage}%</span>
                                        </div>
                                    </div>
                                ))}
                                {frameworkTotal < 100 && (
                                    <div className="flex justify-between items-center opacity-75">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gray-300"></div>
                                            <span className="text-sm font-semibold text-gray-500">Unplanned</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">{100 - frameworkTotal}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50 -mx-4 -mb-4 p-4 rounded-b-2xl">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ordering</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleSaveFramework()} className="text-white bg-green-500 hover:bg-green-600 p-1.5 rounded-lg shadow-sm transition-colors" title="Save">
                                            <Save size={16} />
                                        </button>
                                        <button onClick={() => { setIsEditingFramework(false); setTempAllocations(allocations); }} className="text-gray-500 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Cancel">
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

                                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                                    <button onClick={handleAddAllocation} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                                        <Plus size={14} /> Add Category
                                    </button>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${tempAllocations.reduce((sum, i) => sum + (parseInt(i.percentage) || 0), 0) > 100 ? "text-red-600 bg-red-50" : "text-gray-500 bg-gray-100"}`}>
                                        Total: {tempAllocations.reduce((sum, i) => sum + (parseInt(i.percentage) || 0), 0)}%
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Widget 2: Logged Today */}
                    <div className="bg-white p-5 lg:p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col lg:h-[calc(100vh-450px)] min-h-[350px]">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-2 flex-shrink-0">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Clock size={20} className="text-indigo-600" />
                                Logged Today
                            </h2>
                            <span className="text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg">
                                {loggedEntries.reduce((acc, curr) => acc + parseFloat(curr.duration || 0), 0).toFixed(2)} hrs
                            </span>
                        </div>
                        <div className="space-y-2 flex-1 overflow-y-auto scroll-smooth pr-1 no-scrollbar">
                            {loggedEntries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-6 text-gray-300">
                                    <Clock size={48} strokeWidth={1.5} className="mb-3 opacity-50" />
                                    <p className="text-sm font-medium">No work logged yet</p>
                                </div>
                            ) : (
                                loggedEntries.map((entry, index) => {
                                    const task = tasks.find(t => t.id == entry.taskId) || tasks.find(t => t.task_content === entry.description);
                                    const color = getTaskStatusColor(task?.planned_date, task?.is_completed);

                                    return (
                                        <div key={index} className="flex justify-between items-center text-sm group hover:bg-gray-50 p-3 rounded-xl border border-transparent hover:border-gray-100 transition-all duration-200">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors shadow-sm ${color.dot}`}></div>
                                                <span className={`font-medium truncate transition-colors ${color.text}`}>
                                                    {entry.description || "Work Logged"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 pl-3">
                                                <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">{entry.duration}h</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column (7/12 width) - Tasks List */}
                <div className="lg:col-span-7">
                    <div className="bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col lg:h-[calc(100vh-170px)] min-h-[500px]">
                        {/* Fixed height to match approx height of left column items */}
                        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h2 className="text-xl font-bold text-gray-900">Your Tasks</h2>
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                {/* Red - Overdue */}
                                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg flex-1 sm:flex-none text-center ${counts.overdue > 0 ? 'text-red-700 bg-red-100' : 'text-gray-400 bg-gray-50'}`}>
                                    {counts.overdue} Red
                                </span>
                                {/* Yellow - Due Today */}
                                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg flex-1 sm:flex-none text-center ${counts.dueToday > 0 ? 'text-yellow-700 bg-yellow-100' : 'text-gray-400 bg-gray-50'}`}>
                                    {counts.dueToday} Yellow
                                </span>
                                {/* Green - Future */}
                                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg flex-1 sm:flex-none text-center ${counts.future > 0 ? 'text-green-700 bg-green-100' : 'text-gray-400 bg-gray-50'}`}>
                                    {counts.future} Green
                                </span>
                            </div>
                        </div>

                        {/* Task List Header - Hidden on Mobile */}
                        <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/80 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <div className="col-span-6">Task</div>
                            <div className="col-span-3 text-right">ETA</div>
                            <div className="col-span-3 text-right">Due Date</div>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar p-2 sm:p-0">
                            {tasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                    <CheckCircle size={48} className="mb-4 text-green-100" />
                                    <p className="font-medium">All caught up!</p>
                                </div>
                            ) : (
                                <div className="space-y-2 sm:space-y-0 sm:divide-y divide-gray-50">
                                    {tasks.map(task => (
                                        <div key={task.id} className="group hover:bg-gray-50 transition-colors bg-white border border-gray-100 sm:border-0 rounded-xl sm:rounded-none shadow-sm sm:shadow-none overflow-hidden">
                                            {/* Task Row */}
                                            <div
                                                className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-4 items-start sm:items-center cursor-pointer px-4 lg:px-6 py-4"
                                                onClick={() => toggleTaskExpand(task)}
                                            >
                                                <div className="sm:col-span-6 flex items-center gap-3 w-full">
                                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm ${getTaskStatusColor(task.planned_date).dot}`}></div>
                                                    <span className={`truncate text-sm font-bold flex-1 ${getTaskStatusColor(task.planned_date).text}`}>
                                                        {task.task_content}
                                                    </span>
                                                </div>
                                                <div className="flex w-full sm:col-span-6 justify-between sm:justify-end gap-4 mt-1 sm:mt-0 pl-6 sm:pl-0 border-t sm:border-0 border-gray-50 pt-2 sm:pt-0">
                                                    <div className="flex items-center gap-1 sm:justify-end sm:col-span-3">
                                                        <span className="sm:hidden text-xs text-gray-400 uppercase font-bold mr-1">ETA:</span>
                                                        <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                                                            {task.eta ? `${task.eta}m` : '-'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 sm:justify-end sm:col-span-3">
                                                        <span className="sm:hidden text-xs text-gray-400 uppercase font-bold mr-1">Due:</span>
                                                        <span className="text-xs font-semibold text-gray-600">
                                                            {new Date(task.planned_date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Dropdown Content */}
                                            {expandedTaskId === task.id && (
                                                <div className="px-4 lg:px-6 pb-6 bg-gray-50/50 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                                    <form onSubmit={(e) => handleLogWork(e, task)} className="mt-4 space-y-4 max-w-lg">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Log & Complete</h4>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Time Spent (Mins)</label>
                                                                <input
                                                                    type="number"
                                                                    required
                                                                    placeholder="e.g. 60"
                                                                    className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all shadow-sm outline-none"
                                                                    value={logForm.duration}
                                                                    onChange={(e) => setLogForm(prev => ({ ...prev, duration: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div className="flex items-end">
                                                                <button
                                                                    type="submit"
                                                                    disabled={isSubmitting}
                                                                    className="w-full text-sm bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-70 disabled:hover:shadow-md"
                                                                >
                                                                    {isSubmitting ? 'Saving...' : 'Complete Task'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Remarks (Optional)</label>
                                                            <textarea
                                                                placeholder="Any notes about this task..."
                                                                className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white h-20 resize-none transition-all shadow-sm outline-none"
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
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
