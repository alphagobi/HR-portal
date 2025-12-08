import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import clsx from 'clsx';

const AdminCalendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        type: 'holiday', // holiday, event, meeting
        is_holiday: true,
        description: ''
    });

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/calendar.php');
            if (response.ok) {
                const data = await response.json();
                setEvents(data);
            }
        } catch (error) {
            console.error("Failed to fetch calendar events", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDateClick = (day) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr);

        // Check if event exists
        const existingEvent = events.find(e => e.date === dateStr);
        if (existingEvent) {
            setFormData({
                id: existingEvent.id,
                title: existingEvent.title,
                type: existingEvent.type,
                is_holiday: existingEvent.is_holiday == 1,
                description: existingEvent.description || ''
            });
        } else {
            setFormData({
                title: '',
                type: 'holiday',
                is_holiday: true,
                description: ''
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const method = formData.id ? 'PUT' : 'POST';
            const url = formData.id ? `/api/calendar.php?id=${formData.id}` : '/api/calendar.php';

            const payload = {
                ...formData,
                date: selectedDate,
                is_holiday: formData.is_holiday ? 1 : 0
            };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setShowModal(false);
                fetchEvents();
            } else {
                alert("Failed to save event");
            }
        } catch (error) {
            console.error("Error saving event", error);
        }
    };

    const handleDelete = async () => {
        if (!formData.id) return;
        if (!window.confirm("Delete this event?")) return;

        try {
            const response = await fetch(`/api/calendar.php?id=${formData.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setShowModal(false);
                fetchEvents();
            }
        } catch (error) {
            console.error("Error deleting event", error);
        }
    };

    const renderCalendar = () => {
        const blanks = Array(firstDay).fill(null);
        const daysArray = Array.from({ length: days }, (_, i) => i + 1);
        const allSlots = [...blanks, ...daysArray];

        return (
            <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-500 uppercase">
                        {day}
                    </div>
                ))}
                {allSlots.map((day, index) => {
                    if (!day) return <div key={`blank-${index}`} className="bg-white min-h-[100px]" />;

                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayEvents = events.filter(e => e.date === dateStr);
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;

                    return (
                        <div
                            key={day}
                            onClick={() => handleDateClick(day)}
                            className={clsx(
                                "bg-white min-h-[100px] p-2 hover:bg-gray-50 cursor-pointer transition-colors relative group",
                                isToday && "bg-blue-50"
                            )}
                        >
                            <span className={clsx(
                                "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                                isToday ? "bg-indigo-600 text-white" : "text-gray-700"
                            )}>
                                {day}
                            </span>

                            <div className="mt-1 space-y-1">
                                {dayEvents.map(event => (
                                    <div
                                        key={event.id}
                                        className={clsx(
                                            "text-xs p-1 rounded truncate",
                                            event.type === 'holiday' ? "bg-red-100 text-red-700" :
                                                event.type === 'meeting' ? "bg-blue-100 text-blue-700" :
                                                    "bg-green-100 text-green-700"
                                        )}
                                        title={event.title}
                                    >
                                        {event.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Company Calendar</h1>
                    <p className="text-gray-500">Manage holidays and company events.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-md text-gray-600">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="px-4 font-medium text-gray-900 min-w-[140px] text-center">
                            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-md text-gray-600">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading calendar...</div>
            ) : renderCalendar()}

            {/* Event Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 m-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">
                                {formData.id ? 'Edit Event' : 'Add Event'} - {selectedDate}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                        <select
                                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="holiday">Holiday</option>
                                            <option value="event">Event</option>
                                            <option value="meeting">Meeting</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center pt-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_holiday}
                                                onChange={(e) => setFormData({ ...formData, is_holiday: e.target.checked })}
                                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-gray-700">Is Holiday?</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between mt-6">
                                {formData.id ? (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                                    >
                                        <Trash2 size={18} /> Delete
                                    </button>
                                ) : <div></div>}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCalendar;
