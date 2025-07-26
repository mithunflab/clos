import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ThemeToggle from './ThemeToggle';
import N8nConfigToggle from './N8nConfigToggle';
import Navigation from './Navigation';
import Dashboard from '@/pages/Dashboard';
import Workflows from '@/pages/Workflows';
import WorkflowPlayground from '@/pages/WorkflowPlayground';
import Profile from '@/pages/Profile';
import CloudRunner from '@/pages/CloudRunner';
const DashboardLayout = () => {
  const navigate = useNavigate();
  const {
    user,
    signOut
  } = useAuth();
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };
  return <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen">
        <Navigation />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            
          </header>

          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/playground" element={<WorkflowPlayground />} />
              <Route path="/cloud-runner" element={<CloudRunner />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>;
};
export default DashboardLayout;