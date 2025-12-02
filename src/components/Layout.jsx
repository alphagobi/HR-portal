import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, FileText, Clock, Calendar, DollarSign, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { logout } from '../services/authService';
import clsx from 'clsx';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Policies', path: '/policies', icon: FileText },
        { name: 'Timesheet', path: '/timesheet', icon: Clock },
        { name: 'Leaves', path: '/leaves', icon: Calendar },
        { name: 'Reimbursements', path: '/reimbursements', icon: DollarSign },
    ];

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
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
                <div className="h-16 flex items-center justify-center px-6 border-b border-gray-200">
                    <img src="/logo-wide.png" alt="AlphaGobi" className="h-10 w-auto" />
                    <button
                        className="lg:hidden text-gray-500 hover:text-gray-700 absolute right-4"
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
                                {item.name}
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
    );
};

export default Layout;
