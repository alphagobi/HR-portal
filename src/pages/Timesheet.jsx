
import React, { useState, useEffect } from 'react';
import { getTimesheets, saveTimesheet } from '../services/timesheetService';
import { getCurrentUser } from '../services/authService';
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, Table as TableIcon, LayoutList, Pencil, X, Trash2 } from 'lucide-react';
import clsx from 'clsx';

const Timesheet = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'table'
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newEntry, setNewEntry] = useState({ startTime: '09:00', endTime: '', description: '' });

    const [editingId, setEditingId] = useState(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [timesheetMap, setTimesheetMap] = useState({});

    useEffect(() => {
        const fetchTimesheets = async () => {
            try {
                const user = getCurrentUser();
                const data = await getTimesheets(user ? user.id : null);
                // Create a map of date -> timesheet object for easy lookup
                const map = {};
                data.forEach(t => {
                    map[t.date] = t;
                });
                setTimesheetMap(map);

                // For daily view
                const todayData = data.find(t => t.date === selectedDate);
                setEntries(todayData ? todayData.entries : []);
            } catch (error) {
                console.error("Failed to fetch timesheets", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTimesheets();
    }, [selectedDate]);

    // Auto-set start time based on last entry
    useEffect(() => {
        if (editingId) return; // Don't auto-update if editing

        if (entries.length > 0) {
            const lastEntry = entries[entries.length - 1];
            setNewEntry(prev => ({ ...prev, startTime: lastEntry.endTime, endTime: '' }));
        } else {
            setNewEntry(prev => ({ ...prev, startTime: '09:00', endTime: '' }));
        }
    }, [entries, editingId]);

    const handleAddEntry = async () => {
        if (!newEntry.startTime || !newEntry.endTime || !newEntry.description) return;

        const entry = {
            ...newEntry,
            project: 'General',
            id: editingId || Date.now(),
            date: selectedDate
        };

        if (editingId) {
            setEntries(entries.map(e => e.id === editingId ? entry : e));
        } else {
            setEntries([...entries, entry]);
        }

        // Prepare full timesheet data
        const currentTimesheet = timesheetMap[selectedDate] || {};
        const updatedEntries = editingId
            ? entries.map(e => e.id === editingId ? entry : e)
            : [...entries, entry];

        await saveTimesheet({
            date: selectedDate,
            entries: updatedEntries,
            milestone: currentTimesheet.milestone || '',
            taskDescription: currentTimesheet.taskDescription || '',
            comments: currentTimesheet.comments || '',
            status: currentTimesheet.status || 'draft'
        });

        setNewEntry(prev => ({ ...prev, description: '', endTime: '' }));
        setEditingId(null);
    };

    const handleEditEntry = (entry) => {
        setNewEntry({
            startTime: entry.startTime,
            endTime: entry.endTime,
            description: entry.description
        });
        setEditingId(entry.id);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setNewEntry(prev => ({ ...prev, description: '', endTime: '' }));
        // Reset start time logic will trigger via useEffect
    };

    const handleDeleteEntry = async (entryId) => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            setEntries(entries.filter(e => e.id !== entryId));
            const updatedEntries = entries.filter(e => e.id !== entryId);
            setEntries(updatedEntries);

            const currentTimesheet = timesheetMap[selectedDate] || {};
            await saveTimesheet({
                date: selectedDate,
                entries: updatedEntries,
                milestone: currentTimesheet.milestone || '',
                taskDescription: currentTimesheet.taskDescription || '',
                comments: currentTimesheet.comments || '',
                status: currentTimesheet.status || 'draft'
            });
            if (editingId === entryId) {
                handleCancelEdit();
            }
        }
    };

    const addDuration = (minutes) => {
        if (!newEntry.startTime) return;
        const [h, m] = newEntry.startTime.split(':').map(Number);
        const date = new Date();
        date.setHours(h, m, 0, 0);
        date.setMinutes(date.getMinutes() + minutes);
        const endTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        setNewEntry({ ...newEntry, endTime });
    };

    const handleSummaryChange = (date, field, value) => {
        setTimesheetMap(prev => ({
            ...prev,
            [date]: {
                ...prev[date],
                [field]: value
            }
        }));
    };

    const fetchHistory = async (entryId) => {
        setLoadingHistory(true);
        setShowHistoryModal(true);
        try {
            const response = await fetch(`/api/timesheets.php?history_for_entry_id=${entryId}`);
            if (response.ok) {
                const data = await response.json();
                setHistoryData(data);
            }
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSummarySave = async (date) => {
        const data = timesheetMap[date];
        if (data) {
            await saveTimesheet({
                date: date,
                entries: data.entries || [], // Preserve entries
                milestone: data.milestone,
                taskDescription: data.taskDescription,
                comments: data.comments,
                status: data.status || 'draft'
            });
        }
    };

    const totalHours = entries.reduce((acc, curr) => {
        if (!curr.startTime || !curr.endTime) return acc;
        const start = parseInt(curr.startTime.split(':')[0]);
        const end = parseInt(curr.endTime.split(':')[0]);
        return acc + (end - start);
    }, 0);

    // Helper to get all days in the current month
    const getDaysInMonth = (dateString) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = [];
        const lastDay = new Date(year, month + 1, 0).getDate();

        for (let i = 1; i <= lastDay; i++) {
            const d = new Date(year, month, i);
            days.push({
                date: d.toISOString().split('T')[0],
                dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
                isSunday: d.getDay() === 0
            });
        }
        return days;
    };

    const daysInMonth = getDaysInMonth(selectedDate);

    const handlePrevDay = () => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() - 1);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const handleNextDay = () => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + 1);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Timesheet</h1>
                    <p className="text-gray-500">Track your daily work hours and plan ahead.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* View Toggle */}
                    <div className="bg-gray-100 p-1 rounded-lg flex items-center">
                        <button
                            onClick={() => setViewMode('daily')}
                            className={clsx(
                                "p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium",
                                viewMode === 'daily' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <LayoutList size={18} /> Daily
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={clsx(
                                "p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium",
                                viewMode === 'table' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <TableIcon size={18} /> Table
                        </button>
                    </div>

                    {/* Date Navigation */}
                    <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                        <button onClick={handlePrevDay} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ChevronLeft size={20} /></button>
                        <div className="flex items-center gap-2 font-medium text-gray-700">
                            <Calendar size={18} className="text-indigo-600" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none outline-none text-gray-700 font-medium cursor-pointer focus:ring-0"
                            />
                        </div>
                        <button onClick={handleNextDay} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ChevronRight size={20} /></button>
                    </div>
                </div>
            </div>

            {viewMode === 'daily' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Daily Entry Form */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Clock className="text-indigo-600" size={20} />
                                Log Time
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={newEntry.startTime}
                                            onChange={(e) => setNewEntry({ ...newEntry, startTime: e.target.value })}
                                        />
                                        <span className="text-gray-400">-</span>
                                        <input
                                            type="time"
                                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={newEntry.endTime}
                                            onChange={(e) => setNewEntry({ ...newEntry, endTime: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quick Add Duration</label>
                                    <div className="flex gap-2 flex-wrap">
                                        <button
                                            onClick={() => addDuration(5)}
                                            className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                                        >
                                            +5m
                                        </button>
                                        <button
                                            onClick={() => addDuration(15)}
                                            className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                                        >
                                            +15m
                                        </button>
                                        <button
                                            onClick={() => addDuration(30)}
                                            className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                                        >
                                            +30m
                                        </button>
                                        <button
                                            onClick={() => addDuration(60)}
                                            className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                                        >
                                            +1h
                                        </button>
                                        <button
                                            onClick={() => addDuration(120)}
                                            className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                                        >
                                            +2h
                                        </button>
                                        <button
                                            onClick={() => addDuration(240)}
                                            className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                                        >
                                            +4h
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                                    placeholder="What did you work on?"
                                    value={newEntry.description}
                                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleAddEntry}
                                    className={clsx(
                                        "flex-1 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2",
                                        editingId ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                                    )}
                                >
                                    {editingId ? <Pencil size={18} /> : <Plus size={18} />}
                                    {editingId ? "Update Entry" : "Add Entry"}
                                </button>
                                {editingId && (
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Entries List */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-100 font-medium text-gray-700 flex justify-between">
                                <span>Today's Entries</span>
                                <span className="text-indigo-600">Total: {totalHours} hrs</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {entries.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">No entries for this date.</div>
                                ) : (
                                    entries.map((entry) => (
                                        <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="text-sm font-bold text-gray-900">{entry.startTime} - {entry.endTime}</span>
                                                    {entry.is_edited == 1 && (
                                                        <span
                                                            onClick={() => fetchHistory(entry.id)}
                                                            className="text-xs text-gray-400 italic cursor-pointer hover:text-indigo-600 hover:underline"
                                                        >
                                                            (Edited)
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-600 text-sm">{entry.description}</p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => handleEditEntry(entry)}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                                    title="Edit Entry"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteEntry(entry.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                    title="Delete Entry"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Table View */
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 w-32">Date</th>
                                    <th className="px-6 py-4 w-1/4">Milestone / Deliverables</th>
                                    <th className="px-6 py-4">Task Description</th>
                                    <th className="px-6 py-4 w-1/4">Comments</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {daysInMonth.map((day) => {
                                    const dayData = timesheetMap[day.date] || {};
                                    return (
                                        <tr
                                            key={day.date}
                                            className={clsx(
                                                "hover:bg-gray-50 transition-colors",
                                                day.isSunday ? "bg-yellow-100 hover:bg-yellow-200" : "bg-white"
                                            )}
                                        >
                                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                                {day.date}
                                                {day.isSunday && <span className="block text-xs text-yellow-700 font-bold mt-1">SUNDAY</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {day.isSunday ? '' : (
                                                    <input
                                                        type="text"
                                                        className="w-full bg-transparent outline-none border-b border-transparent focus:border-indigo-300 placeholder-gray-400"
                                                        placeholder="Enter milestone..."
                                                        value={dayData.milestone || ''}
                                                        onChange={(e) => handleSummaryChange(day.date, 'milestone', e.target.value)}
                                                        onBlur={() => handleSummarySave(day.date)}
                                                    />
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {day.isSunday ? '' : (
                                                    <input
                                                        type="text"
                                                        className="w-full bg-transparent outline-none border-b border-transparent focus:border-indigo-300 placeholder-gray-400"
                                                        placeholder="Task details..."
                                                        value={dayData.taskDescription || ''}
                                                        onChange={(e) => handleSummaryChange(day.date, 'taskDescription', e.target.value)}
                                                        onBlur={() => handleSummarySave(day.date)}
                                                    />
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {day.isSunday ? '' : (
                                                    <input
                                                        type="text"
                                                        className="w-full bg-transparent outline-none border-b border-transparent focus:border-indigo-300 placeholder-gray-400"
                                                        placeholder="Add comments..."
                                                        value={dayData.comments || ''}
                                                        onChange={(e) => handleSummaryChange(day.date, 'comments', e.target.value)}
                                                        onBlur={() => handleSummarySave(day.date)}
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 m-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Edit History</h3>
                            <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            {loadingHistory ? (
                                <div className="text-center py-4 text-gray-500">Loading history...</div>
                            ) : historyData.length === 0 ? (
                                <div className="text-center py-4 text-gray-500">No history found.</div>
                            ) : (
                                historyData.map((history) => (
                                    <div key={history.id} className="border-b border-gray-100 pb-3 last:border-0">
                                        <div className="text-xs text-gray-400 mb-1">
                                            {new Date(history.changed_at).toLocaleString()}
                                        </div>
                                        <div className="font-medium text-sm text-gray-800">
                                            {history.old_start_time} - {history.old_end_time}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">
                                            {history.old_description}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default Timesheet;
