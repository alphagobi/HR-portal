-- Add task_id and type columns (duration already exists)
ALTER TABLE timesheet_entries 
ADD COLUMN task_id INT NULL,
ADD COLUMN type ENUM('planned', 'unplanned') DEFAULT 'unplanned';

-- Make start_time and end_time nullable
ALTER TABLE timesheet_entries MODIFY COLUMN start_time TIME NULL;
ALTER TABLE timesheet_entries MODIFY COLUMN end_time TIME NULL;
