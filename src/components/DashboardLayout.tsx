
import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Workflow, 
  User, 
  LogOut, 
  Menu, 
  X,
  Home,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import Dashboard from '@/pages/Dashboard';
import Workflows from '@/pages/Workflows';
import WorkflowPlayground from '@/pages/WorkflowPlayground';
import Profile from '@/pages/Profile';
import ThemeToggle from '@/components/ThemeToggle';
import { GlowingEffect } from '@/components/ui/glowing-effect';

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

const SidebarItem = ({ icon, label, to, isActive, onClick, isMinimized }: SidebarItemProps) => {
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    }
    navigate(to);
  };

  return (
    <div className="relative mb-2">
      {isActive && (
        <div className="absolute inset-0 rounded-xl">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={2}
          />
        </div>
      )}
      <button
        onClick={handleClick}
        className={cn(
          "relative flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group w-full text-left",
          isActive 
            ? "bg-white/10 text-white border border-white/20" 
            : "text-white/70 hover:text-white hover:bg-white/5",
          isMinimized && "justify-center px-3"
        )}
      >
        <div className={cn(
          "p-2 rounded-lg transition-colors duration-200 flex-shrink-0",
          isActive ? "bg-white/20" : "group-hover:bg-white/10"
        )}>
          {icon}
        </div>
        {!isMinimized && <span className="font-medium truncate">{label}</span>}
      </button>
    </div>
  );
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  // Auto-minimize sidebar when in playground - with proper cleanup
  useEffect(() => {
    const isPlayground = location.pathname.includes('/playground') || 
                        (location.pathname.includes('/workflows/') && 
                        (location.pathname.includes('/new') || location.pathname.includes('/edit')));
    
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

  const navigationItems = [
    { icon: <Home className="w-5 h-5" />, label: 'Dashboard', to: '/dashboard' },
    { icon: <Workflow className="w-5 h-5" />, label: 'Workflows', to: '/workflows' },
    { icon: <User className="w-5 h-5" />, label: 'Profile', to: '/profile' },
  ];

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

  return (
    <div className="h-screen canvas-background text-white flex relative overflow-hidden">
      {/* Mobile Header - Fixed */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50">
        <div className="relative rounded-[1.25rem] border-[0.75px] border-border p-2 m-2">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={2}
          />
          <div className="relative bg-black/80 backdrop-blur-md border border-white/10 rounded-xl">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-black" />
                </div>
                <span className="text-white font-bold text-xl">casel</span>
              </div>
              <div className="flex items-center space-x-2">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-white hover:bg-white/10"
                >
                  {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar - Fixed */}
      <div className={cn(
        "fixed left-0 top-0 h-full z-40 transition-all duration-300 m-2",
        "lg:translate-x-0 lg:static lg:z-10",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isMinimized ? "w-20" : "w-80"
      )}>
        <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={2}
          />
          <div className="relative h-full bg-black/60 backdrop-blur-md border border-white/10 rounded-xl">
            <div className="p-6 h-full flex flex-col">
              {/* Logo and Toggle */}
              <div className="flex items-center justify-between mb-8">
                {!isMinimized && (
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                      <Bot className="w-5 h-5 text-black" />
                    </div>
                    <span className="text-white font-bold text-xl">casel</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  {!isMinimized && <ThemeToggle />}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="text-white/60 hover:text-white hover:bg-white/10 hidden lg:flex"
                  >
                    {isMinimized ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                  </Button>
                </div>
              </div>

              {isMinimized && (
                <div className="flex flex-col items-center mb-8 space-y-4">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-black" />
                  </div>
                  <ThemeToggle />
                </div>
              )}

              {/* Navigation */}
              <nav className="flex-1">
                {navigationItems.map((item) => (
                  <SidebarItem
                    key={item.to}
                    icon={item.icon}
                    label={item.label}
                    to={item.to}
                    isActive={isActiveRoute(item.to)}
                    onClick={() => setSidebarOpen(false)}
                    isMinimized={isMinimized}
                  />
                ))}
              </nav>

              {/* Bottom Section */}
              <div className="mt-auto">
                <button 
                  onClick={handleSignOut}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-white/70 hover:text-white hover:bg-white/5 w-full",
                    isMinimized && "justify-center px-3"
                  )}
                >
                  <div className="p-2 rounded-lg group-hover:bg-white/10 flex-shrink-0">
                    <LogOut className="w-5 h-5" />
                  </div>
                  {!isMinimized && <span className="font-medium">Sign Out</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content - Scrollable */}
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
    </div>
  );
};

export default DashboardLayout;
