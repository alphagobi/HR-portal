import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import clsx from 'clsx';

const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

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
                            className={clsx(
                                "bg-white min-h-[100px] p-2 relative group",
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
                    <p className="text-gray-500">View upcoming holidays and events.</p>
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
        </div>
    );
};

export default Calendar;
