
import React from 'react';
import { Cloud } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Navigation = () => {
  return (
    <div className="flex flex-col border-r border-border bg-secondary w-60">
      <div className="p-4">
        <div className="mb-4">
          <h2 className="mb-2 font-semibold text-lg">Navigation</h2>
        </div>

        <div className="space-y-1">
          <NavLink
            to="/cloud-runner"
            className={({ isActive }) =>
              cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary hover:text-secondary-foreground",
                isActive ? "bg-secondary text-secondary-foreground" : "text-foreground"
              )
            }
          >
            <Cloud className="mr-2 h-4 w-4" />
            <span>Cloud Runner</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default Navigation;
