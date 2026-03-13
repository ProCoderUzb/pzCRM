import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/layout/Layout';
import Leads from './pages/Leads';
import Students from './pages/Students';
import Classes from './pages/Classes';
import ClassDetail from './pages/ClassDetail';
import Rooms from './pages/Rooms';
import Finance from './pages/Finance';
import Teachers from './pages/Teachers';
import Subjects from './pages/Subjects';
import Attendance from './pages/Attendance';
import Schedule from './pages/Schedule';
import Reports from './pages/Reports';

const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, currentUser } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/classes" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => (
  <ThemeProvider>
    <AuthProvider>
      <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          {/* CEO / ADMIN only departments */}
          <Route path="/dashboard"        element={<ProtectedRoute allowedRoles={['CEO', 'ADMIN', 'DEV']}><Dashboard /></ProtectedRoute>} />
          <Route path="/leads"            element={<ProtectedRoute allowedRoles={['CEO', 'ADMIN', 'DEV']}><Leads /></ProtectedRoute>} />
          <Route path="/students"         element={<ProtectedRoute allowedRoles={['CEO', 'ADMIN', 'DEV']}><Students /></ProtectedRoute>} />
          <Route path="/teachers"         element={<ProtectedRoute allowedRoles={['CEO', 'ADMIN', 'DEV']}><Teachers /></ProtectedRoute>} />
          <Route path="/subjects"         element={<ProtectedRoute allowedRoles={['CEO', 'ADMIN', 'DEV']}><Subjects /></ProtectedRoute>} />
          <Route path="/rooms"            element={<ProtectedRoute allowedRoles={['CEO', 'ADMIN', 'DEV']}><Rooms /></ProtectedRoute>} />
          <Route path="/finance"          element={<ProtectedRoute allowedRoles={['CEO', 'ADMIN', 'DEV']}><Finance /></ProtectedRoute>} />
          <Route path="/reports"          element={<ProtectedRoute allowedRoles={['CEO', 'ADMIN', 'DEV']}><Reports /></ProtectedRoute>} />
          
          {/* Open to TEACHER & above */}
          <Route path="/classes"          element={<Classes />} />
          <Route path="/classes/:id"      element={<ClassDetail />} />
          <Route path="/attendance"       element={<Attendance />} />
          <Route path="/schedule"         element={<Schedule />} />
        </Route>
      </Routes>
    </Router>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
