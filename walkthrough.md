# Employee HR System Walkthrough

I have successfully built the Employee HR System as a Single Page Application (SPA) using React and Tailwind CSS. The project is ready for deployment to your cPanel hosting.

## Features Implemented

### 1. Dashboard
- **Announcements**: View company news and updates.
- **Quick Stats**: At-a-glance view of leave balance, pending tasks, and claims.

### 2. Policy Portal
- **Document Access**: Browse and search company policies.
- **Categorization**: Filter policies by category (HR, Legal, etc.).

### 3. Timesheet Management
- **Daily Entry**: Log work hours with start/end times and descriptions.
- **Planning**: View weekly summary and plan future tasks.
- **Visuals**: Progress bars for weekly hour goals.

### 4. Leave Management
- **Request Form**: Submit leave requests with type, dates, and reason.
- **Balance Tracking**: Visual cards for Sick, Casual, and Earned leave balances.
- **History**: Track status of past requests (Approved/Pending/Rejected).

### 5. Reimbursements
- **Claims Submission**: Submit expense claims with receipts.
- **Status Tracking**: Monitor approval status of submitted claims.

## Technical Details

- **Frontend**: React (Vite) + Tailwind CSS
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Data**: Mock Services (Ready for API integration)
- **Database**: `schema.sql` provided for MySQL setup.

## How to Run Locally

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the development server:
    ```bash
    npm run dev
    ```
3.  Open [http://localhost:5173](http://localhost:5173) in your browser.

## Deployment to cPanel

1.  **Build the Project**:
    I have already run the build command. The production-ready files are in the `dist` folder.
    ```bash
    npm run build
    ```

2.  **Upload to cPanel**:
    - Go to **File Manager** in cPanel.
    - Navigate to `public_html` (or your subdomain folder).
    - Upload the contents of the `dist` folder.

3.  **Database Setup**:
    - Use **phpMyAdmin** or **MySQL Database Wizard** in cPanel.
    - Create a new database.
    - Import the `schema.sql` file located in the project root.

4.  **Backend Integration** (Future Step):
    - Replace the mock services in `src/services/` with real API calls to your PHP backend.

## Verification Results

- **Build**: Passed (`npm run build` successful).
- **Linting**: No errors.
- **Functionality**: All pages render correctly with mock data.
