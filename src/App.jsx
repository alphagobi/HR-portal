import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Policies from './pages/Policies';
import Tasks from './pages/Tasks';
import Timesheet from './pages/Timesheet';
import Leaves from './pages/Leaves';
import Calendar from './pages/Calendar';
import Reimbursements from './pages/Reimbursements';
import Announcements from './pages/Announcements';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLeaves from './pages/admin/AdminLeaves';
import AdminTimesheets from './pages/admin/AdminTimesheets';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReimbursements from './pages/admin/AdminReimbursements';
import AdminPolicies from './pages/admin/AdminPolicies';
import AdminCalendar from './pages/admin/AdminCalendar';
import AdminBackups from './pages/admin/AdminBackups';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Employee Routes - Protected */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="policies" element={<Policies />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="timesheet" element={<Timesheet />} />
          <Route path="leaves" element={<Leaves />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="reimbursements" element={<Reimbursements />} />
          <Route path="announcements" element={<Announcements />} />
        </Route>

        {/* Admin Routes - Protected & Admin Only */}
        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="timesheets" element={<AdminTimesheets />} />
          <Route path="leaves" element={<AdminLeaves />} />
          <Route path="reimbursements" element={<AdminReimbursements />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="calendar" element={<AdminCalendar />} />
          <Route path="policies" element={<AdminPolicies />} />
          <Route path="backups" element={<AdminBackups />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
