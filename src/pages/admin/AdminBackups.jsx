import React, { useState } from 'react';
import { Database, AlertCircle, CheckCircle, Loader, Terminal } from 'lucide-react';
import { getCurrentUser } from '../../services/authService';

const API_URL = '/api/trigger_backup.php';

const AdminBackups = ({ userId }) => {
    // If userId not passed as prop, get from auth service
    const currentUserId = userId || getCurrentUser()?.id;

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleRunBackup = async () => {
        if (!currentUserId) {
            setError("User ID not found. Please log in again.");
            return;
        }

        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const response = await fetch(`${API_URL}?user_id=${currentUserId}`);
            const data = await response.json();

            if (response.ok && data.success) {
                setResult(data);
            } else {
                setError(data.message || data.error || 'Backup failed');
                if (data.details) {
                    setResult({ details: data.details }); // Show details even on error if available
                }
            }
        } catch (err) {
            setError('Network error or server failed to respond.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Database className="w-8 h-8 text-blue-600" />
                        Database Backups
                    </h1>
                    <p className="text-gray-500 mt-1">Manually trigger a database backup and have it emailed to the admin.</p>
                </div>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Manual Backup</h3>
                    <p className="text-gray-600 mb-4">
                        This looks for the setup scripts in <code>database/backup_db.php</code> and executes them.
                        Result will be emailed to the configured address.
                    </p>

                    <button
                        onClick={handleRunBackup}
                        disabled={loading}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${loading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                            }`}
                    >
                        {loading ? (
                            <>
                                <Loader className="w-5 h-5 animate-spin" />
                                Running Backup...
                            </>
                        ) : (
                            <>
                                <Database className="w-5 h-5" />
                                Run Backup Now
                            </>
                        )}
                    </button>
                </div>

                {/* Error State */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-red-800">Backup Failed</h4>
                            <p className="text-red-700 text-sm mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {/* Success State */}
                {result && result.success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-green-800">Backup Initiated Successfully</h4>
                            <p className="text-green-700 text-sm mt-1">{result.message}</p>
                        </div>
                    </div>
                )}

                {/* Console Output (Details) */}
                {result && result.details && (
                    <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Terminal className="w-4 h-4" />
                            Script Output:
                        </h4>
                        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                            {result.details}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminBackups;
