import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  message?: string;
  timeout?: number;
  onTimeout?: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Carregant GEI Unified Platform...", 
  timeout = 10000, // 10 segundos
  onTimeout 
}) => {
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimeoutMessage(true);
      onTimeout?.();
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout, onTimeout]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        {/* Logo o Icono */}
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        </div>

        {/* Mensaje de carga */}
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          GEI Unified Platform
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          {message}
        </p>

        {/* Spinner */}
        <div className="flex justify-center mb-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        {/* Mensaje de timeout */}
        {showTimeoutMessage && (
          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              La càrrega està prenent més temps del normal. 
              <button 
                onClick={() => window.location.reload()} 
                className="ml-2 text-blue-600 dark:text-blue-400 underline hover:no-underline"
              >
                Recarregar pàgina
              </button>
            </p>
          </div>
        )}

        {/* Información de debug */}
        <div className="mt-8 text-xs text-gray-500 dark:text-gray-400">
          <p>Versió: {process.env.VITE_APP_VERSION || '1.0.0'}</p>
          <p>Entorn: {process.env.NODE_ENV}</p>
          <p>API: {process.env.VITE_API_URL || '/api'}</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen; 