import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Grid, Info } from 'lucide-react';
import clsx from 'clsx';

const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    useEffect(() => {
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

    const getMonthEvents = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
        return events.filter(e => e.date.startsWith(monthPrefix)).sort((a, b) => a.date.localeCompare(b.date));
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
                    if (!day) return <div key={`blank-${index}`} className="bg-white min-h-[120px]" />;

                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayEvents = events.filter(e => e.date === dateStr);
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;
                    const isHoliday = dayEvents.some(e => e.type === 'holiday');

                    return (
                        <div
                            key={day}
                            className={clsx(
                                "min-h-[120px] p-2 relative group border-t border-transparent hover:z-10",
                                isHoliday ? "bg-red-50" : "bg-white",
                                isToday && !isHoliday && "bg-blue-50"
                            )}
                        >
                            <span className={clsx(
                                "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                                isToday ? "bg-indigo-600 text-white" : isHoliday ? "text-red-700 font-bold" : "text-gray-700"
                            )}>
                                {day}
                            </span>

                            <div className="space-y-1">
                                {dayEvents.map(event => (
                                    <div
                                        key={event.id}
                                        className={clsx(
                                            "text-xs p-1.5 rounded border mb-1 group/event relative",
                                            event.type === 'holiday' ? "bg-red-100 text-red-800 border-red-200" :
                                                event.type === 'meeting' ? "bg-blue-100 text-blue-800 border-blue-200" :
                                                    "bg-green-100 text-green-800 border-green-200"
                                        )}
                                    >
                                        <div className="font-semibold">{event.title}</div>
                                        {event.description && (
                                            <div className="text-[10px] opacity-80 mt-0.5 line-clamp-2">
                                                {event.description}
                                            </div>
                                        )}

                                        {/* Full description on hover for longer texts */}
                                        {event.description && (
                                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover/event:block w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-50">
                                                {event.description}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderListView = () => {
        const monthEvents = getMonthEvents();

        if (monthEvents.length === 0) {
            return (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p>No events scheduled for this month.</p>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                    {monthEvents.map(event => (
                        <div key={event.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4">
                            <div className={clsx(
                                "flex-shrink-0 w-16 text-center py-2 rounded-lg border",
                                event.type === 'holiday' ? "bg-red-50 border-red-100 text-red-700" : "bg-blue-50 border-blue-100 text-blue-700"
                            )}>
                                <span className="block text-xs uppercase font-bold tracking-wider opacity-75">
                                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                                </span>
                                <span className="block text-xl font-bold">
                                    {new Date(event.date).getDate()}
                                </span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide",
                                        event.type === 'holiday' ? "bg-red-100 text-red-700" :
                                            event.type === 'meeting' ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                                    )}>
                                        {event.type}
                                    </span>
                                </div>
                                {event.description && (
                                    <p className="text-sm text-gray-600">{event.description}</p>
                                )}
                                <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                                    <CalendarIcon size={12} />
                                    {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Company Calendar</h1>
                    <p className="text-gray-500">View upcoming holidays and events.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={clsx(
                                "p-2 rounded-md transition-colors flex items-center gap-2 text-sm font-medium",
                                viewMode === 'grid' ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            <Grid size={18} /> <span className="hidden sm:inline">Grid View</span>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={clsx(
                                "p-2 rounded-md transition-colors flex items-center gap-2 text-sm font-medium",
                                viewMode === 'list' ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            <List size={18} /> <span className="hidden sm:inline">List View</span>
                        </button>
                    </div>

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
            ) : (
                viewMode === 'grid' ? renderCalendar() : renderListView()
            )}
        </div>
    );
};

export default Calendar;
