import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { getAnnouncements } from '../services/announcementService';
import { getLeaves } from '../services/leaveService';
import { getCurrentUser } from '../services/authService';
import { LayoutDashboard, FileText, Clock, Calendar, IndianRupee, Menu, X, LogOut, CheckSquare, Megaphone } from 'lucide-react';
import { useState, useEffect } from 'react';
import { logout } from '../services/authService';
import clsx from 'clsx';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
    const [unreadLeaves, setUnreadLeaves] = useState(0);
    const [user, setUser] = useState(null); // User state to store current user
    const location = useLocation();

    useEffect(() => {
        document.title = 'Internal Portal - AlphaGobi';
        const currentUser = getCurrentUser(); // Get current user once
        setUser(currentUser);

        const fetchUnread = async () => {
            if (currentUser?.id) {
                // Announcements
                const announcements = await getAnnouncements(currentUser.id);
                const unreadAnn = announcements.filter(a => !a.is_acknowledged).length;
                setUnreadAnnouncements(unreadAnn);

                // Leaves
                try {
                    const leavesData = await getLeaves(currentUser.id);
                    let unreadL = 0;
                    if (Array.isArray(leavesData)) {
                        // Admin view (array of leaves)
                        unreadL = leavesData.reduce((acc, l) => acc + (parseInt(l.unread_count) || 0), 0);
                    } else if (leavesData.leaves) {
                        // Employee view (object with leaves array)
                        unreadL = leavesData.leaves.reduce((acc, l) => acc + (parseInt(l.unread_count) || 0), 0);
                    }
                    setUnreadLeaves(unreadL);
                } catch (e) {
                    console.error("Failed to fetch leaves for badge", e);
                }
            }
        };
        fetchUnread();
    }, [location.pathname]); // Refresh on navigation

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Tasks', path: '/tasks', icon: CheckSquare },
        { name: 'Timesheet', path: '/timesheet', icon: Clock },
        { name: 'Leaves', path: '/leaves', icon: Calendar, badge: unreadLeaves },
        { name: 'Calendar', path: '/calendar', icon: Calendar },
        { name: 'Reimbursements', path: '/reimbursements', icon: IndianRupee },
        { name: 'Announcements', path: '/announcements', icon: Megaphone, badge: unreadAnnouncements },
        { name: 'Policies', path: '/policies', icon: FileText },
    ];

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Global Values Header */}
            {/* Global Values Header */}
            <div className="bg-white border-b border-gray-200 py-6 px-8 relative flex items-center justify-center">
                <img src="/logo-wide.png" alt="AlphaGobi" className="h-12 w-auto absolute left-8 top-1/2 transform -translate-y-1/2" />
                <p className="text-3xl font-extrabold tracking-widest text-gray-800 uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Integrity. Effort. Intelligence.
                </p>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Mobile Sidebar Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside
                    className={clsx(
                        "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transition-transform duration-200 ease-in-out flex flex-col",
                        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                    )}
                >
                    <div className="h-16 flex items-center justify-end px-6 border-b border-gray-200 lg:hidden">
                        <button
                            className="text-gray-500 hover:text-gray-700"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <nav className="p-4 space-y-1 flex-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={clsx(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-indigo-50 text-indigo-700"
                                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                    )}
                                >
                                    <Icon size={20} />
                                    <span className="flex-1">{item.name}</span>
                                    {item.badge > 0 && (
                                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-gray-200">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3 w-full text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                        >
                            <LogOut size={20} />
                            <span className="font-medium">Sign Out</span>
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Top Header (Mobile only) */}
                    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:hidden gap-3">
                        <button
                            className="text-gray-500 hover:text-gray-700"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <img src="/logo-round.png" alt="Logo" className="h-8 w-8" />
                        <span className="text-lg font-semibold text-gray-900">Internal Portal</span>
                    </header>

                    <main className="flex-1 overflow-auto">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Layout;
