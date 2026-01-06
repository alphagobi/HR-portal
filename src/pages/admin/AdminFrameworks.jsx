import React, { useState, useEffect } from 'react';
import { getAllFrameworkAllocations } from '../../services/frameworkService';
import { getAllUsers } from '../../services/authService';
import { getAllUsers } from '../../services/authService';
import { getUserSetting, saveUserSetting } from '../../services/userSettingsService';
import { clsx } from 'clsx';
import { LayoutTemplate, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const AdminFrameworks = () => {
    const [activeTab, setActiveTab] = useState('frameworks'); // 'frameworks' | 'core_hours'
    const [frameworks, setFrameworks] = useState([]);
    const [coreHoursData, setCoreHoursData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeTab === 'frameworks') {
            fetchFrameworks();
        } else {
            fetchCoreHours();
        }
    }, [activeTab]);

    const fetchFrameworks = async () => {
        setLoading(true);
        try {
            const data = await getAllFrameworkAllocations();
            setFrameworks(data);
        } catch (error) {
            console.error("Failed to fetch frameworks", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCoreHours = async () => {
        setLoading(true);
        try {
            const users = await getAllUsers();
            // Fetch core hours for each user - Optimization: Could be a bulk API, but parallel fetch is ok for small teams
            const dataPromises = users.map(async (user) => {
                if (user.email === 'admin@company.com') return null; // Skip admin
                const settings = await getUserSetting(user.id, 'core_working_hours'); // Use consistent key
                const request = await getUserSetting(user.id, 'core_hours_request');
                return {
                    user,
                    settings,
                    request
                };
            });
            const results = await Promise.all(dataPromises);
            setCoreHoursData(results.filter(Boolean));
        } catch (error) {
            console.error("Failed to fetch core hours", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (user, requestData) => {
        if (!window.confirm(`Approve core hours update for ${user.name}?`)) return;
        try {
            // 1. Move request to active
            await saveUserSetting(user.id, 'core_working_hours', requestData); // Key matching Dashboard.jsx
            // 2. Clear request
            await saveUserSetting(user.id, 'core_hours_request', null);
            // 3. Refresh
            fetchCoreHours();
        } catch (error) {
            console.error("Failed to approve", error);
            alert("Failed to approve request.");
        }
    };

    const handleReject = async (user) => {
        if (!window.confirm(`Reject core hours update for ${user.name}?`)) return;
        try {
            // 1. Clear request
            await saveUserSetting(user.id, 'core_hours_request', null);
            // 2. Refresh
            fetchCoreHours();
        } catch (error) {
            console.error("Failed to reject", error);
            alert("Failed to reject request.");
        }
    };

    return (
        <div className="p-6 max-w-full mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {activeTab === 'frameworks' ? 'Team Frameworks' : 'Team Core Hours'}
                    </h1>
                    <p className="text-gray-500">
                        {activeTab === 'frameworks' ? 'Overview of employee framework allocations.' : 'Overview of employee working schedules.'}
                    </p>
                </div>

                {/* Tab Toggle */}
                <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
                    <button
                        onClick={() => setActiveTab('frameworks')}
                        className={clsx(
                            "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                            activeTab === 'frameworks'
                                ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                        )}
                    >
                        <LayoutTemplate size={16} />
                        Frameworks
                    </button>
                    <button
                        onClick={() => setActiveTab('core_hours')}
                        className={clsx(
                            "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                            activeTab === 'core_hours'
                                ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                        )}
                    >
                        <Clock size={16} />
                        Core Hours
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="p-8 text-center text-gray-500">Loading data...</div>
            ) : (
                <>
                    {/* FRAMEWORKS VIEW */}
                    {activeTab === 'frameworks' && (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.values(frameworks.reduce((acc, item) => {
                                    // Skip admin users
                                    if (item.role === 'admin') return acc;

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

                    {/* CORE HOURS VIEW */}
                    {activeTab === 'core_hours' && (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {coreHoursData.map(({ user, settings, request }) => {
                                    // Use request data if available (Pending Mode), else active settings
                                    const displaySettings = request || settings;
                                    const isPending = !!request;

                                    return (
                                        <div key={user.id} className={clsx("border rounded-lg p-5 hover:shadow-md transition-shadow relative",
                                            isPending ? "border-orange-200 bg-orange-50/30" : "border-gray-200"
                                        )}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg">{user.name}</h3>
                                                    <p className="text-sm text-gray-500">{user.designation || user.department || 'Employee'}</p>
                                                </div>
                                                {isPending && (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                                                        <AlertCircle size={12} /> Pending Approval
                                                    </span>
                                                )}
                                            </div>

                                            {!displaySettings ? (
                                                <div className="bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
                                                    <p className="text-sm text-gray-400">No schedule set</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {/* Days */}
                                                    <div>
                                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                                            {isPending ? 'Requested Days' : 'Working Days'}
                                                        </h4>
                                                        <div className="flex gap-1.5 flex-wrap">
                                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                                <div
                                                                    key={day}
                                                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${displaySettings.working_days.includes(day)
                                                                            ? (isPending ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-200' : 'bg-green-100 text-green-700')
                                                                            : 'bg-gray-100 text-gray-300'
                                                                        }`}
                                                                >
                                                                    {day.charAt(0)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Slots */}
                                                    <div>
                                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                                            {isPending ? 'Requested Shifts' : 'Time Slots'}
                                                        </h4>
                                                        <div className="space-y-1.5">
                                                            {displaySettings.working_slots && displaySettings.working_slots.length > 0 ? (
                                                                displaySettings.working_slots.map((slot, idx) => (
                                                                    <div key={idx} className="bg-gray-50 px-3 py-1.5 rounded text-sm text-gray-700 font-medium flex justify-between border border-gray-100">
                                                                        <span>{slot.start}</span>
                                                                        <span className="text-gray-400">-</span>
                                                                        <span>{slot.end}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="text-xs text-gray-400 italic">No slots defined</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Approval Actions */}
                                                    {isPending && (
                                                        <div className="pt-4 border-t border-orange-200 flex gap-2">
                                                            <button
                                                                onClick={() => handleApprove(user, request)}
                                                                className="flex-1 bg-green-600 text-white py-1.5 rounded text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                                                            >
                                                                <CheckCircle size={14} /> Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(user)}
                                                                className="flex-1 bg-white border border-red-200 text-red-600 py-1.5 rounded text-sm font-medium hover:bg-red-50 flex items-center justify-center gap-2"
                                                            >
                                                                <XCircle size={14} /> Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminFrameworks;
