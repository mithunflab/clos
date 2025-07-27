
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Workflow, 
  Play, 
  Cloud, 
  Server,
  Settings,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Navigation = () => {
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/workflows', icon: Workflow, label: 'Workflows' },
    { to: '/playground', icon: Play, label: 'Playground' },
    { to: '/cloud-runner', icon: Cloud, label: 'Cloud Runner' },
    { to: '/cloud-n8n', icon: Server, label: 'Cloud N8N' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="w-64 bg-card/50 backdrop-blur-sm border-r border-border h-full">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-8">
          <Zap className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">Casel</span>
        </div>
        
        <div className="space-y-2">
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
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
