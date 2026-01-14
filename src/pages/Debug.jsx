import React, { useEffect, useState } from 'react';

const Debug = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDebugInfo = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/debug.php');
            if (!res.ok) throw new Error("Failed to fetch debug info");
            const jsonData = await res.json();
            setData(jsonData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDebugInfo();
    }, []);

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">System Diagnostic</h1>

            <button
                onClick={fetchDebugInfo}
                className="bg-indigo-600 text-white px-4 py-2 rounded mb-6 hover:bg-indigo-700"
            >
                Refresh Data
            </button>

            {loading && <div className="text-gray-500">Loading...</div>}
            {error && <div className="text-red-500 font-bold mb-4">Error: {error}</div>}

            {data && (
                <div className="space-y-6">
                    {/* DB Status */}
                    <div className="bg-white p-4 rounded shadow border border-gray-200">
                        <h2 className="font-bold text-lg mb-2">Database Connection</h2>
                        <div className={`text-sm font-mono p-2 rounded ${data.db_connection === 'Failed' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                            {data.db_connection || "Unknown"}
                        </div>
                    </div>

                    {/* Framework ID Check */}
                    <div className="bg-white p-4 rounded shadow border border-gray-200">
                        <h2 className="font-bold text-lg mb-2">Column Check: framework_id</h2>
                        <div className={`text-sm font-mono p-2 rounded ${data.framework_id_check === 'Missing' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                            {data.framework_id_check || "Unknown"}
                        </div>
                    </div>

                    {/* Schema */}
                    <div className="bg-white p-4 rounded shadow border border-gray-200">
                        <h2 className="font-bold text-lg mb-2">Create Task Table Schema</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-2">Field</th>
                                        <th className="p-2">Type</th>
                                        <th className="p-2">Null</th>
                                        <th className="p-2">Key</th>
                                        <th className="p-2">Default</th>
                                        <th className="p-2">Extra</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.planned_tasks_schema?.map((col, i) => (
                                        <tr key={i} className="border-b">
                                            <td className="p-2 font-medium">{col.Field}</td>
                                            <td className="p-2">{col.Type}</td>
                                            <td className="p-2">{col.Null}</td>
                                            <td className="p-2">{col.Key}</td>
                                            <td className="p-2">{col.Default}</td>
                                            <td className="p-2">{col.Extra}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Tables */}
                    <div className="bg-white p-4 rounded shadow border border-gray-200">
                        <h2 className="font-bold text-lg mb-2">All Tables</h2>
                        <div className="text-xs font-mono bg-gray-50 p-3 rounded text-gray-700">
                            {data.tables?.join(', ')}
                        </div>
                    </div>

                    {/* Errors */}
                    {data.errors?.length > 0 && (
                        <div className="bg-red-50 p-4 rounded border border-red-200">
                            <h2 className="font-bold text-red-700 mb-2">Errors Logged</h2>
                            <ul className="list-disc pl-5 text-red-600 text-sm">
                                {data.errors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Debug;
