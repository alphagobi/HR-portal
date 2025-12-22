import React, { useState, useEffect } from 'react';
import { getAllFrameworkAllocations } from '../../services/frameworkService';
import { clsx } from 'clsx';
import { LayoutTemplate } from 'lucide-react';

const AdminFrameworks = () => {
    const [frameworks, setFrameworks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFrameworks();
    }, []);

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

    if (loading) return <div className="p-8 text-center text-gray-500">Loading data...</div>;

    return (
        <div className="p-6 max-w-full mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Framework Management</h1>
                    <p className="text-gray-500">Overview of employee framework allocations.</p>
                </div>
            </div>

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
        </div>
    );
};

export default AdminFrameworks;
