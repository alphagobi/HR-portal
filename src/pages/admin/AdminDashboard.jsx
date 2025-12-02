import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, DollarSign, Bell } from 'lucide-react';
import { getLeaves } from '../../services/leaveService';
import { getClaims } from '../../services/reimbursementService';

import { getRecentActivities } from '../../services/activityService';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        pendingLeaves: 0,
        pendingClaims: 0,
        totalEmployees: 12, // Mock
        activeAnnouncements: 3 // Mock
    });
    const [recentActivities, setRecentActivities] = useState([]);

    useEffect(() => {
        const fetchStats = async () => {
            const leaves = await getLeaves();
            const claims = await getClaims();
            const activities = await getRecentActivities();

            setStats(prev => ({
                ...prev,
                pendingLeaves: (leaves || []).filter(l => l.status === 'Pending').length,
                pendingClaims: (claims || []).filter(c => c.status === 'Pending').length
            }));
            setRecentActivities(activities || []);
        };
        fetchStats();
    }, []);

    const statCards = [
        { label: 'Pending Leaves', value: stats.pendingLeaves, icon: Calendar, color: 'bg-orange-500' },
        { label: 'Pending Claims', value: stats.pendingClaims, icon: DollarSign, color: 'bg-emerald-500' },
        { label: 'Total Employees', value: stats.totalEmployees, icon: Users, color: 'bg-blue-500' },
        { label: 'Announcements', value: stats.activeAnnouncements, icon: Bell, color: 'bg-purple-500' },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-500">Overview of system activity and pending actions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCards.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className={`${stat.color} p-3 rounded-lg text-white`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
                    <div className="space-y-4">
                        {recentActivities.length === 0 ? (
                            <p className="text-sm text-gray-500">No recent activity.</p>
                        ) : (
                            recentActivities.map(activity => {
                                let color = 'bg-gray-500';
                                if (activity.type === 'leave') color = 'bg-blue-500';
                                if (activity.type === 'reimbursement') color = 'bg-emerald-500';
                                if (activity.type === 'announcement') color = 'bg-purple-500';
                                if (activity.type === 'system') color = 'bg-gray-500';

                                return (
                                    <div key={activity.id} className="flex items-center gap-3 text-sm text-gray-600">
                                        <div className={`w-2 h-2 ${color} rounded-full`}></div>
                                        <p>{activity.text}</p>
                                        <span className="text-xs text-gray-400 ml-auto">
                                            {new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => navigate('/admin/leaves')}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                        >
                            <span className="block font-medium text-gray-900 mb-1">Review Leaves</span>
                            <span className="text-xs text-gray-500">Check pending requests</span>
                        </button>
                        <button
                            onClick={() => navigate('/admin/reimbursements')}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                        >
                            <span className="block font-medium text-gray-900 mb-1">Approve Claims</span>
                            <span className="text-xs text-gray-500">Process reimbursements</span>
                        </button>
                        <button
                            onClick={() => navigate('/admin/announcements')}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                        >
                            <span className="block font-medium text-gray-900 mb-1">Post Notice</span>
                            <span className="text-xs text-gray-500">Create announcement</span>
                        </button>
                        <button
                            onClick={() => navigate('/admin/users')}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                        >
                            <span className="block font-medium text-gray-900 mb-1">Add Employee</span>
                            <span className="text-xs text-gray-500">Onboard new staff</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
