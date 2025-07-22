import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Workflow, User, LogOut, Menu, X, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import Dashboard from '@/pages/Dashboard';
import Workflows from '@/pages/Workflows';
import WorkflowPlayground from '@/pages/WorkflowPlayground';
import Profile from '@/pages/Profile';
import ThemeToggle from '@/components/ThemeToggle';
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};
interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  isActive: boolean;
  onClick?: () => void;
  isMinimized?: boolean;
}
const SidebarItem = ({
  icon,
  label,
  to,
  isActive,
  onClick,
  isMinimized
}: SidebarItemProps) => {
  const navigate = useNavigate();
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    }
    navigate(to);
  };
  return <button onClick={handleClick} className={cn("flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group w-full text-left mb-2 glow-border", isActive ? "bg-primary text-primary-foreground glow-border-primary" : "text-foreground/70 hover:text-foreground hover:bg-muted", isMinimized && "justify-center px-2")}>
      <div className={cn("flex items-center justify-center flex-shrink-0", isMinimized ? "w-8 h-8" : "w-8 h-8")}>
        {icon}
      </div>
      {!isMinimized && <span className="font-medium truncate text-slate-50">{label}</span>}
    </button>;
};
const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const location = useLocation();
  const {
    signOut
  } = useAuth();
  const navigate = useNavigate();

  // Auto-minimize sidebar when in playground - with proper cleanup
  useEffect(() => {
    const isPlayground = location.pathname.includes('/playground') || location.pathname.includes('/workflows/') && (location.pathname.includes('/new') || location.pathname.includes('/edit'));
    const timer = setTimeout(() => {
      setIsMinimized(isPlayground);
    }, 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  const navigationItems = [{
    icon: <Home className="w-5 h-5" />,
    label: 'Dashboard',
    to: '/dashboard'
  }, {
    icon: <Workflow className="w-5 h-5" />,
    label: 'Workflows',
    to: '/workflows'
  }, {
    icon: <User className="w-5 h-5" />,
    label: 'Profile',
    to: '/profile'
  }];
  const isActiveRoute = (itemPath: string) => {
    if (itemPath === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    if (itemPath === '/workflows') {
      return location.pathname === '/workflows' || location.pathname.startsWith('/workflows');
    }
    if (itemPath === '/profile') {
      return location.pathname === '/profile';
    }
    return false;
  };
  return <div className="h-screen bg-background text-foreground flex relative overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border glow-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center glow-border-primary">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-foreground font-bold text-xl">casel</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-1 border border-border/50">
              <ThemeToggle />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-foreground hover:bg-muted glow-border">
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={cn("fixed left-0 top-0 h-full z-40 transition-all duration-300 bg-card border-r border-border glow-border-secondary", "lg:translate-x-0 lg:static lg:z-10", sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0", isMinimized ? "w-16" : "w-80")}>
        <div className="p-4 h-full flex flex-col">
          {/* Logo and Toggle */}
          <div className={cn("flex items-center mb-8", isMinimized ? "justify-center" : "justify-between")}>
            {!isMinimized ? <>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center glow-border-primary">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-foreground font-bold text-xl">casel</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="bg-card/80 backdrop-blur-sm rounded-lg p-1 border border-border/50 shadow-sm">
                    <ThemeToggle />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setIsMinimized(!isMinimized)} className="text-muted-foreground hover:text-foreground hover:bg-muted hidden lg:flex glow-border">
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                </div>
              </> : <div className="flex flex-col items-center space-y-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center glow-border-primary">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="bg-card/80 backdrop-blur-sm rounded-lg p-1 border border-border/50 shadow-sm">
                  <ThemeToggle />
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsMinimized(!isMinimized)} className="text-muted-foreground hover:text-foreground hover:bg-muted hidden lg:flex p-2 glow-border">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>}
          </div>

          {/* Navigation */}
          <nav className="flex-1">
            {navigationItems.map(item => <SidebarItem key={item.to} icon={item.icon} label={item.label} to={item.to} isActive={isActiveRoute(item.to)} onClick={() => setSidebarOpen(false)} isMinimized={isMinimized} />)}
          </nav>

          {/* Bottom Section */}
          <div className="mt-auto">
            <button onClick={handleSignOut} className={cn("flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted w-full glow-border", isMinimized && "justify-center px-2")}>
              <div className={cn("flex items-center justify-center flex-shrink-0", isMinimized ? "w-8 h-8" : "w-8 h-8")}>
                <LogOut className="w-5 h-5" />
              </div>
              {!isMinimized && <span className="font-medium">Sign Out</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <div className="flex-1 lg:ml-0 h-full relative z-10 overflow-hidden">
        <div className="pt-20 lg:pt-0 h-full overflow-y-auto">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/workflows" element={<Workflows />} />
            <Route path="/workflows/new" element={<WorkflowPlayground />} />
            <Route path="/workflows/:id/edit" element={<WorkflowPlayground />} />
            <Route path="/playground" element={<WorkflowPlayground />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </div>
      </div>
    </div>;
};
export default DashboardLayout;