# Brainstorming: Linking Frameworks & Tasks

## Concept
The goal is to connect day-to-day Tasks with high-level Frameworks (Strategy). This allows us to track "Actual Time Spent" per framework and track it against the "Target Allocation".

## 1. Data Structure

### A. Linking Tasks to Frameworks
We need to add a "Framework" field to the `planned_tasks` table.
- **Database**: Add `framework_id` column to `planned_tasks` table.
    - *Alternative*: Store `category_name` directly if frameworks change often, but ID is cleaner. Let's use `framework_id` (linking to `work_allocations.id`).
- **Logic**: When creating a task, the user selects a Framework.

### B. Tracking Time
Time is logged via `timesheet_entries`.
- Since `timesheet_entries` are linked to `planned_tasks`, we can trace the time back to the framework via the task.
- **Unplanned Work**: For direct timesheet entries (no task), we might need a "Framework" dropdown in the "Log Work" modal too, or just default to "General" / "Unallocated".

## 2. User Interface

### A. Task Creation (Tasks.jsx)
- **Add Task Modal**: Add a dropdown "Link Framework".
- **Options**: List all active frameworks from the Dashboard.
- **Display**: Show a small colored tag/dot next to the task in the list indicating its framework.

### B. Reporting / Visualization
The user wants to see "Total Time Worked" vs "Target %".
- **Where**: User said "dont make that percentage viewing in dashboard".
- **Proposal**:
    - **Timesheet Page**: Add a "Framework Analysis" tab or section.
    - **Visual**: A simple bar chart or list.
        - **Target**: "Business Analysis" (50%)
        - **Actual**: 3.5 Hours (15% of total time today/week) -> *Under Allocated*
    - **Calculation**:
        1.  Fetch all time logs for period (Day/Week).
        2.  Group by `task.framework_id`.
        3.  Calculate `Total Duration`.
        4.  Calculate `Actual %` = `(Framework Hours / Total Hours) * 100`.
        5.  Compare with `Framework.percentage`.

## 3. Implementation Plan

### Step 1: Backend Prep
- Update `planned_tasks` table to add `framework_id`.
- Update `tasks.php` to handle `framework_id` in GET/POST.

### Step 2: Frontend Prep
- Update `TaskService.js` to support new field.
- Fetch `frameworks` in `Tasks.jsx`.

### Step 3: UI - Task Creation
- Update "Add Task" modal in `Tasks.jsx` with the dropdown.

### Step 4: UI - Analytics
- Create a new view (e.g., in `Timesheet.jsx` or a new `Frameworks.jsx` page) to show the "Actual vs Target" comparison.

## Questions for User
- Should "Unplanned" tasks (logged directly in Timesheet) also have a Framework link? (Recommended: Yes, for accurate "Actual" tracking).
- Where exactly do you want to see the "Alignment" view if not on the Dashboard? A modal? A separate page? The Timesheet page?
