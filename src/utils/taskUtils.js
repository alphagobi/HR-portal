export const getTaskStatusColor = (plannedDate, isCompleted = false, completedDate = null) => {
    if (!plannedDate) {
        return {
            bg: 'bg-gray-100',
            text: 'text-gray-600',
            border: 'border-gray-200',
            dot: 'bg-gray-400' // No date
        };
    }

    // Use simple string comparison to avoid timezone issues
    // Ensure both dates are YYYY-MM-DD
    const taskDateStr = new Date(plannedDate).toISOString().split('T')[0];
    const todayDateStr = new Date().toISOString().split('T')[0];

    // Determine the reference date for status calculation
    // If completed, we compare against the completion date (or today if unknown)
    // If not completed, we compare against today
    let referenceDateStr = todayDateStr;
    if (isCompleted === true || isCompleted == 1 || isCompleted === '1') {
        referenceDateStr = completedDate
            ? new Date(completedDate).toISOString().split('T')[0]
            : todayDateStr;
    }

    if (taskDateStr < referenceDateStr) {
        return {
            bg: 'bg-red-100',
            text: 'text-red-700',
            border: 'border-red-200',
            dot: 'bg-red-600' // Overdue / Late
        };
    } else if (taskDateStr === referenceDateStr) {
        return {
            bg: 'bg-yellow-100',
            text: 'text-yellow-700',
            border: 'border-yellow-200',
            dot: 'bg-yellow-500' // Due Today / On-Time
        };
    } else {
        return {
            bg: 'bg-green-100',
            text: 'text-green-700',
            border: 'border-green-200',
            dot: 'bg-green-500' // Future / Early
        };
    }
};
