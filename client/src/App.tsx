import React, { useState } from 'react';
import { Switch, Route, useLocation } from 'wouter';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from './components/ui/tooltip';
import LoadingScreen from './components/LoadingScreen';
import AppWrapper from './components/AppWrapper';
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
import Header from './components/Header';
import Sidebar from './components/Sidebar';

const App: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <TooltipProvider>
              <AppWrapper>
                <div className="min-h-screen bg-background">
                  <Switch>
                    <Route path="/login" component={LoginPage} />
                    <Route path="/dashboard">
                      {() => (
                        <ProtectedRoute>
                          <div className="flex h-screen">
                            <Sidebar 
                              collapsed={sidebarCollapsed} 
                              toggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
                              isMobile={isMobile}
                            />
                            <div className="flex-1 flex flex-col">
                              <Header 
                                toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                                isMobile={isMobile}
                              />
                              <main className="flex-1 overflow-auto p-6">
                                <DashboardPage />
                              </main>
                            </div>
                          </div>
                        </ProtectedRoute>
                      )}
                    </Route>
                    <Route path="/evaluation">
                      {() => (
                        <ProtectedRoute>
                          <div className="flex h-screen">
                            <Sidebar 
                              collapsed={sidebarCollapsed} 
                              toggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
                              isMobile={isMobile}
                            />
                            <div className="flex-1 flex flex-col">
                              <Header 
                                toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                                isMobile={isMobile}
                              />
                              <main className="flex-1 overflow-auto p-6">
                                <EvaluationPage />
                              </main>
                            </div>
                          </div>
                        </ProtectedRoute>
                      )}
                    </Route>
                    <Route path="/attendance">
                      {() => (
                        <ProtectedRoute>
                          <div className="flex h-screen">
                            <Sidebar 
                              collapsed={sidebarCollapsed} 
                              toggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
                              isMobile={isMobile}
                            />
                            <div className="flex-1 flex flex-col">
                              <Header 
                                toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                                isMobile={isMobile}
                              />
                              <main className="flex-1 overflow-auto p-6">
                                <AttendancePage />
                              </main>
                            </div>
                          </div>
                        </ProtectedRoute>
                      )}
                    </Route>
                    <Route path="/guards">
                      {() => (
                        <ProtectedRoute>
                          <div className="flex h-screen">
                            <Sidebar 
                              collapsed={sidebarCollapsed} 
                              toggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
                              isMobile={isMobile}
                            />
                            <div className="flex-1 flex flex-col">
                              <Header 
                                toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                                isMobile={isMobile}
                              />
                              <main className="flex-1 overflow-auto p-6">
                                <GuardPage />
                              </main>
                            </div>
                          </div>
                        </ProtectedRoute>
                      )}
                    </Route>
                    <Route path="/surveys">
                      {() => (
                        <ProtectedRoute>
                          <div className="flex h-screen">
                            <Sidebar 
                              collapsed={sidebarCollapsed} 
                              toggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
                              isMobile={isMobile}
                            />
                            <div className="flex-1 flex flex-col">
                              <Header 
                                toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                                isMobile={isMobile}
                              />
                              <main className="flex-1 overflow-auto p-6">
                                <SurveysPage />
                              </main>
                            </div>
                          </div>
                        </ProtectedRoute>
                      )}
                    </Route>
                    <Route path="/resources">
                      {() => (
                        <ProtectedRoute>
                          <div className="flex h-screen">
                            <Sidebar 
                              collapsed={sidebarCollapsed} 
                              toggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
                              isMobile={isMobile}
                            />
                            <div className="flex-1 flex flex-col">
                              <Header 
                                toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                                isMobile={isMobile}
                              />
                              <main className="flex-1 overflow-auto p-6">
                                <ResourcesPage />
                              </main>
                            </div>
                          </div>
                        </ProtectedRoute>
                      )}
                    </Route>
                    <Route path="/analytics">
                      {() => (
                        <ProtectedRoute>
                          <div className="flex h-screen">
                            <Sidebar 
                              collapsed={sidebarCollapsed} 
                              toggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
                              isMobile={isMobile}
                            />
                            <div className="flex-1 flex flex-col">
                              <Header 
                                toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                                isMobile={isMobile}
                              />
                              <main className="flex-1 overflow-auto p-6">
                                <AnalyticsPage />
                              </main>
                            </div>
                          </div>
                        </ProtectedRoute>
                      )}
                    </Route>
                    <Route path="/admin">
                      {() => (
                        <ProtectedRoute requiredRole="superadmin">
                          <div className="flex h-screen">
                            <Sidebar 
                              collapsed={sidebarCollapsed} 
                              toggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
                              isMobile={isMobile}
                            />
                            <div className="flex-1 flex flex-col">
                              <Header 
                                toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                                isMobile={isMobile}
                              />
                              <main className="flex-1 overflow-auto p-6">
                                <AdminPanel />
                              </main>
                            </div>
                          </div>
                        </ProtectedRoute>
                      )}
                    </Route>
                    <Route path="/">
                      {() => <Navigate to="/dashboard" />}
                    </Route>
                  </Switch>
                </div>
                <Toaster />
              </AppWrapper>
            </TooltipProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App; 