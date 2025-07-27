
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Workflow, 
  Play, 
  Cloud, 
  Server,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMinimizeChangeMode } from '@/hooks/useMinimizeChangeMode';
import ThemeToggle from './ThemeToggle';

const Navigation = () => {
  const { minimizeChangeMode, toggleMinimizeChangeMode } = useMinimizeChangeMode();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/workflows', icon: Workflow, label: 'Workflows' },
    { to: '/playground', icon: Play, label: 'Playground' },
    { to: '/cloud-runner', icon: Cloud, label: 'Cloud Runner' },
    { to: '/cloud-n8n', icon: Server, label: 'Cloud N8N' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className={cn(
      "bg-card/50 backdrop-blur-sm border-r border-border h-full transition-all duration-300",
      minimizeChangeMode ? "w-16" : "w-64"
    )}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          <div className={cn(
            "flex items-center gap-2 transition-all duration-300",
            minimizeChangeMode && "opacity-0 w-0"
          )}>
            <Zap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Casel</span>
          </div>
          
          <button
            onClick={toggleMinimizeChangeMode}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {minimizeChangeMode ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
        
        <div className="space-y-2 mb-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )
              }
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!minimizeChangeMode && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>

        <div className={cn(
          "flex items-center gap-2 transition-all duration-300",
          minimizeChangeMode ? "justify-center" : "justify-start"
        )}>
          <ThemeToggle />
          {!minimizeChangeMode && (
            <span className="text-sm text-muted-foreground">Theme</span>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
