import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import EvaluationPage from './pages/evaluation/EvaluationPage';
import AttendancePage from './pages/attendance/AttendancePage';
import GuardPage from './pages/guard/GuardPage';
import AdminPanel from './pages/admin/AdminPanel';
import AcademicYearWizard from './components/wizard/AcademicYearWizard';
import SurveysPage from './pages/surveys/SurveysPage';
import ResourcesPage from './pages/resources/ResourcesPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <DashboardPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                {/* Rutas de módulos */}
                <Route
                  path="/evaluation/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <EvaluationPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/attendance/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <AttendancePage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/guard/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <GuardPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/surveys/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <SurveysPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/resources/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <ResourcesPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <AnalyticsPage />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                {/* Ruta de administración */}
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute requiredRole="superadmin">
                      <Layout>
                        <AdminPanel />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                {/* Ruta del wizard de año académico */}
                <Route
                  path="/wizard/academic-year"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <AcademicYearWizard />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </div>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App; 