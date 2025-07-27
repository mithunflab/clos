
import React, { useState } from 'react';
import {
  LayoutDashboard,
  Zap,
  Play,
  Cloud,
  CloudCog,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ThemeToggle from './ThemeToggle';

interface NavigationLinkProps {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
}

const NavigationLink: React.FC<NavigationLinkProps & { isCollapsed: boolean }> = ({ to, icon: Icon, label, isCollapsed }) => {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          cn(
            "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary hover:text-secondary-foreground",
            isActive ? "bg-secondary text-secondary-foreground" : "text-foreground",
            isCollapsed && "justify-center"
          )
        }
        title={isCollapsed ? label : undefined}
      >
        <Icon className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
        {!isCollapsed && <span>{label}</span>}
      </NavLink>
    </li>
  );
};

const Navigation = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={cn(
      "flex flex-col border-r border-border bg-secondary transition-all duration-300",
      isCollapsed ? "w-16" : "w-60"
    )}>
      <div className="p-4 flex-grow">
        <div className="flex items-center justify-between mb-4">
          {!isCollapsed && <h2 className="font-semibold text-lg">Menu</h2>}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="space-y-1">
          <NavigationLink
            to="/dashboard"
            icon={LayoutDashboard}
            label="Dashboard"
            isCollapsed={isCollapsed}
          />
          <NavigationLink
            to="/workflows"
            icon={Zap}
            label="Workflows"
            isCollapsed={isCollapsed}
          />
          <NavigationLink
            to="/playground"
            icon={Play}
            label="Playground"
            isCollapsed={isCollapsed}
          />
          <NavigationLink
            to="/cloud-runner"
            icon={Cloud}
            label="Cloud Runner"
            isCollapsed={isCollapsed}
          />
          <NavigationLink
            to="/cloud-n8n"
            icon={CloudCog}
            label="Cloud N8N"
            isCollapsed={isCollapsed}
          />
          <NavigationLink
            to="/profile"
            icon={User}
            label="Profile"
            isCollapsed={isCollapsed}
          />
        </div>
      </div>

      <div className="p-4">
        <div className="pt-4 border-t border-border">
          <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
            {!isCollapsed && <span className="text-sm text-muted-foreground">Theme</span>}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navigation;
