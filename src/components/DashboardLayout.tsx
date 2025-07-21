
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
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
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group relative w-full text-left",
        isActive 
          ? "bg-white/10 text-white border border-white/20" 
          : "text-white/70 hover:text-white hover:bg-white/5",
        isMinimized && "justify-center px-2"
      )}
    >
      <div className={cn(
        "p-2 rounded-lg transition-colors duration-200",
        isActive ? "bg-white/20" : "group-hover:bg-white/10"
      )}>
        {icon}
      </div>
      {!isMinimized && <span className="font-medium">{label}</span>}
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-white/5 rounded-xl border border-white/20"
          initial={false}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </button>
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
    
    // Use a small timeout to prevent conflicts with navigation
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

  // Check if current route matches navigation item
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
    <div className="min-h-screen bg-black text-white flex relative">
      {/* Aurora Background - Fixed */}
      <div className="fixed inset-0 z-0">
        <div className="aurora-bg absolute inset-0 opacity-40 will-change-transform"></div>
      </div>

      <style>{`
        @keyframes aurora {
          0% {
            background-position: 0% 0%;
            transform: translateX(-20px) translateY(0px);
          }
          25% {
            background-position: 25% 15%;
            transform: translateX(-10px) translateY(25px);
          }
          50% {
            background-position: 50% 30%;
            transform: translateX(0px) translateY(50px);
          }
          75% {
            background-position: 75% 45%;
            transform: translateX(10px) translateY(75px);
          }
          100% {
            background-position: 100% 60%;
            transform: translateX(20px) translateY(100px);
          }
        }
        
        .aurora-bg {
          background: repeating-linear-gradient(
            165deg,
            #0f172a 3%,
            #1e293b 6%,
            #334155 9%,
            #475569 12%,
            #000000 15%
          );
          background-size: 100% 160%;
          background-position: 0% 0%;
          animation: aurora 35s ease-in-out infinite;
          filter: blur(6px);
        }
      `}</style>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-black" />
            </div>
            <span className="text-white font-bold text-xl">casel</span>
          </div>
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

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-screen bg-black/40 backdrop-blur-md border-r border-white/10 z-40 transition-all duration-300",
        "lg:translate-x-0 lg:static lg:z-10",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isMinimized ? "w-20" : "w-80"
      )}>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white/60 hover:text-white hover:bg-white/10 hidden lg:flex"
            >
              {isMinimized ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </Button>
          </div>

          {isMinimized && (
            <div className="flex justify-center mb-8">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-black" />
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="space-y-2 flex-1">
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
          <div className="space-y-2 mt-auto">
            <button 
              onClick={handleSignOut}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-white/70 hover:text-white hover:bg-white/5 w-full",
                isMinimized && "justify-center px-2"
              )}
            >
              <div className="p-2 rounded-lg group-hover:bg-white/10">
                <LogOut className="w-5 h-5" />
              </div>
              {!isMinimized && <span className="font-medium">Sign Out</span>}
            </button>
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

      {/* Main Content */}
      <div className="flex-1 lg:ml-0 min-h-screen relative z-10">
        <div className="pt-16 lg:pt-0 min-h-screen">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
