import React, { useEffect, useState } from 'react';
import { getAnnouncements } from '../services/announcementService';
import { getCurrentUser } from '../services/authService';
import { Bell, Calendar, CheckCircle, Clock } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
            <Icon size={24} className="text-white" />
        </div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
    </div>
);

const Dashboard = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = getCurrentUser();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getAnnouncements();
                setAnnouncements(data);
            } catch (error) {
                console.error("Failed to fetch announcements", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0] || 'Employee'}!</h1>
                <p className="text-gray-500">Here's what's happening today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Leave Balance"
                    value="12 Days"
                    icon={Calendar}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Pending Tasks"
                    value="5"
                    icon={Clock}
                    color="bg-amber-500"
                />
                <StatCard
                    title="Approved Claims"
                    value="$1,250"
                    icon={CheckCircle}
                    color="bg-emerald-500"
                />
                <StatCard
                    title="New Notices"
                    value="3"
                    icon={Bell}
                    color="bg-indigo-500"
                />
            </div>

            {/* Announcements Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900">Announcements</h2>
                    <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View All</button>
                </div>

                <div className="divide-y divide-gray-100">
                    {loading ? (
                        <div className="p-6 text-center text-gray-500">Loading announcements...</div>
                    ) : (
                        (announcements || []).map((item) => (
                            <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{item.date}</span>
                                </div>
                                <p className="text-gray-600 text-sm mb-3">{item.content}</p>
                                <div className="text-xs text-gray-400 font-medium">Posted by {item.author}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
