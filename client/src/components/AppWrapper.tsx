import React from 'react';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen';

interface AppWrapperProps {
  children: React.ReactNode;
}

const AppWrapper: React.FC<AppWrapperProps> = ({ children }) => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <LoadingScreen 
        message="Verificant autenticació..."
        timeout={8000}
        onTimeout={() => {
          console.log('Auth timeout, forcing continue');
          // Forzar continuar sin auth
        }}
      />
    );
  }

  return <>{children}</>;
};

export default AppWrapper; 