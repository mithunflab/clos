
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const PageWrapper = ({ children, className = '' }: PageWrapperProps) => {
  const location = useLocation();
  const { theme } = useTheme();

  const getPageClass = () => {
    if (theme !== 'light') return '';
    
    if (location.pathname === '/dashboard') return 'dashboard-page';
    if (location.pathname.startsWith('/workflows')) return 'workflows-page';
    if (location.pathname.includes('/playground')) return 'playground-canvas';
    
    return '';
  };

  return (
    <div className={`${getPageClass()} ${className}`}>
      {children}
    </div>
  );
};

export default PageWrapper;
