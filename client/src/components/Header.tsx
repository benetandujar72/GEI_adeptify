import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import UserMenu from "./UserMenu";
import { useLocation } from "wouter";
import logoImg from "../assets/logo.png";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector";

interface HeaderProps {
  toggleSidebar?: () => void;
  isMobile?: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isMobile = false }) => {
  const { isAuthenticated, signIn, devLogin, isSigningIn, isAdmin, instituteName } = useAuth();
  const [location] = useLocation();
  const { t, i18n } = useTranslation();
  
  // Determina el títol de la pàgina actual
  const getPageTitle = () => {
    const path = location.split("/")[1] || "dashboard";
    switch (path) {
      case "dashboard": return t('navigation.dashboard');
      case "evaluation": return t('navigation.evaluation');
      case "attendance": return t('navigation.attendance');
      case "guards": return t('navigation.guards');
      case "surveys": return t('navigation.surveys');
      case "resources": return t('navigation.resources');
      case "analytics": return t('navigation.analytics');
      case "adeptify": return t('navigation.adeptify');
      case "assistatut": return t('navigation.assistatut');
      default: return t('app.title');
    }
  };
  
  return (
    <header className="bg-white border-b border-border shadow-sm">
      <div className="px-4 py-3 flex justify-between items-center">
        {/* Botó de menú hamburguesa (només visible en mòbil) */}
        {isMobile && toggleSidebar && (
          <button 
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-md text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}
        
        {/* Logotip i títol */}
        <div className="flex items-center">
          <img src={logoImg} alt="GEI Unified Platform Logo" className="h-10 mr-3" />
          <div className="flex flex-col">
            <h1 className={`text-xl font-medium text-primary ${isMobile ? 'truncate' : ''}`}>
              {isAuthenticated ? getPageTitle() : "GEI Unified Platform"}
            </h1>
            {isAuthenticated && (
              <span className="text-xs text-gray-500">{instituteName || t('header.instituteDefault')}</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Sign In Section (shown when not authenticated) */}
          {!isAuthenticated ? (
            <div id="sign-in-section" className="flex items-center">
              <div className="flex flex-col xs:flex-row gap-2">
                <Button 
                  id="dev-signin-button"
                  onClick={() => devLogin()}
                  disabled={isSigningIn}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded shadow transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span className="font-medium text-sm">
                    {isSigningIn ? t('header.loading') : t('header.devMode')}
                  </span>
                </Button>
                
                <Button 
                  id="google-signin-button" 
                  onClick={() => signIn()}
                  disabled={isSigningIn}
                  className="flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 rounded shadow transition-colors"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="font-medium text-sm">
                    {isSigningIn ? t('header.loading') : t('header.signInWithGoogle')}
                  </span>
                </Button>
              </div>
            </div>
          ) : (
            /* Authenticated user section */
            <div className="flex items-center space-x-4">
              {/* Language Selector */}
              <LanguageSelector />
              
              {/* User Menu */}
              <UserMenu />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 