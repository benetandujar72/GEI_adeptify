import React from 'react';
import { Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './hooks/useAuth.tsx';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Competencies from './pages/adeptify/Competencies';
import Criteria from './pages/adeptify/Criteria';
import Evaluations from './pages/adeptify/Evaluations';
import Statistics from './pages/adeptify/Statistics';
import Settings from './pages/adeptify/Settings';
import Guards from './pages/assistatut/Guards';
import Attendance from './pages/assistatut/Attendance';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
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
                <div className="flex">
                  <Navigation />
                  <div className="flex-1 lg:pl-64">
                    <main className="min-h-screen bg-gray-50 p-6">
                      <Dashboard />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            </Route>
            
            <Route path="/adeptify/competencies">
              <ProtectedRoute>
                <div className="flex">
                  <Navigation />
                  <div className="flex-1 lg:pl-64">
                    <main className="min-h-screen bg-gray-50 p-6">
                      <Competencies />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            </Route>
            
            <Route path="/adeptify/competencies/:id/criteria">
              <ProtectedRoute>
                <div className="flex">
                  <Navigation />
                  <div className="flex-1 lg:pl-64">
                    <main className="min-h-screen bg-gray-50 p-6">
                      <Criteria />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            </Route>
            
            <Route path="/adeptify/evaluations">
              <ProtectedRoute>
                <div className="flex">
                  <Navigation />
                  <div className="flex-1 lg:pl-64">
                    <main className="min-h-screen bg-gray-50 p-6">
                      <Evaluations />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            </Route>
            
            <Route path="/adeptify/statistics">
              <ProtectedRoute>
                <div className="flex">
                  <Navigation />
                  <div className="flex-1 lg:pl-64">
                    <main className="min-h-screen bg-gray-50 p-6">
                      <Statistics />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            </Route>
            
            <Route path="/adeptify/settings">
              <ProtectedRoute>
                <div className="flex">
                  <Navigation />
                  <div className="flex-1 lg:pl-64">
                    <main className="min-h-screen bg-gray-50 p-6">
                      <Settings />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            </Route>
            
            <Route path="/assistatut/guards">
              <ProtectedRoute>
                <div className="flex">
                  <Navigation />
                  <div className="flex-1 lg:pl-64">
                    <main className="min-h-screen bg-gray-50 p-6">
                      <Guards />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            </Route>
            
            <Route path="/assistatut/attendance">
              <ProtectedRoute>
                <div className="flex">
                  <Navigation />
                  <div className="flex-1 lg:pl-64">
                    <main className="min-h-screen bg-gray-50 p-6">
                      <Attendance />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            </Route>
            
            {/* Default redirect to dashboard */}
            <Route>
              <ProtectedRoute>
                <div className="flex">
                  <Navigation />
                  <div className="flex-1 lg:pl-64">
                    <main className="min-h-screen bg-gray-50 p-6">
                      <Dashboard />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            </Route>
          </Switch>
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App; 