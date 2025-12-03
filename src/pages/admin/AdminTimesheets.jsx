import React, { useState, useEffect } from 'react';
import { getTimesheets, saveTimesheet } from '../../services/timesheetService';
import { ChevronDown, ChevronUp, Search, Filter, Download, Calendar, Clock, X } from 'lucide-react';
import clsx from 'clsx';

const AdminTimesheets = () => {
    const [timesheets, setTimesheets] = useState([]);
    const [groupedData, setGroupedData] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [adminRemarks, setAdminRemarks] = useState({}); // { [date_employeeId]: 'remark' }
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        fetchTimesheets();
    }, []);

    const fetchTimesheets = async () => {
        const data = await getTimesheets();
        setTimesheets(data);

        // Group by employee
        const grouped = data.reduce((acc, sheet) => {
            const empId = sheet.employee_id;
            if (!acc[empId]) {
                acc[empId] = {
                    id: empId,
                    name: sheet.employee_name || 'Unknown',
                    sheets: []
                };
            }
            acc[empId].sheets.push({
                ...sheet,
                totalHours: (sheet.entries || []).reduce((sum, entry) => {
                    if (!entry.startTime || !entry.endTime) return sum;
                    const start = parseInt(entry.startTime.split(':')[0]);
                    const end = parseInt(entry.endTime.split(':')[0]);
                    return sum + (end - start);
                }, 0)
            });
            return acc;
        }, {});

        // Sort sheets by date desc
        Object.values(grouped).forEach(emp => {
            emp.sheets.sort((a, b) => new Date(b.date) - new Date(a.date));
        });

        setGroupedData(grouped);
        setLoading(false);
    };

    const handleSaveRemark = async (sheet, currentRemark) => {
        await saveTimesheet({
            ...sheet,
            adminRemarks: currentRemark
        });
        // Refresh data to ensure sync
        fetchTimesheets();
        alert('Remarks saved successfully');
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

    const filteredEmployees = Object.values(groupedData).filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedEmployee) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <button
                    onClick={() => setSelectedEmployee(null)}
                    className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 mb-6 transition-colors"
                >
                    <X size={20} /> Back to Employees
                </button>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl">
                        {selectedEmployee.name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{selectedEmployee.name}</h1>
                        <p className="text-gray-500">Employee ID: {selectedEmployee.id}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {selectedEmployee.sheets.map(sheet => (
                        <div key={sheet.date} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 font-medium text-gray-900">
                                        <Calendar size={18} className="text-indigo-600" />
                                        {sheet.date}
                                    </div>
                                    <span className="text-sm text-gray-500">Total: {sheet.totalHours || 0} hrs</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={clsx(
                                        "px-2.5 py-0.5 rounded-full text-xs font-medium",
                                        sheet.status === 'submitted' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                                    )}>
                                        {sheet.status === 'submitted' ? 'Submitted' : 'Draft'}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Entries Table */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Work Log</h3>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 text-gray-500">
                                                <tr>
                                                    <th className="px-4 py-2 w-32">Time</th>
                                                    <th className="px-4 py-2">Description</th>
                                                    <th className="px-4 py-2 w-24">Duration</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {sheet.entries && sheet.entries.length > 0 ? (
                                                    sheet.entries.map(entry => (
                                                        <tr key={entry.id}>
                                                            <td className="px-4 py-3 text-gray-900 font-medium">{entry.startTime} - {entry.endTime}</td>
                                                            <td className="px-4 py-3 text-gray-600">
                                                                {entry.description}
                                                                {entry.is_edited == 1 && (
                                                                    <span
                                                                        onClick={() => fetchHistory(entry.id)}
                                                                        className="ml-2 text-xs text-gray-400 italic cursor-pointer hover:text-indigo-600 hover:underline"
                                                                    >
                                                                        (Edited)
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-500">{entry.duration} hrs</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="3" className="px-4 py-3 text-center text-gray-400">No entries logged.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Admin Remarks */}
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                        <MessageSquare size={14} /> Admin Remarks
                                    </h3>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Add remarks for this day..."
                                            defaultValue={sheet.adminRemarks || ''}
                                            onBlur={(e) => handleSaveRemark(sheet, e.target.value)}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Click outside to save automatically.</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Employee Timesheets</h1>
                    <p className="text-gray-500">Select an employee to view detailed logs.</p>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search employee..."
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEmployees.map(emp => (
                    <div
                        key={emp.id}
                        onClick={() => setSelectedEmployee(emp)}
                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                {emp.name.charAt(0)}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                <ChevronRight size={20} />
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-1">{emp.name}</h3>
                        <p className="text-sm text-gray-500 mb-4">ID: {emp.id}</p>

                        <div className="flex items-center gap-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-indigo-500" />
                                <span>{emp.sheets.length} Days Logged</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

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
        </div>
    );
};

export default AdminTimesheets;
