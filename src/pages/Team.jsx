import React, { useState, useEffect } from 'react';
import { getAllFrameworkAllocations } from '../services/frameworkService';
import { getTeamUsers, getCurrentUser } from '../services/authService';
import { getUserSetting } from '../services/userSettingsService';
import { clsx } from 'clsx';
import { LayoutTemplate, Clock, AlertCircle } from 'lucide-react';

const Team = () => {
    const [activeTab, setActiveTab] = useState('frameworks'); // 'frameworks' | 'core_hours'
    const [frameworks, setFrameworks] = useState([]);
    const [coreHoursData, setCoreHoursData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [teamUsers, setTeamUsers] = useState([]);
    const currentUser = getCurrentUser();

    useEffect(() => {
        const loadTeam = async () => {
            if (currentUser?.id) {
                const users = await getTeamUsers(currentUser.id);
                setTeamUsers(users);

                // If we found users, we can filter frameworks matches
                // For now, frameworks API returns all, we filter here.
                // Note: Production grade would filter in backend.
            }
        };
        loadTeam();
    }, [currentUser?.id]);

    useEffect(() => {
        if (teamUsers.length > 0) {
            if (activeTab === 'frameworks') {
                fetchFrameworks();
            } else {
                fetchCoreHours();
            }
        } else {
            // If no team users loaded yet (or none exist), wait or show empty? 
            // If query finished and empty, loading should stop. 
            // Logic in fetch functions handles empty teamUsers if called.
            setLoading(false);
        }
    }, [activeTab, teamUsers]);

    const fetchFrameworks = async () => {
        setLoading(true);
        try {
            const allAllocations = await getAllFrameworkAllocations();
            // Filter allocations for only users in teamUsers
            const allowedIds = teamUsers.map(u => u.id);
            const filtered = allAllocations.filter(a => allowedIds.includes(parseInt(a.user_id)) || parseInt(a.user_id) === currentUser.id);
            setFrameworks(filtered);
        } catch (error) {
            console.error("Failed to fetch frameworks", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCoreHours = async () => {
        setLoading(true);
        try {
            // Fetch core hours only for team users
            // Include SELF in the view? Usually "Team" implies others + self.
            // teamUsers API returns self + others.

            const dataPromises = teamUsers.map(async (user) => {
                if (user.role === 'admin' && user.email === 'admin@company.com') return null;

                const settings = await getUserSetting(user.id, 'core_working_hours');
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

    return (
        <div className="p-6 max-w-full mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {activeTab === 'frameworks' ? 'My Team Frameworks' : 'My Team Core Hours'}
                    </h1>
                    <p className="text-gray-500">
                        {activeTab === 'frameworks' ? 'Overview of team framework allocations.' : 'Overview of team working schedules.'}
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
                        <>
                            {frameworks.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">No framework data visible.</div>
                            ) : (
                                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {Object.values(frameworks.reduce((acc, item) => {
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
                        </>
                    )}

                    {/* CORE HOURS VIEW */}
                    {activeTab === 'core_hours' && (
                        <>
                            {coreHoursData.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">No schedule data visible.</div>
                            ) : (
                                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {coreHoursData.map(({ user, settings, request }) => {
                                            // Show ACTIVE settings primarily. If request exists, maybe show a badge but don't show request details if not admin? 
                                            // Regular employees should probably just see APPROVED schedule. 
                                            // "Team View" usually shows when they are AVAILABLE.
                                            // So I will prioritize `settings`. If `settings` is null, show "No schedule".
                                            // I will IGNORE `request` for the basic team view to avoid confusion, unless "Pending" status is important for peers? 
                                            // Peers care about "When can I call you?". So Active Settings.

                                            const displaySettings = settings;

                                            return (
                                                <div key={user.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow relative">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="font-bold text-gray-900 text-lg">{user.name}</h3>
                                                            <p className="text-sm text-gray-500">{user.designation || user.department || 'Employee'}</p>
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
                                                                    Working Days
                                                                </h4>
                                                                <div className="flex gap-1.5 flex-wrap">
                                                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                                        <div
                                                                            key={day}
                                                                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${displaySettings.working_days.includes(day)
                                                                                ? 'bg-green-100 text-green-700'
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
                                                                    Time Slots
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
                </>
            )}
        </div>
    );
};

export default Team;
