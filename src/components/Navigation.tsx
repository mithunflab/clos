import React from 'react';
import {
  LayoutDashboard,
  Zap,
  Play,
  Cloud,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavigationLinkProps {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
}

const NavigationLink: React.FC<NavigationLinkProps> = ({ to, icon: Icon, label }) => {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          cn(
            "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary hover:text-secondary-foreground",
            isActive ? "bg-secondary text-secondary-foreground" : "text-foreground"
          )
        }
      >
        <Icon className="mr-2 h-4 w-4" />
        <span>{label}</span>
      </NavLink>
    </li>
  );
};

const Navigation = () => {
  return (
    <div className="flex flex-col border-r border-border bg-secondary w-60">
      <div className="p-4 flex-grow">
        <div className="mb-4">
          <h2 className="mb-2 font-semibold text-lg">Menu</h2>
        </div>

        <div className="space-y-1">
          <NavigationLink
            to="/dashboard"
            icon={LayoutDashboard}
            label="Dashboard"
          />
          <NavigationLink
            to="/workflows"
            icon={Zap}
            label="Workflows"
          />
          <NavigationLink
            to="/playground"
            icon={Play}
            label="Playground"
          />
          <NavigationLink
            to="/cloud-runner"
            icon={Cloud}
            label="Cloud Runner"
          />
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <h2 className="mb-2 font-semibold text-sm">Settings</h2>
        </div>
        <div className="space-y-1">
          <NavigationLink
            to="/settings"
            icon={Settings}
            label="Preferences"
          />
          <NavigationLink
            to="/help"
            icon={HelpCircle}
            label="Help & Support"
          />
        </div>
      </div>
    </div>
  );
};

export default Navigation;
