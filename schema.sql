-- Database Schema for HR Portal

CREATE DATABASE IF NOT EXISTS alphagnn_hr_portal;
USE alphagnn_hr_portal;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- In production, this should be hashed
    role ENUM('admin', 'employee') DEFAULT 'employee',
    department VARCHAR(100),
    designation VARCHAR(100),
    avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Users (Password is 'password' for demo purposes)
INSERT INTO users (name, email, password, role, department, designation) VALUES 
('Admin User', 'admin@company.com', 'admin123', 'admin', 'Management', 'System Administrator'),
('John Doe', 'john@company.com', 'user123', 'employee', 'Engineering', 'Frontend Developer'),
('Jane Smith', 'jane@company.com', 'user123', 'employee', 'Design', 'UI/UX Designer');

-- Timesheets (Daily Records)
CREATE TABLE IF NOT EXISTS timesheets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    date DATE NOT NULL,
    milestone TEXT,
    task_description TEXT,
    comments TEXT,
    admin_remarks TEXT,
    status ENUM('draft', 'submitted', 'approved') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_daily_sheet (employee_id, date)
);

-- Timesheet Entries (Individual Tasks within a day)
CREATE TABLE IF NOT EXISTS timesheet_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timesheet_id INT NOT NULL,
    start_time VARCHAR(10), -- Storing as string HH:MM for simplicity matching frontend
    end_time VARCHAR(10),
    description TEXT,
    project VARCHAR(100) DEFAULT 'General',
    duration DECIMAL(5,2), -- Calculated hours
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE CASCADE
);

-- Add is_edited column if not exists (handled via migration script usually, but documenting here)
-- ALTER TABLE timesheet_entries ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;

-- Timesheet Entry History
CREATE TABLE IF NOT EXISTS timesheet_entry_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_id INT NOT NULL,
    old_description TEXT,
    old_start_time VARCHAR(10),
    old_end_time VARCHAR(10),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES timesheet_entries(id) ON DELETE CASCADE
);

-- Leaves
CREATE TABLE IF NOT EXISTS leaves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Sick Leave', 'Casual Leave', etc.
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Reimbursements
CREATE TABLE IF NOT EXISTS reimbursements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    status ENUM('Pending', 'Approved', 'Rejected', 'Paid') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type ENUM('info', 'alert', 'success', 'warning') DEFAULT 'info',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Activities Log
CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    text VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
