export const getTaskStatusColor = (plannedDate, isCompleted = false) => {
    if (isCompleted) {
        return {
            bg: 'bg-green-500',
            text: 'text-green-600',
            border: 'border-green-200',
            dot: 'bg-green-500' // Completed tasks are Green
        };
    }

    if (!plannedDate) {
        return {
            bg: 'bg-gray-100',
            text: 'text-gray-600',
            border: 'border-gray-200',
            dot: 'bg-gray-400' // No date
        };
    }

    const taskDate = new Date(plannedDate);
    const todayDate = new Date();

    // Reset times to compare only dates
    taskDate.setHours(0, 0, 0, 0);
    todayDate.setHours(0, 0, 0, 0);

    if (taskDate.getTime() < todayDate.getTime()) {
        return {
            bg: 'bg-red-100',
            text: 'text-red-700',
            border: 'border-red-200',
            dot: 'bg-red-600' // Overdue
        };
    } else if (taskDate.getTime() === todayDate.getTime()) {
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
