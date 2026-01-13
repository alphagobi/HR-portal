import React, { useState, useEffect } from 'react';
import { getAllFrameworkAllocations } from '../../services/frameworkService';
import { getAllUsers, updateUser } from '../../services/authService';
import { getUserSetting, saveUserSetting } from '../../services/userSettingsService';
import { clsx } from 'clsx';
import { LayoutTemplate, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';

const AdminFrameworks = () => {
    const [activeTab, setActiveTab] = useState('frameworks'); // 'frameworks' | 'core_hours'
    const [frameworks, setFrameworks] = useState([]);
    const [coreHoursData, setCoreHoursData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState([]);
    const [editingVisibility, setEditingVisibility] = useState({ id: null, type: null }); // type: 'frameworks' | 'core_hours'

    useEffect(() => {
        const loadUsers = async () => {
            const users = await getAllUsers();
            setAllUsers(users);
        };
        loadUsers();
    }, []);

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
            // 1. Save Rejection Status
            await saveUserSetting(user.id, 'core_hours_rejection', {
                rejected_at: new Date().toISOString(),
                rejected_by: 'admin'
            });

            // 2. Clear request
            await saveUserSetting(user.id, 'core_hours_request', null);
            // 3. Refresh
            fetchCoreHours();
        } catch (error) {
            console.error("Failed to reject", error);
            alert("Failed to reject request.");
        }
    };

    const handleVisibilitySave = async (selectedIds, applySame) => {
        if (!editingVisibility.id) return;

        const userId = editingVisibility.id;
        try {
            const userToUpdate = allUsers.find(u => u.id === userId);
            if (!userToUpdate) return;

            // Prepare payload with all existing fields
            let payload = {
                employee_code: userToUpdate.employee_code,
                name: userToUpdate.name,
                email: userToUpdate.email,
                role: userToUpdate.role,
                department: userToUpdate.department,
                designation: userToUpdate.designation,
                informed_leave_limit: userToUpdate.informed_leave_limit,
                emergency_leave_limit: userToUpdate.emergency_leave_limit,
                working_days: JSON.parse(userToUpdate.working_days || '[]'),
                visible_to: userToUpdate.visible_to ? (Array.isArray(userToUpdate.visible_to) ? userToUpdate.visible_to : JSON.parse(userToUpdate.visible_to)) : [],
                visible_to_core_hours: userToUpdate.visible_to_core_hours ? (Array.isArray(userToUpdate.visible_to_core_hours) ? userToUpdate.visible_to_core_hours : JSON.parse(userToUpdate.visible_to_core_hours)) : []
            };

            // key to update
            const targetKey = editingVisibility.type === 'frameworks' ? 'visible_to' : 'visible_to_core_hours';
            payload[targetKey] = selectedIds;

            if (applySame) {
                const otherKey = editingVisibility.type === 'frameworks' ? 'visible_to_core_hours' : 'visible_to';
                payload[otherKey] = selectedIds;
            }

            await updateUser(userId, payload);

            // Refresh Data
            const updatedUsers = await getAllUsers();
            setAllUsers(updatedUsers);
            if (activeTab === 'frameworks') fetchFrameworks(); else fetchCoreHours();

            setEditingVisibility({ id: null, type: null });
        } catch (error) {
            console.error("Failed to update visibility", error);
            alert("Failed to update visibility settings.");
        }
    };

    return (
        <div className="p-6 max-w-full mx-auto relative">
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
                                    // Skip SUPER admin (protected) but show other admins
                                    if (item.email === 'admin@company.com') return acc;

                                    if (!acc[item.user_id]) {
                                        // Need full user object for visibility modal - find in allUsers
                                        const fullUser = allUsers.find(u => u.id === item.user_id) || { id: item.user_id, name: item.employee_name };

                                        acc[item.user_id] = {
                                            id: item.user_id,
                                            user: fullUser, // Store full user
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
                                    <div key={emp.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
                                        {/* Overlay for Visibility Editing */}
                                        {editingVisibility.id === emp.id && editingVisibility.type === 'frameworks' ? (
                                            <div className="relative z-20 bg-white flex flex-col h-full min-h-[350px] animate-in fade-in duration-200">
                                                <h3 className="font-bold text-gray-900 mb-2 text-sm flex justify-between items-center">
                                                    Visibility: {emp.name}
                                                    <button onClick={() => setEditingVisibility({ id: null, type: null })} className="text-gray-400 hover:text-gray-600">
                                                        <XCircle size={16} />
                                                    </button>
                                                </h3>
                                                <div className="flex-1 overflow-y-auto -mx-2 px-2">
                                                    <VisibilityForm
                                                        user={emp.user}
                                                        allUsers={allUsers}
                                                        type="frameworks"
                                                        onSave={handleVisibilitySave}
                                                        onCancel={() => setEditingVisibility({ id: null, type: null })}
                                                        compact={true}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 text-lg">{emp.name}</h3>
                                                        {emp.department && <p className="text-sm text-gray-500">{emp.department}</p>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setEditingVisibility({ id: emp.id, type: 'frameworks' })}
                                                            className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                                            title="Manage Visibility"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <div className={clsx("text-xs font-bold px-2 py-1 rounded-full",
                                                            emp.total > 100 ? "bg-red-100 text-red-700" :
                                                                emp.total === 100 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                                        )}>
                                                            {emp.total}%
                                                        </div>
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
                                            </>
                                        )}
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
                                        <div key={user.id} className={clsx("border rounded-lg p-5 hover:shadow-md transition-shadow relative overflow-hidden",
                                            isPending ? "border-orange-200 bg-orange-50/30" : "border-gray-200"
                                        )}>
                                            {/* Overlay for Visibility Editing */}
                                            {editingVisibility.id === user.id && editingVisibility.type === 'core_hours' ? (
                                                <div className="relative z-20 bg-white flex flex-col h-full min-h-[350px] animate-in fade-in duration-200">
                                                    <h3 className="font-bold text-gray-900 mb-2 text-sm flex justify-between items-center">
                                                        Visibility: {user.name}
                                                        <button onClick={() => setEditingVisibility({ id: null, type: null })} className="text-gray-400 hover:text-gray-600">
                                                            <XCircle size={16} />
                                                        </button>
                                                    </h3>
                                                    <div className="flex-1 overflow-y-auto -mx-2 px-2">
                                                        <VisibilityForm
                                                            user={user}
                                                            allUsers={allUsers}
                                                            type="core_hours"
                                                            onSave={handleVisibilitySave}
                                                            onCancel={() => setEditingVisibility({ id: null, type: null })}
                                                            compact={true}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="font-bold text-gray-900 text-lg">{user.name}</h3>
                                                            <p className="text-sm text-gray-500">{user.designation || user.department || 'Employee'}</p>
                                                        </div>
                                                        <div className="flex gap-2 items-center">
                                                            <button
                                                                onClick={() => setEditingVisibility({ id: user.id, type: 'core_hours' })}
                                                                className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                                                title="Manage Visibility"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            {isPending && (
                                                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                                                                    <AlertCircle size={12} /> Pending Approval
                                                                </span>
                                                            )}
                                                        </div>
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
                                                </>
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

const VisibilityForm = ({ user, allUsers, type, onSave, onCancel, compact }) => {
    // Parse initial selected IDs
    const currentKey = type === 'frameworks' ? 'visible_to' : 'visible_to_core_hours';
    const initialSelected = user[currentKey]
        ? (Array.isArray(user[currentKey]) ? user[currentKey] : JSON.parse(user[currentKey]))
        : [];

    // Safety check - ensure initialSelected is array
    const safeSelected = Array.isArray(initialSelected) ? initialSelected : [];

    const [selectedIds, setSelectedIds] = useState(safeSelected);
    const [applySame, setApplySame] = useState(false);

    const toggleUser = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleAll = () => {
        const potentialIds = allUsers.filter(u => u.id !== user.id).map(u => u.id);
        if (selectedIds.length === potentialIds.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(potentialIds);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className={`flex-1 mb-2 ${compact ? "" : "max-h-60"} overflow-y-auto`}>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Select Users</label>
                    <button type="button" onClick={toggleAll} className="text-xs text-indigo-600 hover:underline">
                        {selectedIds.length === allUsers.filter(u => u.id !== user.id).length ? 'Unselect All' : 'Select All'}
                    </button>
                </div>
                <div className="space-y-1">
                    {allUsers.filter(u => u.id !== user.id).map(u => (
                        <div key={u.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                            <input
                                type="checkbox"
                                id={`v-${u.id}-${type}`}
                                checked={selectedIds.includes(u.id)}
                                onChange={() => toggleUser(u.id)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            />
                            <label htmlFor={`v-${u.id}-${type}`} className="text-sm text-gray-700 cursor-pointer select-none flex-1 truncate">
                                {u.name}
                            </label>
                        </div>
                    ))}
                    {allUsers.length <= 1 && <p className="text-xs text-gray-400 text-center">No other users</p>}
                </div>
            </div>

            <div className="mt-auto border-t border-gray-100 pt-3">
                <div className="mb-3 flex items-start gap-2">
                    <input
                        type="checkbox"
                        id={`applySame-${user.id}-${type}`}
                        checked={applySame}
                        onChange={(e) => setApplySame(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                    />
                    <label htmlFor={`applySame-${user.id}-${type}`} className="text-xs text-gray-600 cursor-pointer select-none leading-tight">
                        Also apply for {type === 'frameworks' ? 'Core Hours' : 'Frameworks'}
                    </label>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => onSave(selectedIds, applySame)}
                        className="flex-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-md hover:bg-indigo-700"
                    >
                        Save
                    </button>
                    {!compact && <button onClick={onCancel}>Cancel</button>}
                </div>
            </div>
        </div>
    );
};

export default AdminFrameworks;
