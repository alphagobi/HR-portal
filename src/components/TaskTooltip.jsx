import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, User, Calendar, CheckCircle, Target, Info } from 'lucide-react';

const TaskTooltip = ({ task, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const timerRef = useRef(null);
    const hoverRef = useRef();

    const handleMouseEnter = (e) => {
        const rect = hoverRef.current.getBoundingClientRect();
        // Positioning it below the element
        setCoords({
            x: rect.left + window.scrollX,
            y: rect.bottom + window.scrollY + 5
        });

        timerRef.current = setTimeout(() => {
            setIsVisible(true);
        }, 300); // 300ms delay for smoother UX
    };

    const handleMouseLeave = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setIsVisible(false);
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    // Format metrics
    const etaHours = task.eta ? (parseInt(task.eta) / 60).toFixed(2) : '-';
    // duration might be named 'duration' in some contexts and 'actual_time' in others?
    // Based on tasks.php join: 'te.duration' is joined.
    const actualHours = task.duration ? parseFloat(task.duration).toFixed(2) : (task.actual_time ? parseFloat(task.actual_time).toFixed(2) : '-');

    return (
        <div
            ref={hoverRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="inline-block w-full"
        >
            {children}

            {isVisible && createPortal(
                <div
                    style={{
                        position: 'absolute',
                        top: coords.y,
                        left: coords.x,
                        zIndex: 9999
                    }}
                    className="w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 animate-in fade-in zoom-in duration-200"
                >
                    <div className="flex items-start gap-3 mb-3 pb-3 border-b border-gray-50">
                        <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                            <Info size={18} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Task Details</h4>
                            <p className="text-sm font-bold text-gray-900 line-clamp-2">{task.task_content}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                        {/* Assign Info */}
                        <div className="flex items-center gap-2.5 text-xs text-gray-600">
                            <User size={14} className="text-gray-400" />
                            <span className="font-medium">Assigned by:</span>
                            <span className="text-gray-900 font-bold ml-auto">{task.assigner_name || 'Self-Assigned'}</span>
                        </div>

                        {/* Dates */}
                        <div className="flex items-center gap-2.5 text-xs text-gray-600">
                            <Calendar size={14} className="text-gray-400" />
                            <span className="font-medium">Assigned on:</span>
                            <span className="text-gray-900 font-bold ml-auto">{new Date(task.created_at).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-gray-600">
                            <Target size={14} className="text-gray-400" />
                            <span className="font-medium">Target Date:</span>
                            <span className="text-gray-900 font-bold ml-auto">{new Date(task.planned_date).toLocaleDateString()}</span>
                        </div>

                        {/* Completion */}
                        <div className="flex items-center gap-2.5 text-xs text-gray-600">
                            <CheckCircle size={14} className="text-gray-400" />
                            <span className="font-medium">Completion:</span>
                            <span className={`ml-auto font-bold ${task.is_completed ? 'text-green-600' : 'text-orange-500'}`}>
                                {task.is_completed ? (task.completed_date || 'Done') : 'Pending'}
                            </span>
                        </div>

                        {/* Time Stats */}
                        <div className="mt-2 pt-2 border-t border-gray-50 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">ETA (Hrs)</p>
                                <div className="flex items-center gap-1.5 font-bold text-gray-900">
                                    <Clock size={12} className="text-indigo-400" />
                                    {etaHours}
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Actual (Hrs)</p>
                                <div className="flex items-center gap-1.5 font-bold text-gray-900">
                                    <Clock size={12} className="text-green-400" />
                                    {actualHours}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default TaskTooltip;
