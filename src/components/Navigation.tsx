import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Workflow, 
  Settings, 
  User, 
  Cloud, 
  PlayCircle,
  Zap
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Navigation = () => {
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/workflows', icon: Workflow, label: 'Workflows' },
    { path: '/playground', icon: PlayCircle, label: 'Playground' },
    { path: '/cloud-n8n', icon: Cloud, label: 'Cloud N8N' },
    { path: '/cloud-runner', icon: Zap, label: 'Cloud Runner' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  if (!user) {
    return null;
  }

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo/Brand */}
      <div className="flex items-center space-x-2 p-6 border-b border-border">
        <Workflow className="h-8 w-8 text-primary" />
        <span className="text-xl font-bold">WorkflowCraft</span>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-6">
        <div className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  );
};

export default Navigation;
