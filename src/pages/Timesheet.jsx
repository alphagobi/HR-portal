
import React, { useState, useEffect } from 'react';
import { getTimesheets } from '../services/timesheetService';
import { getCurrentUser } from '../services/authService';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import clsx from 'clsx';

const Timesheet = () => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [timesheets, setTimesheets] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTimesheets = async () => {
        setLoading(true);
        try {
            const user = getCurrentUser();
            const data = await getTimesheets(user ? user.id : null);
            setTimesheets(data);
        } catch (error) {
            console.error("Failed to fetch timesheets", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTimesheets();
    }, []);

    // Filter by month
    const filteredTimesheets = timesheets.filter(t => t.date.startsWith(selectedMonth));

    // Calculate stats
    const totalHours = filteredTimesheets.reduce((acc, sheet) => {
        const sheetTotal = sheet.entries.reduce((sAcc, entry) => sAcc + parseFloat(entry.duration || 0), 0);
        return acc + sheetTotal;
    }, 0);

    const plannedHours = filteredTimesheets.reduce((acc, sheet) => {
        const sheetTotal = sheet.entries.filter(e => e.type === 'planned').reduce((sAcc, entry) => sAcc + parseFloat(entry.duration || 0), 0);
        return acc + sheetTotal;
    }, 0);

    const unplannedHours = totalHours - plannedHours;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Timesheet History</h1>
                    <p className="text-gray-500">View your logged work history.</p>
                </div>
                <div className="flex items-center gap-4">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium">Total Hours</p>
                    <h3 className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-green-600 font-medium">Planned Hours</p>
                    <h3 className="text-2xl font-bold text-green-700">{plannedHours.toFixed(1)}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-orange-600 font-medium">Unplanned Hours</p>
                    <h3 className="text-2xl font-bold text-orange-700">{unplannedHours.toFixed(1)}</h3>
                </div>
            </div>

            {/* History List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading history...</div>
                ) : filteredTimesheets.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No entries found for this month.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredTimesheets.sort((a, b) => new Date(b.date) - new Date(a.date)).map(sheet => (
                            <div key={sheet.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <Calendar size={18} className="text-indigo-600" />
                                        {new Date(sheet.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </h3>
                                    <span className="text-sm font-medium text-gray-500">
                                        {sheet.entries.reduce((acc, e) => acc + parseFloat(e.duration || 0), 0)} hrs
                                    </span>
                                </div>

                                <div className="space-y-2 pl-6 border-l-2 border-gray-100">
                                    {sheet.entries.filter(e => e.is_deleted != 1).map(entry => (
                                        <div key={entry.id} className="flex items-start justify-between text-sm">
                                            <div className="flex-1">
                                                <p className="text-gray-800">{entry.description}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${entry.type === 'planned' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {entry.type === 'planned' ? 'Planned' : 'Unplanned'}
                                                </span>
                                            </div>
                                            <span className="font-medium text-gray-600 whitespace-nowrap ml-4">
                                                {entry.duration} hrs
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Timesheet;
