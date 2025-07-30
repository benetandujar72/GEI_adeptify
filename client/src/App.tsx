import React from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/hooks/useAuth.tsx';
import Navigation from '@/components/Navigation.tsx';
import Dashboard from '@/pages/Dashboard.tsx';
import EducationalDashboard from '@/pages/EducationalDashboard.tsx';
import CoursesPage from '@/pages/CoursesPage.tsx';
import Competencies from '@/pages/adeptify/Competencies.tsx';
import Criteria from '@/pages/adeptify/Criteria.tsx';
import Evaluations from '@/pages/adeptify/Evaluations.tsx';
import Statistics from '@/pages/adeptify/Statistics.tsx';
import Settings from '@/pages/adeptify/Settings.tsx';
import Guards from '@/pages/assistatut/Guards.tsx';
import Attendance from '@/pages/assistatut/Attendance.tsx';
import CalendarPage from '@/pages/calendar/CalendarPage.tsx';
import Login from '@/pages/Login.tsx';
import ProtectedRoute from '@/components/ProtectedRoute.tsx';
import './App.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Layout component for protected routes
const ProtectedLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex">
    <Navigation />
    <div className="flex-1 lg:pl-64">
      <main className="min-h-screen bg-gray-50 p-6">
        {children}
      </main>
    </div>
  </div>
);

// Default redirect component
const DefaultRedirect = () => {
  const [, setLocation] = useLocation();
  React.useEffect(() => {
    setLocation('/');
  }, [setLocation]);
  return null;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="App">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
          
          <Switch>
            {/* Public routes */}
            <Route path="/login" component={Login} />
            
            {/* Protected routes */}
            <Route path="/">
              <ProtectedRoute>
                <ProtectedLayout>
                  <Dashboard />
                </ProtectedLayout>
              </ProtectedRoute>
            </Route>
            
            {/* Educational System Routes */}
            <Route path="/educational-dashboard">
              <ProtectedRoute>
                <ProtectedLayout>
                  <EducationalDashboard />
                </ProtectedLayout>
              </ProtectedRoute>
            </Route>
            
            <Route path="/courses">
              <ProtectedRoute>
                <ProtectedLayout>
                  <CoursesPage />
                </ProtectedLayout>
              </ProtectedRoute>
            </Route>
            
            <Route path="/adeptify/competencies">
              <ProtectedRoute>
                <ProtectedLayout>
                  <Competencies />
                </ProtectedLayout>
              </ProtectedRoute>
            </Route>
            
            <Route path="/adeptify/competencies/:id/criteria">
              <ProtectedRoute>
                <ProtectedLayout>
                  <Criteria />
                </ProtectedLayout>
              </ProtectedRoute>
            </Route>
            
            <Route path="/adeptify/evaluations">
              <ProtectedRoute>
                <ProtectedLayout>
                  <Evaluations />
                </ProtectedLayout>
              </ProtectedRoute>
            </Route>
            
            <Route path="/adeptify/statistics">
              <ProtectedRoute>
                <ProtectedLayout>
                  <Statistics />
                </ProtectedLayout>
              </ProtectedRoute>
            </Route>
            
            <Route path="/adeptify/settings">
              <ProtectedRoute>
                <ProtectedLayout>
                  <Settings />
                </ProtectedLayout>
              </ProtectedRoute>
            </Route>
            
            <Route path="/assistatut/guards">
              <ProtectedRoute>
                <ProtectedLayout>
                  <Guards />
                </ProtectedLayout>
              </ProtectedRoute>
            </Route>
            
            <Route path="/assistatut/attendance">
              <ProtectedRoute>
                <ProtectedLayout>
                  <Attendance />
                </ProtectedLayout>
              </ProtectedRoute>
            </Route>
            
            <Route path="/calendar">
              <ProtectedRoute>
                <ProtectedLayout>
                  <CalendarPage />
                </ProtectedLayout>
              </ProtectedRoute>
            </Route>
            
            {/* Default redirect to dashboard */}
            <Route>
              <DefaultRedirect />
            </Route>
          </Switch>
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App; 