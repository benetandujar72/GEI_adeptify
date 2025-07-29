import React, { ReactNode } from 'react';
import AdeptifyNavigation from './AdeptifyNavigation';

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showNavigation?: boolean;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  title,
  subtitle,
  showNavigation = true,
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {showNavigation && <AdeptifyNavigation />}
      
      <main className="container mx-auto px-4 py-8">
        {(title || subtitle) && (
          <div className="mb-8">
            {title && (
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-lg text-gray-600">
                {subtitle}
              </p>
            )}
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}; 