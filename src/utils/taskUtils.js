export const getTaskStatusColor = (plannedDate, isCompleted = false) => {
    if (!plannedDate) {
        return {
            bg: 'bg-gray-100',
            text: 'text-gray-600',
            border: 'border-gray-200',
            dot: 'bg-gray-400' // No date
        };
    }

    // Use simple string comparison to avoid timezone issues
    // Ensure plannedDate is YYYY-MM-DD
    const taskDateStr = new Date(plannedDate).toISOString().split('T')[0];
    const todayDateStr = new Date().toISOString().split('T')[0];

    // FIX: Check isCompleted first!
    // Handle various truthy values (1, "1", true)
    if (isCompleted === true || isCompleted === 1 || isCompleted === '1') {
        return {
            bg: 'bg-green-100',
            text: 'text-green-700',
            border: 'border-green-200',
            dot: 'bg-green-500' // Completed
        };
    }

    if (taskDateStr < todayDateStr) {
        return {
            bg: 'bg-red-100',
            text: 'text-red-700',
            border: 'border-red-200',
            dot: 'bg-red-600' // Overdue
        };
    } else if (taskDateStr === todayDateStr) {
        return {
            bg: 'bg-yellow-100',
            text: 'text-yellow-700',
            border: 'border-yellow-200',
            dot: 'bg-yellow-500' // Due Today
        };
    } else {
        return {
            bg: 'bg-green-100',
            text: 'text-green-700',
            border: 'border-green-200',
            dot: 'bg-green-500' // Future
        };
    }
};
