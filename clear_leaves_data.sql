-- Method 1: Safer Delete (Recommended for phpMyAdmin)
-- We delete from the child table (messages) first, then the parent table (requests).

-- 1. Clear the chat messages (Child Table)
DELETE FROM leave_chats;

-- 2. Clear the leave requests (Parent Table)
DELETE FROM leaves;

-- 3. Reset the ID counters (Auto Increment) to start from 1
ALTER TABLE leave_chats AUTO_INCREMENT = 1;
ALTER TABLE leaves AUTO_INCREMENT = 1;

-- Note: DELETE is safer than TRUNCATE when foreign key constraints are tricky in some hosting environments.
